import type { WalkSurface } from './types.ts';
import type { DoorSpec } from '../interactions/doors.ts';

/** 本阶段所有房间/通道使用现有外壳范围；坐标与推测见室内参考分析。 */
export const INTERIOR = {
  ground: 0.45, upper: 4.15, ceiling: 8.04, slab: 0.18, wall: 0.16,
  foyer: { minX: -1.5, maxX: 2.1, minZ: 0.55, maxZ: 3.76 },
  kitchen: { minX: -5.16, maxX: -1.5, minZ: 0.55, maxZ: 3.76 },
  living: { minX: -5.16, maxX: 1.86, minZ: -3.56, maxZ: 0.55 },
  dining: { minX: 5.52, maxX: 10.36, minZ: -2.56, maxZ: 3.76 },
  bedroom: { minX: -3.62, maxX: 1.86, minZ: -0.45, maxZ: 3.76 },
  gallery: { minX: -5.16, maxX: -3.8, minZ: -3.56, maxZ: 3.76 },
  stair: { minX: -3.8, maxX: 1.55, minZ: -3.5, maxZ: -2.15, steps: 20 },
} as const;

export const DOORS: readonly DoorSpec[] = [
  { id: 'front', label: '庄园正门', x: -0.66, z: 3.99, y: 0.45, width: 1.22, height: 2.65, rotation: 0, openAngle: Math.PI / 2, color: 0x4e6268 },
  { id: 'living', label: '主客厅', x: -0.8, z: 0.55, y: 0.45, width: 1.5, height: 2.65, rotation: 0, openAngle: Math.PI / 2 },
  { id: 'kitchen', label: '厨房', x: -1.5, z: 2.6, y: 0.45, width: 1.2, height: 2.65, rotation: Math.PI / 2, openAngle: Math.PI / 2 },
  { id: 'dining', label: '餐厅', x: 5.4, z: 1.95, y: 0.45, width: 1.5, height: 2.65, rotation: Math.PI / 2, openAngle: -Math.PI / 2 },
  { id: 'bedroom', label: '威廉客房', x: -3.7, z: 2.2, y: 4.15, width: 1.3, height: 2.65, rotation: Math.PI / 2, openAngle: -Math.PI / 2, color: 0x976b57 },
  { id: 'study', label: '书房 · 后续开放', x: 3, z: 0.12, y: 0.45, width: 1.18, height: 2.5, rotation: 0, openAngle: Math.PI / 2, locked: true },
  { id: 'attic', label: '阁楼 / 浴室 · 后续开放', x: -4.95, z: 3.62, y: 4.15, width: 0.95, height: 2.5, rotation: 0, openAngle: -Math.PI / 2, locked: true },
];

/** 门叶、洞口与门框从同一配置计算，后续改门宽时不会残留隐形墙。 */
export function doorOpening(id: string, clearance = .07) {
  const door = DOORS.find(d => d.id === id);
  if (!door) throw new Error(`未知的门：${id}`);
  const alongX = Math.abs(Math.cos(door.rotation)) > .5;
  return {
    center: alongX ? door.x + Math.cos(door.rotation) * door.width / 2 : door.z - Math.sin(door.rotation) * door.width / 2,
    width: door.width + clearance * 2, bottom: door.y, top: door.y + door.height,
  };
}

export const INTERIOR_SURFACES: WalkSurface[] = [
  { id: 'ground-main', minX: -5.4, maxX: 2.1, minZ: -3.8, maxZ: 4.1, height: 0.45 },
  { id: 'ground-tower', minX: 2, maxX: 5.52, minZ: -0.2, maxZ: 4.1, height: 0.45 },
  { id: 'ground-dining', minX: 5.3, maxX: 10.6, minZ: -2.8, maxZ: 4, height: 0.45 },
  { id: 'west-gallery', ...INTERIOR.gallery, height: 4.15 },
  { id: 'bedroom', minX: -3.85, maxX: 1.86, minZ: -0.45, maxZ: 3.76, height: 4.15 },
  { id: 'main-stair', ...INTERIOR.stair, height: 0.45, ramp: { axis: 'x', start: 1.55, end: -3.8, rise: 3.7 } },
];

export function interiorRoom(x: number, y: number, z: number): string | null {
  const within = (b: {minX:number;maxX:number;minZ:number;maxZ:number}) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
  if (y > 3.5 && within(INTERIOR.gallery)) return '二楼 · 西侧栏廊';
  if (y > 3.5 && within(INTERIOR.bedroom)) return '二楼 · 威廉客房';
  if (within(INTERIOR.stair)) return '主厅 · 楼梯';
  if (within(INTERIOR.kitchen)) return '一楼 · 厨房';
  if (within(INTERIOR.foyer)) return '一楼 · 门厅';
  if (within(INTERIOR.living)) return '一楼 · 主客厅';
  if (within(INTERIOR.dining)) return '一楼 · 餐厅';
  if (x > 2 && x < 5.4 && z > -0.2 && z < 3.9 && y < 3.5) return '一楼 · 东侧过厅';
  return null;
}
