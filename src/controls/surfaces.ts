import { PLAYER, WORLD } from '../config.ts';
import type { MotionWorld, WalkSurface } from '../world/types.ts';
import { overlapsCollider } from './movement.ts';

type Position = { x: number; y: number; z: number };
const playerHeight = 1.78;
const epsilon = 1e-6;
const maxDrop = 0.28;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** 返回矩形覆盖位置的实际高度；坡道的 height 对应 start 端。 */
export function surfaceHeight(surface: WalkSurface, x: number, z: number): number | null {
  if (x < surface.minX - epsilon || x > surface.maxX + epsilon ||
      z < surface.minZ - epsilon || z > surface.maxZ + epsilon) return null;
  if (!surface.ramp) return surface.height;
  const { axis, start, end, rise } = surface.ramp;
  const distance = end - start;
  const fraction = Math.abs(distance) < epsilon ? 0 : clamp(((axis === 'x' ? x : z) - start) / distance, 0, 1);
  return surface.height + fraction * rise;
}

/** 只选择脚边能够踏上的支撑，防止头顶二楼地板把一楼玩家吸上去。 */
export function resolveSurfaceHeight(
  world: MotionWorld, x: number, z: number, currentFeet: number, maxStep = 0.24,
): number | null {
  let result: number | null = null;
  const consider = (height: number | null) => {
    if (height === null || !Number.isFinite(height)) return;
    if (height > currentFeet + maxStep + epsilon || height < currentFeet - maxDrop - epsilon) return;
    if (result === null || height > result) result = height;
  };
  consider(world.groundHeight(x, z));
  for (const surface of world.surfaces) consider(surfaceHeight(surface, x, z));
  return result;
}

/** 带高度支撑的小步逐轴移动；遇到墙、低顶或楼板开口时停在安全边缘。 */
export function moveOnSurfaces(
  position: Position, delta: { x: number; z: number }, world: MotionWorld, radius = PLAYER.radius,
): Position {
  const limit = WORLD.boundary - radius;
  const result = { x: clamp(position.x, -limit, limit), y: position.y, z: clamp(position.z, -limit, limit) };
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.z) / Math.max(0.01, Math.min(radius * 0.5, 0.12))));
  const step = { x: delta.x / steps, z: delta.z / steps };

  const supportedHeight = (x: number, z: number): number | null => {
    const feet = resolveSurfaceHeight(world, x, z, result.y);
    if (feet === null) return null;
    const blocked = world.colliders.some((collider) => {
      // 原有室外碰撞体没有高度信息，继续作为无限高障碍。
      const bottom = collider.minY ?? -Infinity;
      const top = collider.maxY ?? Infinity;
      // 接地楼板顶面不阻挡；脚底以上到头顶的完整区间必须有净空。
      if (top <= feet + epsilon || bottom >= feet + playerHeight - epsilon) return false;
      return overlapsCollider({ x, z }, collider, radius);
    });
    return blocked ? null : feet;
  };

  const moveAxis = (axis: 'x' | 'z') => {
    if (step[axis] === 0) return;
    const start = result[axis];
    const end = clamp(start + step[axis], -limit, limit);
    const candidate = { x: result.x, z: result.z, [axis]: end };
    const height = supportedHeight(candidate.x, candidate.z);
    if (height !== null) {
      result[axis] = end;
      result.y = height;
      return;
    }
    // 将最后一小步收敛至接触点，保留沿墙滑动并防止穿过薄门。
    let low = 0;
    let high = 1;
    let safeHeight = result.y;
    for (let iteration = 0; iteration < 12; iteration++) {
      const fraction = (low + high) / 2;
      candidate[axis] = start + (end - start) * fraction;
      const partialHeight = supportedHeight(candidate.x, candidate.z);
      if (partialHeight === null) high = fraction;
      else { low = fraction; safeHeight = partialHeight; }
    }
    result[axis] = start + (end - start) * low;
    result.y = safeHeight;
  };

  for (let index = 0; index < steps; index++) {
    moveAxis('x');
    moveAxis('z');
  }
  return result;
}
