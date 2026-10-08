import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MANOR } from '../config.ts';
import { createMaterials } from '../render/materials.ts';
import type { Collider, WorldPart } from './types.ts';

/** 带檐口的闭合分层坡顶；每层为矩形，支持四坡与折线帽顶。 */
function roofGeometry(levels: { y: number; w: number; d: number }[]) {
  const vertices: number[] = [], indices: number[] = [];
  for (const { y, w, d } of levels) vertices.push(-w / 2, y, -d / 2, w / 2, y, -d / 2, w / 2, y, d / 2, -w / 2, y, d / 2);
  for (let k = 0; k < levels.length - 1; k++) for (let i = 0; i < 4; i++) {
    const a = k * 4 + i, b = k * 4 + (i + 1) % 4, c = a + 4, d = b + 4;
    indices.push(a, d, b, a, c, d);
  }
  const t = (levels.length - 1) * 4;
  indices.push(t, t + 2, t + 1, t, t + 3, t + 2, 0, 1, 2, 0, 2, 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices); g.computeVertexNormals();
  return g.toNonIndexed();
}

/** 同材质静态构件合批，保留部件根节点，降低大量窗格和挂板的绘制开销。 */
function batch(group: THREE.Group) {
  group.updateMatrixWorld(true);
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  group.traverse(o => {
    if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
    const geometry = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone());
    // 当前材质无贴图，移除各基础几何体不一致的 UV 属性再合并。
    geometry.deleteAttribute('uv');
    geometry.applyMatrix4(o.matrixWorld);
    const list = buckets.get(o.material) ?? []; list.push(geometry); buckets.set(o.material, list);
  });
  group.clear();
  for (const [material, geometries] of buckets) {
    const merged = mergeGeometries(geometries);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
    geometries.forEach(g => g.dispose());
  }
}

