import * as THREE from 'three';
import { MANOR, WORLD } from '../config.ts';

const SEGMENTS = 200;
const SIZE = WORLD.groundSize;
const HALF = SIZE / 2;
const STEP = SIZE / SEGMENTS;
export const LAKE_LEVEL = -0.2;

const smooth = (t: number): number => {
  const s = Math.max(0, Math.min(1, t));
  return s * s * (3 - 2 * s);
};

export function lakeDistance(x: number, z: number): number {
  const lake = WORLD.lake;
  return Math.hypot((x - lake.x) / lake.rx, (z - lake.z) / lake.rz);
}

/** 庄园周围保持平坦，湖盆与远处起伏通过连续函数衔接。 */
function sourceHeight(x: number, z: number): number {
  const distance = Math.hypot(x, z);
  const hills = smooth((distance - 22) / 32);
  const undulation = Math.sin(x * 0.045 + 0.4) * Math.cos(z * 0.039) * 1.45
    + Math.sin(z * 0.075 + x * 0.019) * 0.55;
  const base = hills * (undulation + 0.5);
  const shore = lakeDistance(x, z);
  if (shore < 0.86) return -1.55;
  if (shore < 1) return THREE.MathUtils.lerp(-1.55, LAKE_LEVEL, smooth((shore - 0.86) / 0.14));
  if (shore < 1.17) return THREE.MathUtils.lerp(LAKE_LEVEL, base, smooth((shore - 1) / 0.17));
  return base;
}

const heights = new Float32Array((SEGMENTS + 1) ** 2);
for (let iz = 0; iz <= SEGMENTS; iz++) {
  for (let ix = 0; ix <= SEGMENTS; ix++) {
    heights[iz * (SEGMENTS + 1) + ix] = sourceHeight(-HALF + ix * STEP, -HALF + iz * STEP);
  }
}

/** 直接插值可见地形网格的同一组三角面，保证行走高度与画面一致。 */
export function terrainHeight(x: number, z: number): number {
  const gx = THREE.MathUtils.clamp((x + HALF) / STEP, 0, SEGMENTS - 0.000001);
  const gz = THREE.MathUtils.clamp((z + HALF) / STEP, 0, SEGMENTS - 0.000001);
  const ix = Math.floor(gx), iz = Math.floor(gz);
  const fx = gx - ix, fz = gz - iz;
  const a = iz * (SEGMENTS + 1) + ix;
  const b = a + 1, c = a + SEGMENTS + 1, d = c + 1;
  return fx + fz <= 1
    ? heights[a] * (1 - fx - fz) + heights[b] * fx + heights[c] * fz
    : heights[b] * (1 - fz) + heights[c] * (1 - fx) + heights[d] * (fx + fz - 1);
}

/** 前廊和三层浅台阶使用与建筑一致的精确标高。 */
export function walkableHeight(x: number, z: number): number {
  const porch = MANOR.porch;
  if (x >= porch.x - porch.width / 2 && x <= porch.x + porch.width / 2
    && z >= porch.z - porch.depth / 2 && z <= porch.z + porch.depth / 2) return porch.floor;
  if (x >= -2 && x <= 2 && z >= 6.5 && z <= 7.7) {
    if (z <= 6.9) return 0.45;
    if (z <= 7.3) return 0.3;
    return 0.15;
  }
  return terrainHeight(x, z);
}

export function createTerrain(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'terrain';
  const vertices: number[] = [], colors: number[] = [], indices: number[] = [];
  const meadow = new THREE.Color('#718067');
  const darkGrass = new THREE.Color('#526447');
  const shoreColor = new THREE.Color('#777b68');
  const color = new THREE.Color();
  for (let iz = 0; iz <= SEGMENTS; iz++) {
    for (let ix = 0; ix <= SEGMENTS; ix++) {
      const x = -HALF + ix * STEP, z = -HALF + iz * STEP;
      const y = heights[iz * (SEGMENTS + 1) + ix];
      vertices.push(x, y, z);
      const variation = 0.35 + 0.2 * Math.sin(x * 0.27 + Math.cos(z * 0.16))
        + 0.14 * Math.sin(x * 0.74 + z * 0.43);
      color.copy(meadow).lerp(darkGrass, variation);
      const shore = lakeDistance(x, z);
      if (shore < 1.14) color.lerp(shoreColor, 1 - smooth((shore - 1.02) / 0.12));
      colors.push(color.r, color.g, color.b);
      if (ix < SEGMENTS && iz < SEGMENTS) {
        const a = iz * (SEGMENTS + 1) + ix, b = a + 1, c = a + SEGMENTS + 1, d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  mesh.name = 'continuous-grass-terrain';
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

/** 道路为贴合地形的薄带，取高方式与行走一致。 */
export function createPath(points: THREE.Vector3[], width: number, closed = false): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  const segments = closed ? 260 : 180;
  const positions: number[] = [], indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPoint(t), tangent = curve.getTangent(t);
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    for (const side of [-1, 1]) {
      const x = p.x + normal.x * width * side / 2;
      const z = p.z + normal.z * width * side / 2;
      positions.push(x, terrainHeight(x, z) + 0.028, z);
    }
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#9b9d85', roughness: 1, side: THREE.DoubleSide }));
  mesh.receiveShadow = true;
  return mesh;
}
