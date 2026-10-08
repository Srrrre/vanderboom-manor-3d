import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera } from 'three';
import { createManor } from '../src/world/manor.ts';
import { createInterior } from '../src/world/interior.ts';
import { createDoors } from '../src/interactions/doors.ts';
import { DOORS, INTERIOR_SURFACES } from '../src/world/interior-layout.ts';
import { walkableHeight } from '../src/world/terrain.ts';
import { moveOnSurfaces } from '../src/controls/surfaces.ts';
import type { MotionWorld } from '../src/world/types.ts';

type Stop = { x: number; y: number; z: number };
const close = (actual: number, expected: number, message: string, tolerance = .015) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${message}: ${actual}，预期 ${expected}`);

function routeFixture() {
  const manor = createManor();
  const interior = createInterior();
  const doors = createDoors(DOORS);
  const occluders = [manor.group, interior.group];
  const world: MotionWorld = {
    colliders: [...manor.colliders, ...interior.colliders, ...doors.colliders],
    surfaces: INTERIOR_SURFACES, groundHeight: walkableHeight,
  };
  const camera = new PerspectiveCamera(60, 1, .01, 100);
  let player: Stop = { x: -.05, y: 0, z: 10 };

  const walkTo = (name: string, target: Stop, feetAt?: (x: number, z: number) => number) => {
    const start = { ...player };
    const dx = target.x - start.x, dz = target.z - start.z;
    // 按正常行走每帧约13厘米推进；每一帧都检查实际到达，不允许测试瞬移过门或楼板。
    const frames = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .13));
    for (let frame = 1; frame <= frames; frame++) {
      const previous = player;
      player = moveOnSurfaces(player, { x: dx / frames, z: dz / frames }, world);
      const x = start.x + dx * frame / frames;
      const z = start.z + dz * frame / frames;
      close(player.x, x, `${name} 第${frame}帧 X（起点 ${JSON.stringify(start)}）`);
      close(player.z, z, `${name} 第${frame}帧 Z（起点 ${JSON.stringify(start)}）`);
      close(player.y, feetAt ? feetAt(x, z) : target.y, `${name} 第${frame}帧脚底`);
      assert.ok(player.y - previous.y <= .24001 && previous.y - player.y <= .28001,
        `${name} 不能发生跨楼层高度跳跃`);
    }
    close(player.x, target.x, `${name} 最终 X`);
    close(player.z, target.z, `${name} 最终 Z`);
    close(player.y, target.y, `${name} 最终脚底`);
  };

  const openDoor = (id: string, beyond: Stop) => {
    const index = DOORS.findIndex((door) => door.id === id);
    const spec = DOORS[index];
    assert.ok(spec, `存在门 ${id}`);
    const blocked = moveOnSurfaces(player, { x: beyond.x - player.x, z: beyond.z - player.z }, world);
    assert.ok(Math.hypot(blocked.x - beyond.x, blocked.z - beyond.z) > .3,
      `${spec.label}关闭时不得直接走过门洞`);
    camera.position.set(player.x, player.y + 1.68, player.z);
    camera.lookAt(spec.x + Math.cos(spec.rotation) * spec.width / 2,
      spec.y + 1.35, spec.z - Math.sin(spec.rotation) * spec.width / 2);
    camera.updateMatrixWorld(true);
    // 真实墙体、门框、家具均参加射线遮挡；不得通过空 occluders 绕过可见性规则。
    const prompt = doors.getPrompt(camera, occluders);
    assert.ok(prompt?.includes('打开') && prompt.includes(spec.label), `${id} 应可见且可操作，实际 ${prompt}`);
    assert.equal(doors.interact(camera, occluders, player), `打开${spec.label}。`);
    for (let frame = 0; frame < 40; frame++) doors.update(.05, player);
    const collider = doors.colliders[index];
    assert.equal(collider.type, 'obb');
    if (collider.type === 'obb') close(collider.rotation, spec.rotation + spec.openAngle, `${id} 完整开启角度`);
  };

  const enter = () => {
    const porchFeet = (_x: number, z: number) => z > 7.7 ? 0 : z > 7.3 ? .15 : z > 6.9 ? .3 : .45;
    walkTo('前院走上前廊', { x: -.05, y: .45, z: 5.5 }, porchFeet);
    openDoor('front', { x: -.05, y: .45, z: 2 });
    walkTo('穿过正门进入门厅', { x: -.05, y: .45, z: 2 });
  };
  const leave = () => {
    walkTo('返回正门前', { x: -.05, y: .45, z: 3.4 });
    walkTo('穿正门回前廊', { x: -.05, y: .45, z: 5.5 });
    const porchFeet = (_x: number, z: number) => z > 7.7 ? 0 : z > 7.3 ? .15 : z > 6.9 ? .3 : .45;
    walkTo('下台阶返回前院', { x: -.05, y: 0, z: 10 }, porchFeet);
  };
  return { walkTo, openDoor, enter, leave };
}

test('真实建筑、家具和门贯通前院、门厅、主客厅、厨房、餐厅并可原路返回', () => {
  const route = routeFixture();
  route.enter();
  route.openDoor('living', { x: -.05, y: .45, z: -.9 });
  route.walkTo('门厅进入主客厅', { x: -.05, y: .45, z: -.9 });
  route.walkTo('客厅返回门厅', { x: -.05, y: .45, z: 2 });
  route.openDoor('kitchen', { x: -2.3, y: .45, z: 2 });
  route.walkTo('门厅进入厨房', { x: -2.3, y: .45, z: 2 });
  route.walkTo('厨房返回门厅', { x: -.05, y: .45, z: 2 });
  route.walkTo('绕开门厅圆桌', { x: -.05, y: .45, z: 1.2 });
  route.walkTo('主屋进入东侧过厅', { x: 4.1, y: .45, z: 1.2 });
  route.openDoor('dining', { x: 6.5, y: .45, z: 1.2 });
  route.walkTo('过厅进入餐厅', { x: 6.5, y: .45, z: 1.2 });
  route.walkTo('沿餐桌西侧行走并避开打开的门扇', { x: 6.5, y: .45, z: -.4 });
  route.walkTo('返回餐厅门洞中线', { x: 6.5, y: .45, z: 1.2 });
  route.walkTo('餐厅返回东侧过厅', { x: 4.1, y: .45, z: 1.2 });
  route.walkTo('过厅返回门厅', { x: -.05, y: .45, z: 1.2 });
  route.leave();
});

test('真实楼梯与门支持前院到二层卧室往返，每帧脚底持续贴合对应楼层', () => {
  const route = routeFixture();
  route.enter();
  route.openDoor('living', { x: -.05, y: .45, z: -.9 });
  const stairFeet = (x: number) => x > 1.55 ? .45 : x < -3.8 ? 4.15 : .45 + (1.55 - x) * 3.7 / 5.35;
  const entranceFeet = (x: number, z: number) => z > -2.15 ? .45 : stairFeet(x);
  route.walkTo('进入楼梯前客厅', { x: -.05, y: .45, z: -.9 });
  route.walkTo('绕到楼梯东侧', { x: 1.25, y: .45, z: -.9 });
  route.walkTo('到达楼梯最低端', { x: 1.48, y: .498411, z: -2.82 }, entranceFeet);
  route.walkTo('向西连续登上二楼', { x: -4.48, y: 4.15, z: -2.82 }, stairFeet);
  route.walkTo('沿西侧栏廊到卧室门', { x: -4.48, y: 4.15, z: 1.55 });
  route.openDoor('bedroom', { x: -2.7, y: 4.15, z: 1.55 });
  route.walkTo('进入二楼卧室', { x: -2.7, y: 4.15, z: 1.55 });
  route.walkTo('卧室内部走到地毯', { x: -1.8, y: 4.15, z: 1.55 });
  route.walkTo('卧室返回西侧栏廊', { x: -4.48, y: 4.15, z: 1.55 });
  route.walkTo('栏廊返回楼梯顶', { x: -4.48, y: 4.15, z: -2.82 });
  route.walkTo('向东连续下楼', { x: 1.48, y: .498411, z: -2.82 }, stairFeet);
  route.walkTo('绕回楼梯前客厅', { x: 1.25, y: .45, z: -.9 }, entranceFeet);
  route.walkTo('回到客厅门中线', { x: -.05, y: .45, z: -.9 });
  route.walkTo('客厅返回门厅', { x: -.05, y: .45, z: 2 });
  route.leave();
});
