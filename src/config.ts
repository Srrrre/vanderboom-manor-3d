/** 米为单位。正面朝 +Z；无测绘依据的进深见参考分析。 */
export const MANOR = {
  main: { x: -1.65, z: 0.1, width: 7.5, depth: 7.8, height: 8.2, roofRise: 2.8 },
  tower: { x: 3.75, z: 1.9, width: 3.3, depth: 4.2, height: 11.6, roofRise: 3.6 },
  annex: { x: 8, z: 0.6, width: 5.2, depth: 6.8, height: 3.5, roofRise: 1.9 },
  porch: { x: -0.1, z: 5.25, width: 11.8, depth: 2.5, floor: 0.45, roof: 3.65, columns: [-5.65, -1.9, 1.75, 5.4] },
  door: { x: -0.05, width: 1.18, height: 2.65 },
  windows: { groundX: [-3.4, 3.25], upperX: [-3.25, -0.35, 3.7] },
} as const;

export const PLAYER = { eyeHeight: 1.68, walkSpeed: 2.6, runSpeed: 5.2, radius: 0.28, spawn: [18, 32] } as const;
export const WORLD = { groundSize: 260, boundary: 105, lake: { x: -48, z: -38, rx: 32, rz: 21 }, maxPixelRatio: 1.5 } as const;
