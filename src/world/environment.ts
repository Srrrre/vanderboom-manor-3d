import * as THREE from 'three';
import { WORLD } from '../config.ts';
import type { Collider, WorldPart } from './types.ts';
import { createCarriage } from './carriage.ts';
import { createPath, createTerrain, lakeDistance, LAKE_LEVEL, terrainHeight } from './terrain.ts';

export { terrainHeight, walkableHeight } from './terrain.ts';

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createLake(colliders: Collider[]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'lake';
  const lake = WORLD.lake;
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 100), new THREE.MeshStandardMaterial({
    color: '#789495', roughness: 0.3, metalness: 0.08, transparent: false,
  }));
  water.name = 'still-water';
  water.rotation.x = -Math.PI / 2;
  water.scale.set(lake.rx * 1.006, lake.rz * 1.006, 1);
  water.position.set(lake.x, LAKE_LEVEL + 0.012, lake.z);
  group.add(water);

  // 窄条碰撞盒按各自最宽横截面覆盖，确保湖面内无漏洞；
  // 曲线岸边只保留很小且可预期的阻挡余量。
  const strips = 48;
  const rz = lake.rz * 1.025, rx = lake.rx * 1.025;
  for (let i = 0; i < strips; i++) {
    const z0 = -rz + 2 * rz * i / strips, z1 = -rz + 2 * rz * (i + 1) / strips;
    const nearCenter = z0 <= 0 && z1 >= 0 ? 0 : Math.min(Math.abs(z0), Math.abs(z1));
    const halfWidth = rx * Math.sqrt(Math.max(0, 1 - (nearCenter / rz) ** 2));
    colliders.push({ type: 'box', minX: lake.x - halfWidth, maxX: lake.x + halfWidth, minZ: lake.z + z0, maxZ: lake.z + z1 });
  }

  const random = seededRandom(9927);
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: '#777e70', roughness: 1, flatShading: true }), 74);
  rocks.name = 'shore-stones';
  const reeds = new THREE.InstancedMesh(new THREE.ConeGeometry(0.21, 1, 4),
    new THREE.MeshStandardMaterial({ color: '#7b8160', roughness: 1 }), 98);
  reeds.name = 'shore-grasses';
  const dummy = new THREE.Object3D();
  for (let i = 0; i < rocks.count; i++) {
    const angle = i / rocks.count * Math.PI * 2 + (random() - 0.5) * 0.03;
    const radius = 1.034 + random() * 0.055;
    const x = lake.x + Math.cos(angle) * lake.rx * radius;
    const z = lake.z + Math.sin(angle) * lake.rz * radius;
    const size = 0.23 + random() * 0.42;
    dummy.position.set(x, terrainHeight(x, z) + size * 0.16, z);
    dummy.rotation.set(random(), random() * 3, random());
    dummy.scale.set(size * 1.6, size * 0.7, size);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }
  for (let i = 0; i < reeds.count; i++) {
    const angle = random() * Math.PI * 2;
    const radius = 1.025 + random() * 0.055;
    const x = lake.x + Math.cos(angle) * lake.rx * radius;
    const z = lake.z + Math.sin(angle) * lake.rz * radius;
    const height = 0.45 + random() * 0.58;
    dummy.position.set(x, terrainHeight(x, z) + height / 2, z);
    dummy.rotation.set(0, random() * 6.28, 0);
    dummy.scale.set(0.8 + random(), height, 0.8 + random());
    dummy.updateMatrix();
    reeds.setMatrixAt(i, dummy.matrix);
  }
  group.add(rocks, reeds);
  return group;
}

interface Tree { x: number; z: number; height: number; radius: number; rotation: number }

function createVegetation(colliders: Collider[]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'vegetation';
  const random = seededRandom(1386);
  const trees: Tree[] = [];
  for (let attempts = 0; attempts < 3000 && trees.length < 210; attempts++) {
    const x = -99 + random() * 195;
    const z = -100 + random() * 146;
    const distance = Math.hypot(x, z);
    if (distance < 21 || lakeDistance(x, z) < 1.19) continue;
    if (z > 6 && x > -21 && x < 31) continue; // 为入口道路和前院留出开阔空间。
    if (x > 27 && z < -38) continue; // 保留右后方岩山的独立轮廓。
    if (z > 16 && random() < 0.74) continue;
    if (trees.some(tree => Math.hypot(tree.x - x, tree.z - z) < 3.7)) continue;
    trees.push({ x, z, height: 6 + random() * 7.6, radius: 1.45 + random() * 1.3, rotation: random() * Math.PI * 2 });
  }
  const near = trees.filter(t => Math.hypot(t.x, t.z) < 45);
  const far = trees.filter(t => Math.hypot(t.x, t.z) >= 45);
  const trunkGeometry = new THREE.CylinderGeometry(0.11, 0.17, 1, 6);
  const crownGeometry = new THREE.ConeGeometry(1, 1, 7);
  const bark = new THREE.MeshStandardMaterial({ color: '#535342', roughness: 1 });
  const foliage = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true });
  const paleNeedles = new THREE.Color('#65796a');
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  for (const [index, grove] of [near, far].entries()) {
    const trunks = new THREE.InstancedMesh(trunkGeometry, bark, grove.length);
    trunks.name = index === 0 ? 'near-trunks' : 'distant-trunks';
    const crowns = new THREE.InstancedMesh(crownGeometry, foliage, grove.length * 3);
    crowns.name = index === 0 ? 'near-pine-crowns' : 'distant-pine-crowns';
    trunks.castShadow = crowns.castShadow = index === 0;
    trunks.receiveShadow = crowns.receiveShadow = index === 0;
    for (let i = 0; i < grove.length; i++) {
      const tree = grove[i], y = terrainHeight(tree.x, tree.z);
      dummy.position.set(tree.x, y + tree.height * 0.25, tree.z);
      dummy.rotation.set(0, tree.rotation, 0);
      dummy.scale.set(tree.height / 9, tree.height * 0.5, tree.height / 9);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      for (let tier = 0; tier < 3; tier++) {
        const h = tree.height * (0.5 - tier * 0.055);
        const center = tree.height * (0.44 + tier * 0.17);
        dummy.position.set(tree.x, y + center, tree.z);
        dummy.scale.set(tree.radius * (1 - tier * 0.21), h, tree.radius * (1 - tier * 0.21));
        dummy.updateMatrix();
        crowns.setMatrixAt(i * 3 + tier, dummy.matrix);
        color.set('#3b5648').lerp(paleNeedles, random() * 0.7);
        crowns.setColorAt(i * 3 + tier, color);
      }
      colliders.push({ type: 'circle', x: tree.x, z: tree.z, radius: tree.height / 9 * 0.17 + 0.06 });
    }
    group.add(trunks, crowns);
  }
  return group;
}

