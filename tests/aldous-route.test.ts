import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera } from 'three';
import { createManor } from '../src/world/manor.ts';
import { createInterior } from '../src/world/interior.ts';
import { createAldousWing } from '../src/world/aldous.ts';
import { createDoors } from '../src/interactions/doors.ts';
import { ALDOUS, DOORS, INTERIOR_SURFACES } from '../src/world/interior-layout.ts';
import { walkableHeight } from '../src/world/terrain.ts';
import { moveOnSurfaces } from '../src/controls/surfaces.ts';
import type { MotionWorld } from '../src/world/types.ts';

type Stop = { x: number; y: number; z: number };
const close = (actual: number, expected: number, name: string) =>
  assert.ok(Math.abs(actual - expected) < .015, `${name}: ${actual}，预期 ${expected}`);

function fixture() {
  const manor = createManor(), interior = createInterior(), aldous = createAldousWing();
  const doors = createDoors(DOORS);
  const occluders = [manor.group, interior.group, aldous.group];
  const world: MotionWorld = {
    colliders: [...manor.colliders, ...interior.colliders, ...aldous.colliders, ...doors.colliders],
    surfaces: INTERIOR_SURFACES, groundHeight: walkableHeight,
  };
  const camera = new PerspectiveCamera(60, 1, .01, 100);
  let player: Stop = { x: -.05, y: 0, z: 10 };

  const walk = (name: string, target: Stop, feet?: (x: number, z: number) => number) => {
    const start = { ...player }, dx = target.x - start.x, dz = target.z - start.z;
    const frames = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .1));
    // 真正逐帧执行运动求解，不能把终点或预期高度赋给玩家来掩盖卡点。
    for (let frame = 1; frame <= frames; frame++) {
      const previous = player;
      player = moveOnSurfaces(player, { x: dx / frames, z: dz / frames }, world);
      const x = start.x + dx * frame / frames, z = start.z + dz * frame / frames;
      close(player.x, x, `${name} 第 ${frame} 帧 X，起点 ${JSON.stringify(start)}`);
      close(player.z, z, `${name} 第 ${frame} 帧 Z，起点 ${JSON.stringify(start)}`);
      // 台阶边界为不连续函数；按已验证的实际坐标判定，避免7.7与7.700000000000008分居两级。
      close(player.y, feet ? feet(player.x, player.z) : target.y, `${name} 第 ${frame} 帧脚底`);
      assert.ok(player.y - previous.y <= .24001 && previous.y - player.y <= .28001,
        `${name} 不应吸附另一楼层或跌落`);
    }
    close(player.y, target.y, `${name} 到达目标楼层`);
  };
  const blocked = (id: string, beyond: Stop) => {
    const result = moveOnSurfaces(player, { x: beyond.x - player.x, z: beyond.z - player.z }, world);
    assert.ok(Math.hypot(result.x - beyond.x, result.z - beyond.z) > .3, `${id} 关闭后应阻止通行`);
  };
  const toggle = (id: string, opening: boolean) => {
    const index = DOORS.findIndex(d => d.id === id);
    assert.ok(index >= 0, `必须存在 ${id}`);
    const spec = DOORS[index], collider = doors.colliders[index];
    assert.equal(collider.type, 'obb');
    if (collider.type !== 'obb') throw new Error('门必须具有旋转碰撞');
    // 瞄准当前门叶实体中心；关闭已打开的门时也必须满足真实射线与距离约束。
    camera.position.set(player.x, player.y + 1.68, player.z);
    camera.lookAt(collider.x, spec.y + 1.35, collider.z);
    camera.updateMatrixWorld(true);
    const verb = opening ? '打开' : '关闭';
    const prompt = doors.getPrompt(camera, occluders);
    assert.ok(prompt?.includes(verb) && prompt.includes(spec.label), `${id} 应可 ${verb}，实际 ${prompt}`);
    assert.equal(doors.interact(camera, occluders, player), `${verb}${spec.label}。`);
    for (let frame = 0; frame < 40; frame++) doors.update(.05, player);
    close(collider.rotation, spec.rotation + (opening ? spec.openAngle : 0), `${id} 完整${verb}`);
  };
  const porchFeet = (_x: number, z: number) => z > 7.7 ? 0 : z > 7.3 ? .15 : z > 6.9 ? .3 : .45;
  const enterCorridor = () => {
    walk('前院到前廊', { x: -.05, y: .45, z: 5.5 }, porchFeet);
    blocked('front', { x: -.05, y: .45, z: 2 });
    toggle('front', true);
    walk('正门进入门厅', { x: -.05, y: .45, z: 2 });
    toggle('living', true);
    walk('门厅进入主厅', { x: -.05, y: .45, z: -1.02 });
    walk('走到主厅侧门前', { x: 1.15, y: .45, z: -1.02 });
    blocked('aldous-corridor', { x: 2.95, y: .45, z: -1.02 });
    toggle('aldous-corridor', true);
    walk('侧门进入走廊', { x: 2.95, y: .45, z: -1.02 });
  };
  const leave = () => {
    walk('走廊返回主厅', { x: 1.15, y: .45, z: -1.02 });
    walk('主厅返回内门前', { x: -.05, y: .45, z: -1.02 });
    walk('返回门厅', { x: -.05, y: .45, z: 2 });
    walk('穿正门返回前廊', { x: -.05, y: .45, z: 5.5 });
    walk('下台阶回前院', { x: -.05, y: 0, z: 10 }, porchFeet);
  };
  return { walk, blocked, toggle, enterCorridor, leave, get player() { return player; } };
}

