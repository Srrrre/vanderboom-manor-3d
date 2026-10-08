import assert from 'node:assert/strict';
import test from 'node:test';
import { surfaceHeight, resolveSurfaceHeight, moveOnSurfaces } from '../src/controls/surfaces.ts';
import type { Collider, MotionWorld, WalkSurface } from '../src/world/types.ts';

const close = (actual: number, expected: number, tolerance = 0.001) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be close to ${expected}`);
const floor: WalkSurface = { id: 'floor', minX: -10, maxX: 10, minZ: -10, maxZ: 10, height: 0 };
const upper: WalkSurface = { ...floor, id: 'upper', height: 3.7 };
const world = (surfaces: WalkSurface[] = [floor], colliders: Collider[] = []): MotionWorld =>
  ({ surfaces, colliders, groundHeight: () => 0 });

test('surface height is bounded by its rectangle and interpolates a reverse-axis ramp', () => {
  const ramp: WalkSurface = { id: 'stairs', minX: -0.675, maxX: 0.675, minZ: -5.35, maxZ: 0,
    height: 0, ramp: { axis: 'z', start: 0, end: -5.35, rise: 3.7 } };
  close(surfaceHeight(ramp, 0, 0)!, 0);
  close(surfaceHeight(ramp, 0, -2.675)!, 1.85);
  close(surfaceHeight(ramp, 0, -5.35)!, 3.7);
  assert.equal(surfaceHeight(ramp, 0.8, -2), null);
});

test('the upper floor never attracts a first-floor player underneath it', () => {
  assert.equal(resolveSurfaceHeight(world([floor, upper]), 0, 0, 0), 0);
  const result = moveOnSurfaces({ x: -2, y: 0, z: 0 }, { x: 4, z: 0 }, world([floor, upper]));
  close(result.x, 2); close(result.y, 0); close(result.z, 0);
});

test('support selection allows low steps but rejects excessive rises and drops', () => {
  assert.equal(resolveSurfaceHeight(world([{ ...floor, height: 0.2 }]), 0, 0, 0), 0.2);
  assert.equal(resolveSurfaceHeight(world([{ ...floor, height: 0.25 }]), 0, 0, 0), 0);
  assert.equal(resolveSurfaceHeight(world([]), 0, 0, 3.7), null);
  assert.equal(resolveSurfaceHeight({ ...world([]), groundHeight: () => 0.24 }, 0, 0, 0), 0.24);
  assert.equal(resolveSurfaceHeight({ ...world([]), groundHeight: () => -0.28 }, 0, 0, 0), -0.28);
  assert.equal(resolveSurfaceHeight({ ...world([]), groundHeight: () => -0.29 }, 0, 0, 0), null);
});

test('continuous stairs support ascent and descent without jumping floors', () => {
  const stairs: WalkSurface = { id: 'stairs', minX: -0.675, maxX: 0.675, minZ: 0, maxZ: 5.35,
    height: 0, ramp: { axis: 'z', start: 0, end: 5.35, rise: 3.7 } };
  const scene = world([{ ...floor, maxZ: 0 }, stairs, { ...upper, minZ: 5.35 }]);
  const top = moveOnSurfaces({ x: 0, y: 0, z: -0.3 }, { x: 0, z: 6.15 }, scene);
  close(top.z, 5.85); close(top.y, 3.7);
  const bottom = moveOnSurfaces(top, { x: 0, z: -6.15 }, scene);
  close(bottom.z, -0.3); close(bottom.y, 0);
});

test('an upstairs opening stops movement before a fall to exterior ground', () => {
  const scene = world([{ ...upper, maxX: 0 }, { ...upper, minX: 1 }]);
  const result = moveOnSurfaces({ x: -1, y: 3.7, z: 0 }, { x: 3, z: 0 }, scene);
  assert.ok(result.x <= 0.001 && result.x >= -0.01);
  close(result.y, 3.7);
});

test('second-floor furniture permits movement underneath but blocks that same floor', () => {
  const furniture: Collider = { type: 'box', minX: 0, maxX: 1, minZ: -2, maxZ: 2, minY: 3.7, maxY: 4.5 };
  const scene = world([floor, upper], [furniture]);
  close(moveOnSurfaces({ x: -1, y: 0, z: 0 }, { x: 3, z: 0 }, scene).x, 2);
  close(moveOnSurfaces({ x: -1, y: 3.7, z: 0 }, { x: 3, z: 0 }, scene).x, -0.28);
});

test('floor slabs permit walking on top and below with sufficient headroom', () => {
  const slab: Collider = { type: 'box', minX: -10, maxX: 10, minZ: -10, maxZ: 10, minY: 3.52, maxY: 3.7 };
  const scene = world([floor, upper], [slab]);
  close(moveOnSurfaces({ x: -1, y: 0, z: 0 }, { x: 2, z: 0 }, scene).x, 1);
  close(moveOnSurfaces({ x: -1, y: 3.7, z: 0 }, { x: 2, z: 0 }, scene).x, 1);
});

test('ascending a ramp refuses a step whose raised head would penetrate a ceiling', () => {
  const stairs: WalkSurface = { ...floor, id: 'ramp', minX: 0, maxX: 4, height: 0,
    ramp: { axis: 'x', start: 0, end: 4, rise: 2 } };
  const ceiling: Collider = { type: 'box', minX: 0, maxX: 4, minZ: -2, maxZ: 2, minY: 2.3, maxY: 2.5 };
  const result = moveOnSurfaces({ x: 0, y: 0, z: 0 }, { x: 4, z: 0 }, world([stairs], [ceiling]));
  close(result.x, 1.04, 0.002);
  close(result.y, 0.52, 0.002);
});

test('walls spanning both floors block both levels while legacy colliders remain full height', () => {
  const wall: Collider = { type: 'box', minX: 0, maxX: 0.2, minZ: -2, maxZ: 2, minY: 0, maxY: 8 };
  for (const y of [0, 3.7]) {
    close(moveOnSurfaces({ x: -1, y, z: 0 }, { x: 3, z: 0 }, world([floor, upper], [wall])).x, -0.28);
    const legacy: Collider = { type: 'circle', x: 0, z: 0, radius: 0.2 };
    close(moveOnSurfaces({ x: -1, y, z: 0 }, { x: 3, z: 0 }, world([floor, upper], [legacy])).x, -0.48);
  }
});

test('a fast move cannot pass through a thin rotated door at player height', () => {
  const door: Collider = { type: 'obb', x: 0, z: 0, halfX: 1, halfZ: 0.025, rotation: Math.PI / 4, minY: 0, maxY: 2.6 };
  const result = moveOnSurfaces({ x: -4, y: 0, z: 0 }, { x: 8, z: 0 }, world([floor], [door]));
  assert.ok(result.x < -0.4 && result.x > -0.44);
});

test('diagonal stair movement slides along height-aware railings', () => {
  const stairs: WalkSurface = { id: 'stairs', minX: -0.675, maxX: 0.675, minZ: 0, maxZ: 5.35,
    height: 0, ramp: { axis: 'z', start: 0, end: 5.35, rise: 3.7 } };
  const railing: Collider = { type: 'box', minX: 0.62, maxX: 0.7, minZ: 0, maxZ: 5.35, minY: 0, maxY: 5 };
  const result = moveOnSurfaces({ x: 0, y: 0, z: 0 }, { x: 2, z: 5.2 }, world([stairs], [railing]));
  close(result.x, 0.34); close(result.z, 5.2); close(result.y, 3.59626);
});
