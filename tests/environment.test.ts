import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { PLAYER, WORLD } from '../src/config.ts';
import { moveWithCollisions } from '../src/controls/movement.ts';
import { createEnvironment, terrainHeight, walkableHeight } from '../src/world/environment.ts';

const environment = createEnvironment();
environment.group.updateMatrixWorld(true);

function blocked(x: number, z: number): boolean {
  return environment.colliders.some(collider => collider.type === 'box'
    ? x >= collider.minX && x <= collider.maxX && z >= collider.minZ && z <= collider.maxZ
    : Math.hypot(x - collider.x, z - collider.z) <= collider.radius);
}

test('500 个地形三角面内部采样与可见表面高度一致', () => {
  const terrain = environment.group.getObjectByName('continuous-grass-terrain');
  assert(terrain instanceof THREE.Mesh);
  const position = terrain.geometry.getAttribute('position');
  const indices = terrain.geometry.index;
  assert(indices);
  for (let i = 0; i < 500; i++) {
    const triangle = (i * 479 % (indices.count / 3)) * 3;
    const a = indices.getX(triangle), b = indices.getX(triangle + 1), c = indices.getX(triangle + 2);
    // 用网格顶点的重心坐标计算期望值，独立于行走高度函数。
    const x = position.getX(a) * 0.17 + position.getX(b) * 0.29 + position.getX(c) * 0.54;
    const z = position.getZ(a) * 0.17 + position.getZ(b) * 0.29 + position.getZ(c) * 0.54;
    const expected = position.getY(a) * 0.17 + position.getY(b) * 0.29 + position.getY(c) * 0.54;
    assert(Math.abs(terrainHeight(x, z) - expected) < 0.00002, `三角面 ${triangle / 3} 高度偏差超限`);
  }
  assert.equal(terrainHeight(0, 0), 0);
});

test('湖盆低于水面，720 个湖岸方位及湖内点均受到碰撞保护', () => {
  const lake = WORLD.lake;
  assert(terrainHeight(lake.x, lake.z) < -0.2);
  assert(blocked(lake.x, lake.z));
  for (let i = 0; i < 720; i++) {
    const angle = i / 720 * Math.PI * 2;
    for (const radius of [0.25, 0.5, 0.75, 1]) {
      const x = lake.x + Math.cos(angle) * lake.rx * radius;
      const z = lake.z + Math.sin(angle) * lake.rz * radius;
      assert(blocked(x, z), `湖岸方位 ${i / 2}°、相对半径 ${radius} 存在碰撞漏洞`);
    }
  }
});

test('前廊与三层台阶使用对应标高，台阶外回到草地', () => {
  for (const [z, height] of [[7.5, 0.15], [7.1, 0.3], [6.7, 0.45], [5, 0.45]]) {
    assert.equal(walkableHeight(0, z), height);
    assert.equal(walkableHeight(-1.9, z), height);
    assert.equal(walkableHeight(1.9, z), height);
  }
  assert.equal(walkableHeight(0, 7.8), terrainHeight(0, 7.8));
  assert.equal(walkableHeight(2.1, 7.1), terrainHeight(2.1, 7.1));
});

test('环屋关键位置与出生点不被环境障碍占用', () => {
  const points = [[0, -9], [-9, 0], [14, 0], [0, 9], [...PLAYER.spawn]];
  for (const [x, z] of points) {
    // 同时检查玩家脚下圆周，避免中心畅通但人物半径卡住。
    assert(!blocked(x, z), `路径中心 ${x}, ${z} 被占用`);
    for (let i = 0; i < 16; i++) {
      const angle = i / 16 * Math.PI * 2;
      assert(!blocked(x + Math.cos(angle) * PLAYER.radius, z + Math.sin(angle) * PLAYER.radius), `路径 ${x}, ${z} 的玩家半径范围被占用`);
    }
  }
});

function surfaceHeight(mesh: THREE.Mesh, x: number, z: number): number | undefined {
  const ray = new THREE.Raycaster(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
  return ray.intersectObject(mesh, false)[0]?.point.y;
}

test('接近第二座岩山时，碰撞须阻止眼高进入真实网格内部', () => {
  const ridge = environment.group.getObjectByName('ridge-2');
  assert(ridge instanceof THREE.Mesh);
  // 审查发现的可穿透点：旧碰撞半径允许抵达，但实际山体高于站立眼高。
  const target = { x: 65.049, z: -59.432 };
  const targetSurface = surfaceHeight(ridge, target.x, target.z);
  assert(targetSurface !== undefined);
  assert(targetSurface > walkableHeight(target.x, target.z) + PLAYER.eyeHeight);
  const reached = moveWithCollisions({ x: target.x, z: target.z + 10 }, { x: 0, z: -10 }, environment.colliders);
  const surface = surfaceHeight(ridge, reached.x, reached.z);
  const eye = walkableHeight(reached.x, reached.z) + PLAYER.eyeHeight;
  assert(surface === undefined || surface <= eye,
    `可达点 (${reached.x}, ${reached.z}) 的山体表面 ${surface} 高于眼高 ${eye}`);
});

test('散布岩石四周的实际可达位置不会让站立眼高穿入网格', () => {
  const rocks = environment.group.getObjectByName('field-rocks');
  assert(rocks instanceof THREE.Group);
  for (const object of rocks.children) {
    assert(object instanceof THREE.Mesh);
    const center = object.getWorldPosition(new THREE.Vector3());
    const bound = new THREE.Box3().setFromObject(object);
    const outside = Math.max(bound.max.x - bound.min.x, bound.max.z - bound.min.z) / 2 + 1.5;
    for (let i = 0; i < 72; i++) {
      const angle = i / 72 * Math.PI * 2;
      const dx = Math.cos(angle) * outside, dz = Math.sin(angle) * outside;
      const reached = moveWithCollisions({ x: center.x + dx, z: center.z + dz }, { x: -dx, z: -dz }, environment.colliders);
      const surface = surfaceHeight(object, reached.x, reached.z);
      const eye = walkableHeight(reached.x, reached.z) + PLAYER.eyeHeight;
      assert(surface === undefined || surface <= eye,
        `岩石 (${center.x}, ${center.z}) 方位 ${i * 5}° 可达点的表面 ${surface} 高于眼高 ${eye}`);
    }
  }
});
