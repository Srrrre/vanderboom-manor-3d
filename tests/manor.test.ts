import test from 'node:test';
import assert from 'node:assert/strict';
import { Raycaster, Vector3 } from 'three';
import { createManor } from '../src/world/manor.ts';
import { moveWithCollisions } from '../src/controls/movement.ts';

test('approaching ground windows keeps the player clear of the visible facade', () => {
  const { group, colliders } = createManor();
  group.updateMatrixWorld(true);
  for (const x of [-3.4, 3.25, 6.7, 9.2]) {
    const eye = x > 5.4 ? 1.68 : 2.13;
    const hit = new Raycaster(new Vector3(x, eye, 10), new Vector3(0, 0, -1)).intersectObject(group, true)[0];
    assert.ok(hit, `visible facade at x=${x}`);
    const position = moveWithCollisions({ x, z: 10 }, { x: 0, z: -15 }, colliders);
    assert.ok(position.z - 0.28 >= hit.point.z - 0.003,
      `x=${x}: player front ${position.z - 0.28} penetrates visible mesh at ${hit.point.z}`);
  }
});

test('正门洞有真实净空，实体外墙和静态碰撞不再封死门厅', () => {
  const { group, colliders } = createManor(); group.updateMatrixWorld(true);
  const hits = new Raycaster(new Vector3(-.05, 2.13, 5), new Vector3(0, 0, -1), 0, 3).intersectObject(group, true);
  assert.equal(hits.length, 0, '正门净空中不能残留门板、挂板线或实心主楼');
  const active = colliders.filter(c => (c.minY ?? -Infinity) < 2.2 && (c.maxY ?? Infinity) > .46);
  const result = moveWithCollisions({x:-.05,z:5},{x:0,z:-3},active);
  assert.ok(result.z < 2.1);
});
