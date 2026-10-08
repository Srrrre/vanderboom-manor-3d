import {
  BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Raycaster, Vector2,
} from 'three';
import type { Camera, Object3D } from 'three';
import type { Collider } from '../world/types.ts';
import { batchStatic } from '../world/architecture.ts';

/** x/z 是铰链位置，y 是门脚底；局部 +X 沿门宽，rotation 使用 Three.js 的 Y 轴角度。 */
export interface DoorSpec {
  id: string; label: string; x: number; z: number; y: number;
  width: number; height: number; rotation: number; openAngle: number;
  locked?: boolean; color?: number;
}

type PlayerPosition = { x: number; y: number; z: number };
type DoorCollider = Extract<Collider, { type: 'obb' }>;

export interface DoorSystem {
  group: Group;
  colliders: Collider[];
  update(dt: number, player: PlayerPosition): boolean;
  getPrompt(camera: Camera, occluders: Object3D[]): string | null;
  interact(camera: Camera, occluders: Object3D[], player: PlayerPosition): string | null;
}

interface DoorState {
  spec: DoorSpec;
  leaf: Group;
  collider: DoorCollider;
  angle: number;
  wantsOpen: boolean;
  moving: boolean;
  blocked: boolean;
}

const LEAF_THICKNESS = 0.09;
const PLAYER_RADIUS = 0.28;
const PLAYER_HEIGHT = 1.78;
const SAFETY_MARGIN = 0.018;
const OPEN_SPEED = 1.6;
const REACH = 2.5;
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));

