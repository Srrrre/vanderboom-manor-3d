import assert from 'node:assert/strict';
import test from 'node:test';
import { BoxGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, Vector3 } from 'three';
import { createDoors } from '../src/interactions/doors.ts';
import type { DoorSpec, DoorSystem } from '../src/interactions/doors.ts';
import type { Collider } from '../src/world/types.ts';
import { moveOnSurfaces } from '../src/controls/surfaces.ts';
import { createManor } from '../src/world/manor.ts';
import { createInterior } from '../src/world/interior.ts';
import { DOORS } from '../src/world/interior-layout.ts';

const base: DoorSpec = {
  id: 'parlor', label: '主客厅', x: 0, y: 0, z: 0,
  width: 1.4, height: 2.65, rotation: 0, openAngle: Math.PI / 2,
};
const farPlayer = { x: 5, y: 0, z: 5 };
const close = (actual: number, expected: number, tolerance = 0.0001) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be close to ${expected}`);

function cameraAt(x = 0.7, z = 1.7, target = new Vector3(0.7, 1.5, 0)) {
  const camera = new PerspectiveCamera(60, 1, 0.01, 100);
  camera.position.set(x, 1.5, z);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
  return camera;
}

function obb(doors: DoorSystem) {
  const collider = doors.colliders[0];
  assert.equal(collider.type, 'obb');
  return collider as Extract<Collider, { type: 'obb' }>;
}

function settle(doors: DoorSystem, player = farPlayer) {
  for (let i = 0; i < 100; i++) doors.update(0.05, player);
}

test('closed leaf fills the doorway and opening moves its collision clear of the center', () => {
  const doors = createDoors([base]);
  const collider = obb(doors);
  close(collider.x, 0.7);
  close(collider.z, 0);
  close(collider.halfX, 0.7);
  assert.ok(collider.halfZ >= 0.045);
  assert.equal(collider.minY, 0);
  assert.equal(collider.maxY, 2.65);
  assert.match(doors.interact(cameraAt(), [], farPlayer) ?? '', /打开/);
  settle(doors);
  assert.equal(doors.colliders[0], collider, 'world keeps the same mutable collider object');
  close(collider.rotation, Math.PI / 2);
  close(collider.x, 0);
  close(collider.z, -0.7);
  assert.equal(doors.getPrompt(cameraAt(), []), null, 'center ray passes through the open doorway');
  assert.equal(doors.update(0.05, farPlayer), false, 'settled doors need no shadow update');
});

test('an intermediate leaf angle moves the OBB with its real Three.js mesh', () => {
  const doors = createDoors([{ ...base, x: 2, z: 3, rotation: Math.PI / 2, openAngle: -Math.PI / 2 }]);
  const camera = cameraAt(3.6, 2.3, new Vector3(2, 1.5, 2.3));
  assert.ok(doors.interact(camera, [], farPlayer));
  assert.equal(doors.update(0.1, farPlayer), true);
  const collider = obb(doors);
  assert.ok(collider.rotation > 0 && collider.rotation < Math.PI / 2);
  const leaf = doors.group.getObjectByName('door-leaf-parlor');
  assert.ok(leaf);
  const worldCenter = leaf.localToWorld(new Vector3(0.7, 0, 0));
  close(collider.x, worldCenter.x);
  close(collider.z, worldCenter.z);
  close(collider.rotation, leaf.rotation.y);
});

test('a locked door explains its status without moving or removing collision', () => {
  const doors = createDoors([{ ...base, locked: true, label: '书房' }]);
  assert.match(doors.getPrompt(cameraAt(), []) ?? '', /未开放/);
  assert.match(doors.interact(cameraAt(), [], farPlayer) ?? '', /未开放/);
  settle(doors);
  close(obb(doors).rotation, 0);
});

test('both faces can operate the same door', () => {
  for (const z of [-1.7, 1.7]) {
    const doors = createDoors([base]);
    const camera = cameraAt(0.7, z);
    assert.match(doors.getPrompt(camera, []) ?? '', /E/);
    assert.match(doors.interact(camera, [], farPlayer) ?? '', /打开/);
    settle(doors);
    close(obb(doors).rotation, Math.PI / 2);
  }
});

test('interaction is limited by real ray hit distance and center view', () => {
  const doors = createDoors([base]);
  assert.equal(doors.getPrompt(cameraAt(0.7, 2.7), []), null);
  assert.equal(doors.interact(cameraAt(0.7, 2.7), [], farPlayer), null);
  assert.equal(doors.getPrompt(cameraAt(0.7, 1.7, new Vector3(8, 1.5, 0)), []), null);
  assert.match(doors.getPrompt(cameraAt(0.7, 2.4), []) ?? '', /E/);
});

test('walls and furniture block selection even when passed as a scene ancestor', () => {
  const doors = createDoors([base]);
  const scene = new Scene();
  const wall = new Mesh(new BoxGeometry(2, 3, 0.15), new MeshBasicMaterial());
  wall.position.set(0.7, 1.5, 0.8);
  scene.add(doors.group, wall);
  assert.equal(doors.getPrompt(cameraAt(), [scene]), null);
  assert.equal(doors.interact(cameraAt(), [scene], farPlayer), null);
  wall.position.x = 4;
  assert.match(doors.getPrompt(cameraAt(), [scene]) ?? '', /E/, 'updated scene matrices reveal the doorway');
});

test('another closed leaf is a physical sight blocker for a rear door', () => {
  const doors = createDoors([base, { ...base, id: 'rear', label: '后门', z: -0.6 }]);
  assert.match(doors.getPrompt(cameraAt(), []) ?? '', /主客厅/);
  doors.interact(cameraAt(), [], farPlayer);
  settle(doors);
  assert.match(doors.getPrompt(cameraAt(), []) ?? '', /后门/);
});

test('opening sweeps stop before the player and a second interaction reverses safely', () => {
  const doors = createDoors([base]);
  const player = { x: 0.65, y: 0, z: -0.7 };
  doors.interact(cameraAt(), [], player);
  settle(doors, player);
  const stopped = obb(doors).rotation;
  assert.ok(stopped > 0.05 && stopped < 0.75, `unsafe sweep angle ${stopped}`);
  assert.equal(doors.update(1, player), false, 'blocked movement must stop');
  const camera = cameraAt(0.5, 1, new Vector3(obb(doors).x, 1.5, obb(doors).z));
  assert.match(doors.getPrompt(camera, []) ?? '', /挡|后退|反向/);
  assert.match(doors.interact(camera, [], player) ?? '', /关闭|反向/);
  settle(doors, player);
  close(obb(doors).rotation, 0);
});

test('closing sweeps cannot cross a player even when the frame time is long', () => {
  const doors = createDoors([base]);
  doors.interact(cameraAt(), [], farPlayer);
  settle(doors);
  const camera = cameraAt(1.5, -0.7, new Vector3(0, 1.5, -0.7));
  const player = { x: 0.7, y: 0, z: -0.65 };
  assert.match(doors.interact(camera, [], player) ?? '', /关闭/);
  for (let i = 0; i < 30; i++) doors.update(10, player);
  assert.ok(obb(doors).rotation > 0.8 && obb(doors).rotation < 1.5);
  assert.match(doors.getPrompt(cameraAt(1.5, -0.7, new Vector3(obb(doors).x, 1.5, obb(doors).z)), []) ?? '', /挡|后退|反向/);
});

test('doors only sweep against the player on an intersecting vertical level', () => {
  const doors = createDoors([base]);
  const upstairsPlayer = { x: 0.65, y: 4.15, z: -0.7 };
  doors.interact(cameraAt(), [], upstairsPlayer);
  settle(doors, upstairsPlayer);
  close(obb(doors).rotation, Math.PI / 2);
});

test('a moving leaf can immediately reverse before reaching its target', () => {
  const doors = createDoors([base]);
  doors.interact(cameraAt(), [], farPlayer);
  doors.update(0.1, farPlayer);
  assert.ok(obb(doors).rotation > 0);
  const camera = cameraAt(0.7, 1.7, new Vector3(obb(doors).x, 1.5, obb(doors).z));
  assert.match(doors.interact(camera, [], farPlayer) ?? '', /关闭/);
  settle(doors);
  close(obb(doors).rotation, 0);
});

test('the player is blocked by a closed door and can walk through its opened center', () => {
  const doors = createDoors([base]);
  const world = { colliders: doors.colliders, surfaces: [], groundHeight: () => 0 };
  const start = { x: 0.7, y: 0, z: 1 };
  const closedResult = moveOnSurfaces(start, { x: 0, z: -2 }, world);
  assert.ok(closedResult.z > 0.34 && closedResult.z < 0.35);
  doors.interact(cameraAt(), [], farPlayer);
  settle(doors);
  const openResult = moveOnSurfaces(start, { x: 0, z: -2 }, world);
  close(openResult.z, -1);
  close(openResult.y, 0);
});

test('an upstairs locked leaf blocks its own floor while allowing passage underneath', () => {
  const doors = createDoors([{ ...base, y: 4.15, locked: true }]);
  const world = {
    colliders: doors.colliders, groundHeight: () => 0,
    surfaces: [{ id: 'upper', minX: -2, maxX: 3, minZ: -3, maxZ: 3, height: 4.15 }],
  };
  const lower = moveOnSurfaces({ x: 0.7, y: 0, z: 1 }, { x: 0, z: -2 }, world);
  const upper = moveOnSurfaces({ x: 0.7, y: 4.15, z: 1 }, { x: 0, z: -2 }, world);
  close(lower.z, -1);
  assert.ok(upper.z > 0.34 && upper.z < 0.35);
});

test('the study status is reachable from the east passage in the actual furnished shell', () => {
  const scene = new Scene();
  const doors = createDoors(DOORS);
  scene.add(createManor().group, createInterior().group, doors.group);
  const player = { x: 3.59, y: 0.45, z: 1.2 };
  const camera = new PerspectiveCamera(60, 1, 0.01, 100);
  camera.position.set(player.x, player.y + 1.68, player.z);
  camera.lookAt(3.59, player.y + 1.68, -0.07);
  // 曾把锁门放在实墙内部：仅测门自身可命中，但真实场景射线会先撞墙。
  assert.match(doors.getPrompt(camera, [scene]) ?? '', /未开放.*书房/);
  assert.match(doors.interact(camera, [scene], player) ?? '', /书房.*未开放/);
  assert.equal(doors.update(0.1, player), false, 'locked study remains closed after interaction');
});
