import assert from 'node:assert/strict';
import test from 'node:test';
import { movementDelta, moveWithCollisions } from '../src/controls/movement.ts';
import type { Collider } from '../src/world/types.ts';
import { PerspectiveCamera, Vector3 } from 'three';
import { FirstPersonController } from '../src/controls/FirstPersonController.ts';

const close = (actual: number, expected: number, tolerance = 0.0001) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be close to ${expected}`);

test('walking travels forward in the camera heading', () => {
  const delta = movementDelta({ forward: 1, right: 0, sprint: false }, 0, 0.05);
  close(delta.x, 0);
  close(delta.z, -0.13);
});

test('sprinting doubles travel without increasing diagonal speed', () => {
  const straight = movementDelta({ forward: 1, right: 0, sprint: true }, 0, 0.05);
  const diagonal = movementDelta({ forward: 1, right: 1, sprint: true }, 0, 0.05);
  close(Math.hypot(straight.x, straight.z), 0.26);
  close(Math.hypot(diagonal.x, diagonal.z), 0.26);
  assert.ok(diagonal.x > 0 && diagonal.z < 0);
});

test('yaw rotates forward and strafe directions consistently', () => {
  const forward = movementDelta({ forward: 1, right: 0, sprint: false }, Math.PI / 2, 0.05);
  const right = movementDelta({ forward: 0, right: 1, sprint: false }, Math.PI / 2, 0.05);
  close(forward.x, -0.13);
  close(forward.z, 0);
  close(right.x, 0);
  close(right.z, -0.13);
});

test('a long frame cannot cause a large movement jump', () => {
  const delta = movementDelta({ forward: 1, right: 0, sprint: true }, 0, 2);
  close(delta.z, -0.26);
  const backwardsTime = movementDelta({ forward: 1, right: 0, sprint: false }, 0, -1);
  close(Math.hypot(backwardsTime.x, backwardsTime.z), 0);
});

test('idle controls do not move the player', () => {
  const delta = movementDelta({ forward: 0, right: 0, sprint: true }, 1.1, 0.05);
  close(Math.hypot(delta.x, delta.z), 0);
});

test('free movement preserves the requested displacement and input objects', () => {
  const position = { x: 2, z: 3 };
  const delta = { x: 0.8, z: -1.2 };
  const result = moveWithCollisions(position, delta, []);
  close(result.x, 2.8);
  close(result.z, 1.8);
  assert.deepEqual(position, { x: 2, z: 3 });
  assert.deepEqual(delta, { x: 0.8, z: -1.2 });
});

test('fast movement cannot tunnel through a thin box', () => {
  const wall: Collider = { type: 'box', minX: 0, maxX: 0.02, minZ: -3, maxZ: 3 };
  const result = moveWithCollisions({ x: -4, z: 0 }, { x: 10, z: 0 }, [wall]);
  close(result.x, -0.28, 0.002);
  close(result.z, 0);
});

test('fast negative movement cannot tunnel through a narrow post', () => {
  const post: Collider = { type: 'box', minX: -0.05, maxX: 0.05, minZ: -0.05, maxZ: 0.05 };
  const result = moveWithCollisions({ x: 3, z: 0 }, { x: -6, z: 0 }, [post]);
  close(result.x, 0.33, 0.002);
});

test('blocked movement still slides along a wall', () => {
  const wall: Collider = { type: 'box', minX: 0, maxX: 1, minZ: -10, maxZ: 10 };
  const result = moveWithCollisions({ x: -1, z: 0 }, { x: 3, z: 2 }, [wall]);
  close(result.x, -0.28, 0.002);
  close(result.z, 2);
});

test('circle obstacles reserve the sum of both radii', () => {
  const tree: Collider = { type: 'circle', x: 0, z: 0, radius: 0.35 };
  const result = moveWithCollisions({ x: -3, z: 0 }, { x: 6, z: 0 }, [tree]);
  close(result.x, -0.63, 0.002);
});

test('a custom player radius changes its clearance', () => {
  const wall: Collider = { type: 'box', minX: 0, maxX: 1, minZ: -2, maxZ: 2 };
  const result = moveWithCollisions({ x: -3, z: 0 }, { x: 6, z: 0 }, [wall], 0.6);
  close(result.x, -0.6, 0.002);
});

test('rounded player clearance permits passing a box corner without clipping', () => {
  const box: Collider = { type: 'box', minX: 0, maxX: 1, minZ: 0, maxZ: 1 };
  const result = moveWithCollisions({ x: -1, z: -0.22 }, { x: 0.79, z: 0 }, [box]);
  close(result.x, -0.21);
  assert.ok(Math.hypot(result.x, result.z) > 0.28);
});

test('all four world edges keep the whole player inside the boundary', () => {
  const positive = moveWithCollisions({ x: 104, z: 104 }, { x: 3, z: 3 }, []);
  const negative = moveWithCollisions({ x: -104, z: -104 }, { x: -3, z: -3 }, []);
  close(positive.x, 104.72);
  close(positive.z, 104.72);
  close(negative.x, -104.72);
  close(negative.z, -104.72);
});

// Only the unavailable browser boundary is simulated; all camera and controller behavior is real.
class BrowserDocument extends EventTarget {
  pointerLockElement: HTMLElement | null = null;
  hidden = false;
  defaultView = new EventTarget();
  exitPointerLock() {
    this.pointerLockElement = null;
    this.dispatchEvent(new Event('pointerlockchange'));
  }
}

function browserFixture(groundHeight = (_x: number, _z: number) => 0) {
  const document = new BrowserDocument();
  const element = {
    ownerDocument: document,
    requestPointerLock() {
      document.pointerLockElement = element as unknown as HTMLElement;
      document.dispatchEvent(new Event('pointerlockchange'));
      return Promise.resolve();
    },
  };
  const camera = new PerspectiveCamera();
  const lockChanges: boolean[] = [];
  const errors: string[] = [];
  const controller = new FirstPersonController(
    camera, element as unknown as HTMLElement, [], groundHeight,
    (locked) => lockChanges.push(locked), (message) => errors.push(message),
  );
  return { document, element, camera, controller, lockChanges, errors };
}

function keyEvent(document: EventTarget, type: string, code: string) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { code });
  document.dispatchEvent(event);
}

test('reset restores the ground-relative spawn and initial view without locking', () => {
  const { camera, controller } = browserFixture(() => 2);
  camera.position.set(-4, 30, -4);
  camera.rotation.set(1, 2, 3);
  controller.reset();
  close(camera.position.x, 18);
  close(camera.position.z, 32);
  close(camera.position.y, 3.68);
  const view = camera.getWorldDirection(new Vector3());
  assert.ok(view.x < 0 && view.z < 0 && view.y > 0);
  assert.equal(controller.isLocked, false);
  controller.dispose();
});

test('WASD moves only while pointer lock belongs to this canvas', () => {
  const { camera, controller, document, lockChanges } = browserFixture();
  controller.reset();
  const start = camera.position.clone();
  keyEvent(document, 'keydown', 'KeyW');
  controller.update(0.05);
  assert.ok(camera.position.equals(start));
  controller.lock();
  keyEvent(document, 'keydown', 'KeyW');
  controller.update(0.05);
  close(Math.hypot(camera.position.x - start.x, camera.position.z - start.z), 0.13);
  controller.unlock();
  const paused = camera.position.clone();
  controller.update(0.05);
  assert.ok(camera.position.equals(paused));
  assert.deepEqual(lockChanges, [true, false]);
  controller.dispose();
});

test('losing focus clears pressed keys before the next lock', () => {
  const { camera, controller, document } = browserFixture();
  controller.reset();
  controller.lock();
  assert.equal(controller.isLocked, true);
  keyEvent(document, 'keydown', 'KeyW');
  document.defaultView.dispatchEvent(new Event('blur'));
  controller.lock();
  const start = camera.position.clone();
  controller.update(0.05);
  assert.ok(camera.position.equals(start));
  controller.dispose();
});

test('hiding the document releases movement and pointer lock', () => {
  const { camera, controller, document } = browserFixture();
  controller.reset();
  controller.lock();
  assert.equal(controller.isLocked, true);
  keyEvent(document, 'keydown', 'KeyW');
  document.hidden = true;
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(controller.isLocked, false);
  document.hidden = false;
  controller.lock();
  const start = camera.position.clone();
  controller.update(0.05);
  assert.ok(camera.position.equals(start));
  controller.dispose();
});

test('mouse look uses locked relative input and clamps pitch', () => {
  const { camera, controller, document } = browserFixture();
  controller.reset();
  controller.lock();
  const yaw = camera.rotation.y;
  const event = new Event('mousemove');
  Object.assign(event, { movementX: 100, movementY: 100000 });
  document.dispatchEvent(event);
  assert.ok(camera.rotation.y < yaw);
  assert.ok(camera.rotation.x > -Math.PI / 2 && camera.rotation.x < -1);
  controller.dispose();
});

test('ground changes ease the eye height and settle at standing height', () => {
  let ground = 0;
  const { camera, controller } = browserFixture(() => ground);
  controller.reset();
  controller.lock();
  ground = 0.45;
  controller.update(0.05);
  assert.ok(camera.position.y > 1.68 && camera.position.y < 2.13);
  for (let index = 0; index < 40; index++) controller.update(0.05);
  close(camera.position.y, 2.13);
  controller.dispose();
});

test('rejected pointer lock is reported and a later request can recover', async () => {
  const { controller, element, errors } = browserFixture();
  const workingRequest = element.requestPointerLock;
  element.requestPointerLock = () => Promise.reject(new Error('Denied'));
  controller.lock();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(errors.length, 1);
  element.requestPointerLock = workingRequest;
  controller.lock();
  assert.equal(controller.isLocked, true);
  controller.dispose();
});

test('dispose unlocks and detaches input listeners', () => {
  const { camera, controller, document } = browserFixture();
  controller.reset();
  controller.lock();
  assert.equal(controller.isLocked, true);
  controller.dispose();
  assert.equal(controller.isLocked, false);
  const view = camera.rotation.clone();
  const event = new Event('mousemove');
  Object.assign(event, { movementX: 100, movementY: 100 });
  document.dispatchEvent(event);
  assert.ok(camera.rotation.equals(view));
  controller.lock();
  assert.equal(controller.isLocked, false);
});

test('native Escape unlock clears held input before resuming', () => {
  const { camera, controller, document, lockChanges } = browserFixture();
  controller.lock();
  keyEvent(document, 'keydown', 'KeyW');
  document.exitPointerLock();
  assert.equal(controller.isLocked, false);
  assert.deepEqual(lockChanges, [true, false]);
  controller.lock();
  const start = camera.position.clone();
  controller.update(0.05);
  assert.ok(camera.position.equals(start));
  controller.dispose();
});

test('Escape key explicitly unlocks when the browser does not and preserves the native default', () => {
  const { camera, controller, document, lockChanges } = browserFixture();
  controller.lock();
  keyEvent(document, 'keydown', 'KeyW');
  const escape = new Event('keydown', { cancelable: true });
  Object.assign(escape, { code: 'Escape' });
  document.dispatchEvent(escape);
  assert.equal(controller.isLocked, false);
  assert.deepEqual(lockChanges, [true, false]);
  assert.equal(escape.defaultPrevented, false);
  controller.lock();
  const start = camera.position.clone();
  controller.update(0.05);
  assert.ok(camera.position.equals(start));
  controller.dispose();
});

test('a pending pointer lock cannot reacquire control after cancellation', async () => {
  const { controller, document, element, lockChanges } = browserFixture();
  let resolveRequest: () => void = () => {};
  element.requestPointerLock = () => new Promise<void>((resolve) => { resolveRequest = resolve; });
  controller.lock();
  controller.unlock();
  document.pointerLockElement = element as unknown as HTMLElement;
  document.dispatchEvent(new Event('pointerlockchange'));
  resolveRequest();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(controller.isLocked, false);
  assert.deepEqual(lockChanges, []);
  controller.dispose();
});