function createLeaf(spec: DoorSpec): Group {
  const leaf = new Group();
  leaf.name = `door-leaf-${spec.id}`;
  leaf.position.set(spec.x, spec.y, spec.z);
  leaf.rotation.y = spec.rotation;
  leaf.userData.doorId = spec.id;
  const paint = new MeshStandardMaterial({ color: spec.color ?? 0x756458, roughness: 0.83 });
  const recess = paint.clone();
  recess.color.multiplyScalar(0.72);
  const brass = new MeshStandardMaterial({ color: 0xa48b56, metalness: 0.67, roughness: 0.44 });
  const darkMetal = new MeshStandardMaterial({ color: 0x383329, metalness: 0.55, roughness: 0.53 });

  const box = (width: number, height: number, depth: number, x: number, y: number, z: number,
    material: MeshStandardMaterial = paint) => {
    const mesh = new Mesh(new BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    leaf.add(mesh);
    return mesh;
  };

  box(spec.width, spec.height, LEAF_THICKNESS, spec.width / 2, spec.height / 2, 0);
  // 两面都有凹面板、门牌和把手；门框由建筑外壳提供，门叶单独绕铰链转动。
  for (const side of [-1, 1]) {
    for (const [centerY, height] of [[spec.height * 0.28, spec.height * 0.3], [spec.height * 0.7, spec.height * 0.4]]) {
      const panelWidth = Math.max(0.2, spec.width - 0.24);
      box(panelWidth, height, 0.014, spec.width / 2, centerY, side * 0.049, recess);
      for (const edgeX of [0.12, spec.width - 0.12]) {
        box(0.035, height + 0.04, 0.022, edgeX, centerY, side * 0.051);
      }
      for (const edgeY of [centerY - height / 2, centerY + height / 2]) {
        box(panelWidth + 0.035, 0.035, 0.022, spec.width / 2, edgeY, side * 0.051);
      }
    }
    const handleX = spec.width - 0.16;
    const handleY = Math.min(1.08, spec.height * 0.43);
    box(0.055, 0.19, 0.018, handleX, handleY, side * 0.06, darkMetal);
    const stem = new Mesh(new CylinderGeometry(0.018, 0.018, 0.095, 10), brass);
    stem.rotation.x = Math.PI / 2;
    stem.position.set(handleX, handleY, side * 0.096);
    stem.castShadow = true;
    leaf.add(stem);
    box(0.13, 0.026, 0.03, handleX - 0.045, handleY, side * 0.135, brass);
    box(Math.min(0.3, spec.width * 0.3), 0.105, 0.015, spec.width / 2, spec.height * 0.82, side * 0.07, brass);
    // 刻线让小门牌保留材质细节，不依赖画布字体或远程纹理。
    box(Math.min(0.2, spec.width * 0.2), 0.012, 0.002, spec.width / 2, spec.height * 0.82, side * 0.079, darkMetal);
  }
  for (const y of [spec.height * 0.19, spec.height * 0.81]) {
    const hinge = new Mesh(new CylinderGeometry(0.028, 0.028, 0.13, 10), brass);
    hinge.position.set(0, y, 0);
    hinge.castShadow = true;
    leaf.add(hinge);
  }
  // 只合并门叶内部相对静止的零件；铰链根节点保留，整扇门仍可独立旋转。
  batchStatic(leaf);
  return leaf;
}

/** 圆心到门叶矩形的平面净距；局部变换与 Three.js Y 旋转完全一致。 */
function clearanceAt(door: DoorState, angle: number, player: PlayerPosition): number {
  const rotation = door.spec.rotation + angle;
  const dx = player.x - door.spec.x;
  const dz = player.z - door.spec.z;
  const x = dx * Math.cos(rotation) - dz * Math.sin(rotation);
  const z = dx * Math.sin(rotation) + dz * Math.cos(rotation);
  return Math.hypot(x - clamp(x, 0, door.spec.width), Math.max(0, Math.abs(z) - door.collider.halfZ));
}

function sweepIsClear(door: DoorState, next: number, player: PlayerPosition): boolean {
  if (player.y >= door.spec.y + door.spec.height || player.y + PLAYER_HEIGHT <= door.spec.y) return true;
  const before = clearanceAt(door, door.angle, player);
  const middle = clearanceAt(door, (door.angle + next) / 2, player);
  const after = clearanceAt(door, next, player);
  const radius = PLAYER_RADIUS + SAFETY_MARGIN;
  // 中点矩形按旋转包络膨胀，覆盖本小步每个瞬间，防止薄门跨帧穿过玩家。
  const cornerRadius = Math.hypot(door.spec.width, door.collider.halfZ);
  const envelope = 2 * cornerRadius * Math.sin(Math.abs(next - door.angle) / 4);
  if (middle >= radius + envelope) return true;
  // 玩家可以走到预留余量内；只允许净距持续增大的反向退让，不能因此把玩家锁住。
  return before >= PLAYER_RADIUS && before < radius + envelope &&
    middle > before + 1e-8 && after > middle + 1e-8;
}

function syncDoor(door: DoorState) {
  const rotation = door.spec.rotation + door.angle;
  door.leaf.rotation.y = rotation;
  door.collider.rotation = rotation;
  door.collider.x = door.spec.x + Math.cos(rotation) * door.spec.width / 2;
  door.collider.z = door.spec.z - Math.sin(rotation) * door.spec.width / 2;
}

/** 可用 [E] 操作的实体门；输入监听留给主程序，所有动态碰撞对象原地更新。 */
export function createDoors(specs: readonly DoorSpec[]): DoorSystem {
  const group = new Group();
  group.name = 'manor-doors';
  const doors: DoorState[] = specs.map((spec) => {
    const leaf = createLeaf(spec);
    const collider: DoorCollider = {
      type: 'obb', x: 0, z: 0, halfX: spec.width / 2,
      halfZ: LEAF_THICKNESS / 2 + 0.018, rotation: spec.rotation,
      minY: spec.y, maxY: spec.y + spec.height,
    };
    const door = { spec, leaf, collider, angle: 0, wantsOpen: false, moving: false, blocked: false };
    syncDoor(door);
    group.add(leaf);
    return door;
  });
  const stateByLeaf = new Map(doors.map((door) => [door.leaf, door]));
  const ray = new Raycaster();
  ray.far = REACH;
  const screenCenter = new Vector2();

  const select = (camera: Camera, occluders: Object3D[]): DoorState | null => {
    camera.updateWorldMatrix(true, false);
    group.updateMatrixWorld(true);
    ray.setFromCamera(screenCenter, camera);
    const doorHits = ray.intersectObject(group, true);
    // 大部分游览帧没有瞄准近处的门，先排除它们，避免每帧遍历整座庄园的射线几何。
    if (doorHits.length === 0) return null;
    for (const object of occluders) object.updateWorldMatrix(true, true);
    // 同一次射线检查门和场景物体，首个实体交点决定目标，因此不会隔墙选门。
    const hits = [...ray.intersectObjects(occluders, true), ...doorHits].sort((a, b) => a.distance - b.distance);
    for (const hit of hits) {
      let visible = true;
      for (let object: Object3D | null = hit.object; object; object = object.parent) {
        if (!object.visible) visible = false;
      }
      if (!visible) continue;
      for (let object: Object3D | null = hit.object; object; object = object.parent) {
        const door = stateByLeaf.get(object as Group);
        if (door) return door;
      }
      return null;
    }
    return null;
  };

  const system: DoorSystem = {
    group,
    colliders: doors.map((door) => door.collider),
    update(dt, player) {
      const elapsed = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.1);
      let moved = false;
      for (const door of doors) {
        if (!door.moving || elapsed <= 0) continue;
        const target = door.wantsOpen ? door.spec.openAngle : 0;
        const remaining = target - door.angle;
        const travel = Math.sign(remaining) * Math.min(Math.abs(remaining), OPEN_SPEED * elapsed);
        // 每小步门外缘至多移动 6mm，旋转包络进一步保证连续碰撞检测。
        const steps = Math.max(1, Math.ceil(Math.abs(travel) * door.spec.width / 0.006));
        const start = door.angle;
        for (let step = 1; step <= steps; step++) {
          const next = start + travel * step / steps;
          if (!sweepIsClear(door, next, player)) {
            door.moving = false;
            door.blocked = true;
            break;
          }
          door.angle = next;
          syncDoor(door);
          moved = true;
        }
        if (Math.abs(door.angle - target) < 1e-7) {
          door.angle = target;
          door.moving = false;
          syncDoor(door);
        }
      }
      if (moved) group.updateMatrixWorld(true);
      return moved;
    },
    getPrompt(camera, occluders) {
      const door = select(camera, occluders);
      if (!door) return null;
      if (door.spec.locked) return `未开放 · ${door.spec.label}`;
      if (door.blocked) return `[E] 反向 · ${door.spec.label}（门被挡住，请后退）`;
      return `[E] ${door.wantsOpen ? '关闭' : '打开'} · ${door.spec.label}`;
    },
    interact(camera, occluders, player) {
      const door = select(camera, occluders);
      if (!door) return null;
      if (door.spec.locked) return `${door.spec.label}尚未开放。`;
      door.wantsOpen = !door.wantsOpen;
      door.blocked = false;
      const target = door.wantsOpen ? door.spec.openAngle : 0;
      door.moving = Math.abs(target - door.angle) > 1e-7;
      if (door.moving) {
        const firstStep = door.angle + Math.sign(target - door.angle) * Math.min(0.003, Math.abs(target - door.angle));
        if (!sweepIsClear(door, firstStep, player)) {
          door.moving = false;
          door.blocked = true;
          return `${door.spec.label}被挡住了，请后退；按 E 可反向。`;
        }
      }
      return `${door.wantsOpen ? '打开' : '关闭'}${door.spec.label}。`;
    },
  };
  group.updateMatrixWorld(true);
  return system;
}
