import type { Group } from 'three';

export type Collider = ({ minY?: number; maxY?: number } & (
  | { type: 'box'; minX: number; maxX: number; minZ: number; maxZ: number }
  | { type: 'circle'; x: number; z: number; radius: number }
  | { type: 'obb'; x: number; z: number; halfX: number; halfZ: number; rotation: number }
));

/** 显式可站立区域。坡道 height 为 start 处高度，rise 可正可负。 */
export interface WalkSurface {
  id: string; minX: number; maxX: number; minZ: number; maxZ: number; height: number;
  ramp?: { axis: 'x' | 'z'; start: number; end: number; rise: number };
}

export interface MotionWorld {
  colliders: Collider[]; surfaces: WalkSurface[];
  groundHeight: (x: number, z: number) => number;
}

/** 可独立替换的场景模块；后续 GLB 也返回同一接口。 */
export interface WorldPart { group: Group; colliders: Collider[] }