const lowerFeet = (_x: number, z: number) => z >= -1.55 ? .45 : z <= -4.25 ? 2.3 : .45 + (-1.55 - z) * 1.85 / 2.7;
const upperFeet = (_x: number, z: number) => z <= -4.25 ? 2.3 : z >= -1.85 ? 4.15 : 2.3 + (z + 4.25) * 1.85 / 2.4;

test('前院经主厅侧门、走廊和两跑楼梯进入 Aldous 房间并原路返回，房门双向开关碰撞有效', () => {
  const r = fixture();
  r.enterCorridor();
  r.walk('进入走廊后避开侧门旋转范围', { x: 3.65, y: .45, z: -1.02 });
  r.toggle('aldous-corridor', false);
  r.blocked('aldous-corridor', { x: 1.15, y: .45, z: -1.02 });
  r.toggle('aldous-corridor', true);
  r.walk('离开侧门返回下跑楼梯中线', { x: 2.95, y: .45, z: -1.02 });
  r.walk('走廊沿下跑向北上楼', { x: 2.95, y: 2.3, z: -4.8 }, lowerFeet);
  r.walk('中间平台转弯', { x: 4.55, y: 2.3, z: -4.8 });
  r.walk('沿上跑向南上到门前', { x: 4.55, y: 4.15, z: -1.6 }, upperFeet);
  r.blocked('aldous', { x: 4.55, y: 4.15, z: 0 });
  r.toggle('aldous', true);
  r.walk('进入 Aldous 房间', { x: 4.55, y: 4.15, z: 0 });
  r.walk('沿家具旁通道走进房间', { x: 4.3, y: 4.15, z: 2.3 });
  r.walk('回到门内但留出门扇旋转范围', { x: 4.55, y: 4.15, z: .6 });
  r.toggle('aldous', false);
  r.blocked('aldous', { x: 4.55, y: 4.15, z: -1.6 });
  r.toggle('aldous', true);
  r.walk('房间回到门前平台', { x: 4.55, y: 4.15, z: -1.6 });
  r.walk('沿上跑下到中间平台', { x: 4.55, y: 2.3, z: -4.8 }, upperFeet);
  r.walk('中间平台返回另一跑', { x: 2.95, y: 2.3, z: -4.8 });
  r.walk('沿下跑回到主厅侧走廊', { x: 2.95, y: .45, z: -1.02 }, lowerFeet);
  r.leave();
});

test('Aldous 上层房间不会将其下方走廊或第一段楼梯上的玩家吸附至二楼', () => {
  const r = fixture();
  r.enterCorridor();
  assert.ok(r.player.z > -1.2 && r.player.y === .45, '走廊与上层房间平面重叠时仍站在一楼');
  r.walk('缓慢踏上第一跑的前半段', { x: 2.95, y: 1.375, z: -2.9 }, lowerFeet);
  assert.ok(r.player.y < ALDOUS.middle && r.player.y < ALDOUS.floor - 2, '第一跑中途不跳上中间平台或房间');
  r.walk('第一跑中途原路退回', { x: 2.95, y: .45, z: -1.02 }, lowerFeet);
  r.leave();
});
