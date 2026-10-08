import type { Group } from 'three';

export type Collider =
  | { type: 'box'; minX: number; maxX: number; minZ: number; maxZ: number }
  | { type: 'circle'; x: number; z: number; radius: number };

/** 可独立替换的场景模块；后续 GLB 也返回同一接口。 */
export interface WorldPart { group: Group; colliders: Collider[] }
