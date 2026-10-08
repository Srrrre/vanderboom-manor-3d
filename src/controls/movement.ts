import type { Collider } from '../world/types.ts';
import { PLAYER, WORLD } from '../config.ts';

type Point = { x: number; z: number };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function movementDelta(
  input: { forward: number; right: number; sprint: boolean },
  yaw: number,
  dt: number,
): Point {
  const length = Math.max(1, Math.hypot(input.forward, input.right));
  const distance = (input.sprint ? PLAYER.runSpeed : PLAYER.walkSpeed) * clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
  const forward = input.forward / length;
  const right = input.right / length;
  return {
    x: (right * Math.cos(yaw) - forward * Math.sin(yaw)) * distance,
    z: (-forward * Math.cos(yaw) - right * Math.sin(yaw)) * distance,
  };
}

/** 角色圆形投影与任意碰撞体的重叠检测；门动画也可复用此判断。 */
export function overlapsCollider(position: Point, collider: Collider, radius: number): boolean {
  if (collider.type === 'circle') {
    const x = position.x - collider.x;
    const z = position.z - collider.z;
    return x * x + z * z < (radius + collider.radius) ** 2 - 1e-12;
  }
  if (collider.type === 'obb') {
    // Three.js 绕 Y 轴正向旋转时，局部 +X 指向世界 -Z；这里使用逆旋转。
    const dx = position.x - collider.x;
    const dz = position.z - collider.z;
    const cosine = Math.cos(collider.rotation);
    const sine = Math.sin(collider.rotation);
    const localX = cosine * dx - sine * dz;
    const localZ = sine * dx + cosine * dz;
    const nearestX = clamp(localX, -collider.halfX, collider.halfX);
    const nearestZ = clamp(localZ, -collider.halfZ, collider.halfZ);
    return (localX - nearestX) ** 2 + (localZ - nearestZ) ** 2 < radius ** 2 - 1e-12;
  }
  const nearestX = clamp(position.x, collider.minX, collider.maxX);
  const nearestZ = clamp(position.z, collider.minZ, collider.maxZ);
  return (position.x - nearestX) ** 2 + (position.z - nearestZ) ** 2 < radius ** 2 - 1e-12;
}

/** 圆形角色与场景障碍碰撞；逐轴处理，让角色能够沿墙面滑动。 */
export function moveWithCollisions(
  position: Point,
  delta: Point,
  colliders: Collider[],
  radius: number = PLAYER.radius,
): Point {
  const limit = WORLD.boundary - radius;
  const result = { x: clamp(position.x, -limit, limit), z: clamp(position.z, -limit, limit) };
  // 将大位移拆成短步，避免高速移动时穿过细柱。
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.z) / Math.max(radius * 0.5, 0.01)));
  const step = { x: delta.x / steps, z: delta.z / steps };

  const moveAxis = (axis: 'x' | 'z') => {
    if (step[axis] === 0) return;
    const start = result[axis];
    const end = clamp(start + step[axis], -limit, limit);
    const candidate = { ...result, [axis]: end };
    if (!colliders.some((collider) => overlapsCollider(candidate, collider, radius))) {
      result[axis] = end;
      return;
    }
    // 二分逼近接触点，避免整步退回后在角色与障碍间留下明显空隙。
    let low = 0;
    let high = 1;
    for (let iteration = 0; iteration < 12; iteration++) {
      const fraction = (low + high) / 2;
      candidate[axis] = start + (end - start) * fraction;
      if (colliders.some((collider) => overlapsCollider(candidate, collider, radius))) high = fraction;
      else low = fraction;
    }
    result[axis] = start + (end - start) * low;
  };

  for (let index = 0; index < steps; index++) {
    moveAxis('x');
    moveAxis('z');
  }
  return result;
}