export function createManor(): WorldPart {
  const group = new THREE.Group(); group.name = 'vanderboom-manor';
  const colliders: Collider[] = [], m = createMaterials();
  function box(parent: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d).toNonIndexed(), material);
    mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  }
  function volume(name: string, p: { x: number; z: number; width: number; depth: number; height: number }, material: THREE.Material) {
    const part = new THREE.Group(); part.name = name; group.add(part);
    box(part, p.width, p.height, p.depth, p.x, p.height / 2, p.z, material);
    colliders.push({ type: 'box', minX: p.x - p.width / 2, maxX: p.x + p.width / 2, minZ: p.z - p.depth / 2, maxZ: p.z + p.depth / 2 });
    // 墙面水平挂板接缝为浅实体线，不需要原作纹理。
    for (let y = 0.65; y < p.height - 0.15; y += 0.3) {
      box(part, p.width, 0.018, 0.022, p.x, y, p.z + p.depth / 2 + 0.007, m.seam);
      box(part, p.width, 0.018, 0.022, p.x, y, p.z - p.depth / 2 - 0.007, m.seam);
      box(part, 0.022, 0.018, p.depth, p.x - p.width / 2 - 0.007, y, p.z, m.seam);
      box(part, 0.022, 0.018, p.depth, p.x + p.width / 2 + 0.007, y, p.z, m.seam);
    }
    box(part, p.width + 0.1, 0.26, p.depth + 0.1, p.x, 0.2, p.z, m.stone);
    box(part, p.width + 0.14, 0.16, p.depth + 0.14, p.x, p.height - 0.07, p.z, m.trim);
    return part;
  }
  function roof(parent: THREE.Group, x: number, y: number, z: number, levels: { y: number; w: number; d: number }[], material: THREE.Material) {
    const g = roofGeometry(levels); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, material); mesh.position.set(x, y, z); parent.add(mesh);
  }
  function windowAt(parent: THREE.Group, x: number, y: number, z: number, w: number, h: number, cols = 2, rows = 3, angle = 0) {
    const win = new THREE.Group(); win.position.set(x, y, z); win.rotation.y = angle; parent.add(win);
    box(win, w + 0.2, h + 0.2, 0.16, 0, 0, 0, m.trim);
    box(win, w, h, 0.08, 0, 0, 0.105, m.glass);
    for (let j = 1; j < cols; j++) box(win, 0.045, h, 0.07, -w / 2 + j * w / cols, 0, 0.17, m.trim);
    for (let j = 1; j < rows; j++) box(win, w, j === 2 && rows === 5 ? 0.075 : 0.045, 0.07, 0, h / 2 - j * h / rows, 0.17, m.trim);
    box(win, w + 0.32, 0.09, 0.3, 0, -h / 2 - 0.1, 0.08, m.trim);
    // 可接近的底层窗台/窗格也占据空间；上层窗不应在地面形成空气墙。
    if (y < 4) {
      const points = [-w / 2 - 0.16, w / 2 + 0.16].flatMap(u => [-0.09, 0.25].map(v => ({
        x: x + u * Math.cos(angle) + v * Math.sin(angle),
        z: z - u * Math.sin(angle) + v * Math.cos(angle),
      })));
      colliders.push({ type: 'box', minX: Math.min(...points.map(v => v.x)), maxX: Math.max(...points.map(v => v.x)), minZ: Math.min(...points.map(v => v.z)), maxZ: Math.max(...points.map(v => v.z)) });
    }
  }
  const a = MANOR.main, t = MANOR.tower, n = MANOR.annex, p = MANOR.porch;
  const main = volume('main-house', a, m.wall);
  roof(main, a.x, a.height, a.z, [{ y: 0, w: a.width + 0.6, d: a.depth + 0.65 }, { y: a.roofRise, w: a.width - 1, d: 0.16 }], m.roof);
  box(main, a.width - 0.9, 0.11, 0.22, a.x, a.height + a.roofRise, a.z, m.roofEdge);
  windowAt(main, -1.25, 9.65, 2.54, 0.88, 1.3, 2, 2);
  // 阁楼窗有真实侧壁与小顶，避免悬浮在坡面上的平面窗。
  box(main, 1.16, 1.54, 1.8, -1.25, 9.62, 1.67, m.roof);
  windowAt(main, -1.25, 9.65, 2.61, 0.88, 1.3, 2, 2);
  roof(main, -1.25, 10.43, 1.75, [{ y: 0, w: 1.3, d: 2.05 }, { y: 0.24, w: 0.12, d: 1.8 }], m.roofEdge);
  const tower = volume('square-tower', t, m.wall);
  roof(tower, t.x, t.height, t.z, [
    { y: 0, w: 4.15, d: 5.05 }, { y: 0.36, w: 3.65, d: 4.55 },
    { y: 3.25, w: 2.4, d: 3.3 }, { y: 3.6, w: 2.32, d: 3.2 },
  ], m.roof);
  box(tower, 4.25, 0.15, 5.15, t.x, t.height - 0.02, t.z, m.trim);
  box(tower, 2.5, 0.16, 3.35, t.x, 15.19, t.z, m.roofEdge);
  box(tower, 1.25, 1.8, 1.05, t.x, 13.45, 3.67, m.roof);
  windowAt(tower, t.x, 13.5, 4.23, 0.91, 1.6, 2, 2);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.065, 5, 16, Math.PI).toNonIndexed(), m.trim);
  arch.position.set(t.x, 14.31, 4.27); tower.add(arch);
  const annex = volume('right-annex', n, m.wood);
  roof(annex, n.x, n.height, n.z, [{ y: 0, w: n.width + 0.6, d: n.depth + 0.6 }, { y: n.roofRise, w: n.width + 0.15, d: 0.05 }], m.annexRoof);
  for (const x of [6.7, 9.2]) windowAt(annex, x, 1.95, 4.045, 0.88, 1.43, 2, 3);
  const porch = new THREE.Group(); porch.name = 'four-column-porch'; group.add(porch);
  box(porch, p.width, p.floor, p.depth, p.x, p.floor / 2, p.z, m.stone);
  box(porch, p.width, 0.07, p.depth, p.x, p.floor - 0.035, p.z, m.trim);
  for (let i = 0; i < 3; i++) box(porch, 4, (3 - i) * 0.15, 0.4, 0, (3 - i) * 0.075, 6.7 + i * 0.4, m.stone);
  for (const x of p.columns) {
    box(porch, 0.5, 0.18, 0.5, x, 0.57, 6.08, m.trim);
    box(porch, 0.37, 0.15, 0.37, x, 0.72, 6.08, m.trim);
    box(porch, 0.25, 2.55, 0.25, x, 2.03, 6.08, m.trim);
    for (const offset of [-0.075, 0.075]) box(porch, 0.021, 2.4, 0.02, x + offset, 2.03, 6.22, m.seam);
    box(porch, 0.45, 0.4, 0.39, x, 3.42, 6.08, m.trim);
    const disc = new THREE.Mesh(new THREE.TorusGeometry(0.116, 0.018, 4, 12).toNonIndexed(), m.seam);
    disc.position.set(x, 3.42, 6.29); porch.add(disc);
    colliders.push({ type: 'box', minX: x - 0.25, maxX: x + 0.25, minZ: 5.83, maxZ: 6.33 });
  }
  box(porch, p.width + 0.15, 0.21, 0.4, p.x, 3.62, 6.08, m.trim);
  // 单向浅坡雨棚：后缘高、前缘低，几何具有厚度。
  const canopy = box(porch, p.width + 0.3, 0.15, 3.08, p.x, 3.97, 5.17, m.roof);
  canopy.rotation.x = 0.19;
  box(porch, p.width + 0.4, 0.12, 0.15, p.x, 3.68, 6.7, m.roofEdge);
  for (const x of MANOR.windows.groundX) windowAt(porch, x, 2.13, 4.075, 1.2, 1.83, 3, 5);
  for (const x of MANOR.windows.upperX) windowAt(x > 2 ? tower : main, x, 6.6, 4.075, 0.95, 2.05, 2, 4);
  const door = MANOR.door;
  box(porch, door.width + 0.3, door.height + 0.25, 0.16, door.x, 0.45 + door.height / 2, 4.13, m.trim);
  box(porch, door.width, door.height, 0.12, door.x, 0.45 + door.height / 2, 4.24, m.door);
  box(porch, 1.02, 0.48, 0.04, door.x, 2.72, 4.32, m.glass);
  box(porch, 0.85, 1.06, 0.045, door.x, 1.89, 4.33, m.roofEdge);
  box(porch, 0.75, 0.96, 0.05, door.x, 1.89, 4.36, m.door);
  for (const x of [-0.28, 0.23]) {
    box(porch, 0.38, 0.6, 0.04, x, 0.95, 4.33, m.roofEdge);
    box(porch, 0.3, 0.51, 0.05, x, 0.95, 4.36, m.door);
  }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6).toNonIndexed(), m.metal);
  knob.position.set(0.4, 1.52, 4.43); porch.add(knob);
  colliders.push({ type: 'box', minX: door.x - (door.width + 0.3) / 2, maxX: door.x + (door.width + 0.3) / 2, minZ: 3.9, maxZ: 4.5 });
  // 未见侧/背面按相同窗套补全。三维进深不从单张正面图冒充测绘。
  for (const y of [2.15, 6.6]) for (const z of [-1.8, 1.4]) windowAt(main, -5.44, y, z, 1.02, 1.85, 2, 3, -Math.PI / 2);
  for (const y of [2.15, 6.6]) for (const x of [-3.6, -0.8]) windowAt(main, x, y, -3.85, 1.02, 1.85, 2, 3, Math.PI);
  for (const z of [-1.3, 1.9]) windowAt(annex, 10.65, 1.95, z, 0.88, 1.43, 2, 3, Math.PI / 2);
  for (const y of [6.6, 9.6]) windowAt(tower, 5.45, y, 1.8, 0.85, 1.65, 2, 3, Math.PI / 2);
  for (const part of [main, tower, annex, porch]) batch(part);
  return { group, colliders };
}
