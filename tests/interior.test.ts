import test from 'node:test';
import assert from 'node:assert/strict';
import { Raycaster, Vector3 } from 'three';
import { createInterior } from '../src/world/interior.ts';
import { INTERIOR_SURFACES } from '../src/world/interior-layout.ts';
import { moveOnSurfaces } from '../src/controls/surfaces.ts';

const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < .025, `${actual} should be ${expected}`);
const scene = () => ({ ...createInterior(), surfaces: INTERIOR_SURFACES, groundHeight: () => .45 });

test('厨房隔墙阻挡穿墙但厨房门洞可通行', () => {
  const world = scene();
  const blocked = moveOnSurfaces({x: -.7, y: .45, z: 3.15}, {x: -1.6, z: 0}, world);
  assert.ok(blocked.x > -1.25, '隔墙必须阻挡玩家');
  const through = moveOnSurfaces({x: -.7, y: .45, z: 2.0}, {x: -1.6, z: 0}, world);
  close(through.x, -2.3);
});

test('主要路线贯通门厅、主厅、楼梯、二层栏廊及卧室', () => {
  const world = scene();
  let player = {x: -.05, y: .45, z: 3.55};
  const route = [
    {x: -.05, z: -1.5, y: .45}, {x: 1.25, z: -1.5, y: .45},
    {x: 1.48, z: -4.02, y: .4984}, {x: -4.45, z: -4.02, y: 4.15},
    {x: -4.45, z: 1.55, y: 4.15}, {x: -2.7, z: 1.55, y: 4.15},
  ];
  for (const stop of route) {
    player = moveOnSurfaces(player, {x: stop.x - player.x, z: stop.z - player.z}, world);
    close(player.x, stop.x); close(player.z, stop.z); close(player.y, stop.y);
  }
  for (const stop of route.slice(0,-1).reverse()) {
    player = moveOnSurfaces(player, {x: stop.x - player.x, z: stop.z - player.z}, world);
    close(player.x, stop.x); close(player.z, stop.z); close(player.y, stop.y);
  }
});

test('楼梯下端与东侧外墙之间保留可走入的身体净空', () => {
  const world = scene();
  world.colliders.push({type:'box',minX:1.86,maxX:2.1,minZ:-5,maxZ:-.05,minY:.45,maxY:8.2});
  const entry=moveOnSurfaces({x:1.48,y:.45,z:-2.65},{x:0,z:-1.37},world);
  close(entry.z,-4.02);
  const top=moveOnSurfaces(entry,{x:-5.93,z:0},world);
  close(top.x,-4.45);close(top.y,4.15);
});

test('楼梯及西侧挑空栏杆可以阻挡斜向穿出楼板', () => {
  const world = scene();
  const upstairs = moveOnSurfaces({x: -4.5, y: 4.15, z: -1.2}, {x: 2, z: 0}, world);
  assert.ok(upstairs.x < -4.0, `栏廊边缘不能跨出：${upstairs.x}`);
  const diagonal = moveOnSurfaces({x: .8, y: .9687, z: -4.02}, {x: -2, z: 1.8}, world);
  assert.ok(diagonal.z < -3.55, `楼梯扶手不能穿过：${diagonal.z}`);
});

test('二层楼板仅覆盖栏廊与卧室，楼梯上方保持挑空', () => {
  const {group} = createInterior(); group.updateMatrixWorld(true);
  const rayDown = (x: number,z: number) => new Raycaster(new Vector3(x, 6.5, z),new Vector3(0,-1,0)).intersectObject(group,true)[0];
  const bedroom = rayDown(0, 2.8);
  assert.ok(bedroom && bedroom.point.y >= 4.15, '卧室必须有实体楼板');
  const stair = rayDown(-1.3,-4.02);
  assert.ok(stair && stair.point.y > 1.5 && stair.point.y < 3.1, '楼梯顶面可见，不能被完整二层楼板封住');
});

test('扩容后的门厅横向净空与新增后部木地板真实存在', () => {
  const world = scene();
  const foyer = moveOnSurfaces({x: -.8, y: .45, z: .5}, {x: 1.8, z: 0}, world);
  close(foyer.x, 1); close(foyer.z, .5);
  world.group.updateMatrixWorld(true);
  const rearFloor = new Raycaster(new Vector3(.75, .9, -4.85), new Vector3(0,-1,0)).intersectObject(world.group,true)[0];
  assert.ok(rearFloor && Math.abs(rearFloor.point.y-.45)<.03, '后移主屋边界内必须有真实地板，不能只延长数学表面');
});

test('室内碰撞体均有合法高度，楼下不会被二楼家具阻挡', () => {
  const world = scene();
  assert.ok(world.colliders.length > 0);
  for (const c of world.colliders) assert.ok(Number.isFinite(c.minY) && Number.isFinite(c.maxY) && c.maxY! > c.minY!);
  const ground = moveOnSurfaces({x: -.05, y: .45, z: 3.5}, {x: 0, z: -2.2}, world);
  close(ground.z, 1.3); close(ground.y, .45);
});