function createMountainsAndRocks(colliders: Collider[]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'mountains';
  const rockMaterial = new THREE.MeshStandardMaterial({ color: '#717976', flatShading: true, roughness: 1 });
  const distantMaterial = new THREE.MeshStandardMaterial({ color: '#778787', flatShading: true, roughness: 1 });
  const ridgeData = [
    [46, -65, 16, 26, 13], [59, -77, 21, 38, 18], [75, -81, 17, 31, 17],
    [89, -89, 21, 39, 18], [35, -78, 16, 21, 17], [78, -107, 30, 35, 20],
  ];
  for (let i = 0; i < ridgeData.length; i++) {
    const [x, z, width, height, depth] = ridgeData[i];
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 5, 1), i > 3 ? distantMaterial : rockMaterial);
    mountain.name = `ridge-${i + 1}`;
    mountain.position.set(x, terrainHeight(x, z) + height / 2 - 1, z);
    mountain.scale.set(width, height, depth);
    mountain.rotation.y = i * 1.33 + 0.3;
    group.add(mountain);
    // 用锥体缩放后的完整外接圆包围，避免旋转后的山脚露出碰撞范围。
    colliders.push({ type: 'circle', x, z, radius: Math.max(width, depth) });
  }
  const random = seededRandom(2267);
  const rocks = new THREE.Group();
  rocks.name = 'field-rocks';
  const geometry = new THREE.DodecahedronGeometry(1, 0);
  const placements = [[25, -24, 2.8], [29, -28, 2], [24, -27, 1.3], [-24, 2, 1.1], [-29, 13, 1.5], [22, 15, 0.95], [33, -36, 3.5], [38, -38, 2.4], [-18, -12, 1.05]];
  for (const [x, z, size] of placements) {
    const rock = new THREE.Mesh(geometry, rockMaterial);
    rock.position.set(x, terrainHeight(x, z) + size * 0.38, z);
    rock.scale.set(size, size * (0.6 + random() * 0.4), size * 0.82);
    rock.rotation.set(random() * 0.25, random() * 6.28, random() * 0.16);
    rock.castShadow = Math.hypot(x, z) < 42;
    rock.receiveShadow = true;
    rocks.add(rock);
    colliders.push({ type: 'circle', x, z, radius: size * 0.94 });
  }
  group.add(rocks);
  return group;
}

function createPaths(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'paths';
  const v = (x: number, z: number) => new THREE.Vector3(x, 0, z);
  const arrival = createPath([v(21, 69), v(22, 48), v(15, 31), v(5.5, 22), v(0.8, 14), v(0, 7.7)], 2.8);
  arrival.name = 'arrival-path';
  const circuit = createPath([v(-8.1, 7.7), v(-9, 0), v(-8.1, -7.2), v(0, -9), v(12.8, -7.5), v(14.5, 0), v(12.8, 7.8), v(3.3, 9.6), v(-4.5, 9.1)], 1.15, true);
  circuit.name = 'manor-walking-loop';
  const lakePath = createPath([v(-8.8, -5), v(-14, -9), v(-19, -14), v(-25, -15)], 1.05);
  lakePath.name = 'lakeside-spur';
  group.add(arrival, circuit, lakePath);
  return group;
}

/** 命名子节点可以分别替换为后续精细制作的 GLB 资产。 */
export function createEnvironment(): WorldPart {
  const group = new THREE.Group();
  group.name = 'environment';
  const colliders: Collider[] = [];
  const carriage = createCarriage();
  group.add(createTerrain(), createPaths(), createLake(colliders), createVegetation(colliders), createMountainsAndRocks(colliders), carriage.group);
  colliders.push(...carriage.colliders);
  return { group, colliders };
}
