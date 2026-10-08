import { MeshStandardMaterial } from 'three';

/** 材质集中在此；下一阶段可统一替换为油画材质。 */
export function createMaterials() {
  const matte = (color: number) => new MeshStandardMaterial({ color, roughness: 0.92 });
  return {
    wall: matte(0xc9c4af), trim: matte(0xdad5c2), roof: matte(0x526c70),
    roofEdge: matte(0x44585c), seam: matte(0xaaa795), stone: matte(0xa8aa9f),
    glass: new MeshStandardMaterial({ color: 0x23383c, roughness: 0.34, metalness: 0.12 }),
    door: matte(0x4e6268), wood: matte(0x96877b), annexRoof: matte(0x765b53),
    metal: matte(0x9d9a7d), dark: matte(0x384142),
  };
}
