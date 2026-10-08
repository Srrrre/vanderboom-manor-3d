import test from 'node:test';
import assert from 'node:assert/strict';
import { Raycaster, Vector3 } from 'three';
import { createManor } from '../src/world/manor.ts';
import { createInterior } from '../src/world/interior.ts';
import { createAldousWing } from '../src/world/aldous.ts';

const surfaces = () => {
  const parts = [createManor(), createInterior(), createAldousWing()];
  for (const part of parts) part.group.updateMatrixWorld(true);
  return parts;
};

test('Aldous 地板盖住原天花与旧背墙顶，不出现不同材质共面', () => {
  const parts = surfaces();
  // 同时取原背墙、背墙与天花重叠带、普通房间地面，避免只修其中一个接缝。
  for (const z of [-.1, 0, 1.1]) {
    const ray = new Raycaster(new Vector3(4.2, 5, z), new Vector3(0, -1, 0), 0, 2);
    const hits = parts.flatMap(part => ray.intersectObject(part.group, true)
      .map(hit => ({height: hit.point.y, part: part.group.name}))).sort((a,b) => b.height-a.height);
    assert.ok(hits.length > 0, `z=${z} 需要真实地板`);
    assert.equal(hits[0].part, 'aldous-wing');
    assert.ok(Math.abs(hits[0].height - 4.15) < .001, '新房间仍保持原二楼高度');
    assert.ok(hits.filter(hit => Math.abs(hit.height-hits[0].height)<.001)
      .every(hit => hit.part === 'aldous-wing'), `z=${z} 原墙或天花不应与木地板共面`);
  }
});

test('一楼过厅仰视仍只看到原天花，下表面与新增楼板留有高度差', () => {
  const parts = surfaces();
  const ray = new Raycaster(new Vector3(4.2, 3.5, 1.1), new Vector3(0, 1, 0), 0, 1);
  const hits = parts.flatMap(part => ray.intersectObject(part.group, true)
    .map(hit => ({height: hit.point.y, part: part.group.name}))).sort((a,b) => a.height-b.height);
  assert.ok(hits.length > 0, '一楼必须保留天花');
  assert.equal(hits[0].part, 'manor-interior');
  assert.ok(Math.abs(hits[0].height-3.97)<.001, '原一楼净高不能变动');
  const upperSlab = hits.find(hit => hit.part === 'aldous-wing');
  assert.ok(upperSlab && upperSlab.height-hits[0].height>.01, '新增楼板下表面不能与原天花重面');
});
