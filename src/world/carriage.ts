import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { WorldPart } from './types.ts';
import { terrainHeight } from './terrain.ts';

/** 克制的几何马车占位，本阶段不复原人物或马匹。 */
export function createCarriage(): WorldPart {
  const group = new THREE.Group();
  group.name = 'carriage';
  group.position.set(-15, terrainHeight(-15, 10), 10);
  const wood = new THREE.MeshStandardMaterial({ color: '#4b4236', roughness: 0.9 });
  const trim = new THREE.MeshStandardMaterial({ color: '#716553', roughness: 0.86 });
  const iron = new THREE.MeshStandardMaterial({ color: '#303733', metalness: 0.3, roughness: 0.7 });
  const interior = new THREE.MeshStandardMaterial({ color: '#272e2b', roughness: 1 });
  function box(name: string, x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  box('chassis', 0, 0.78, 0, 1.72, 0.19, 3.1, iron);
  box('coach-body', 0, 1.29, -0.16, 1.62, 0.89, 2.02, wood);
  box('left-cabin', -0.755, 2.04, -0.16, 0.11, 0.72, 1.92, wood);
  box('right-cabin', 0.755, 2.04, -0.16, 0.11, 0.72, 1.92, wood);
  box('coach-back', 0, 2.02, -1.1, 1.5, 0.76, 0.11, wood);
  box('roof', 0, 2.49, -0.16, 1.87, 0.16, 2.25, iron);
  for (const side of [-1, 1]) {
    box('side-window', side * 0.815, 2.09, -0.12, 0.017, 0.45, 0.89, interior);
    box('window-top-trim', side * 0.832, 2.34, -0.12, 0.04, 0.055, 1.03, trim);
    box('window-bottom-trim', side * 0.832, 1.84, -0.12, 0.04, 0.055, 1.03, trim);
    for (const z of [-0.61, 0.37]) box('window-side-trim', side * 0.832, 2.09, z, 0.04, 0.55, 0.055, trim);
    box('shaft', side * 0.64, 0.8, 2.38, 0.065, 0.075, 2.12, wood);
  }
  box('driver-seat', 0, 1.35, 1.23, 1.65, 0.18, 0.58, trim);
  box('driver-back', 0, 1.57, 0.95, 1.65, 0.43, 0.12, wood);
  for (const z of [-0.88, 1.02]) {
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 2.05, 7), iron);
    axle.rotation.z = Math.PI / 2;
    axle.position.set(0, 0.61, z);
    group.add(axle);
    for (const side of [-1, 1]) {
      const wheel = new THREE.Group();
      wheel.name = 'spoked-wheel';
      wheel.position.set(side * 1, 0.61, z);
      wheel.rotation.y = Math.PI / 2;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.062, 5, 16), iron);
      rim.castShadow = true;
      wheel.add(rim);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 8), wood);
      hub.rotation.x = Math.PI / 2;
      wheel.add(hub);
      for (let i = 0; i < 8; i++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.048, 1.08, 0.054), trim);
        spoke.rotation.z = i * Math.PI / 8;
        wheel.add(spoke);
      }
      group.add(wheel);
    }
  }
  // 按材质合并车轮辐条和装饰，将整辆马车控制在四次绘制调用内。
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert();
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(inverse.clone().multiply(object.matrixWorld));
    const bucket = buckets.get(object.material) ?? [];
    bucket.push(geometry);
    buckets.set(object.material, bucket);
    object.geometry.dispose();
  });
  group.clear();
  for (const [material, geometries] of buckets) {
    const geometry = mergeGeometries(geometries);
    if (geometry) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
    }
    geometries.forEach(geometry => geometry.dispose());
  }
  return { group, colliders: [{ type: 'box', minX: -16.15, maxX: -13.85, minZ: 8.5, maxZ: 13.5 }] };
}
