import test from 'node:test';
import assert from 'node:assert/strict';
import { Raycaster, Vector3 } from 'three';
import { createAldousWing } from '../src/world/aldous.ts';
import { INTERIOR_SURFACES, ALDOUS } from '../src/world/interior-layout.ts';
import { moveOnSurfaces } from '../src/controls/surfaces.ts';

const close=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<.025,`${actual} should be ${expected}`);
const world=()=>({...createAldousWing(),surfaces:INTERIOR_SURFACES,groundHeight:()=>.45});

test('Aldous 两跑折返楼梯与房间保持连续往返，不跳层也不撞平台竖边',()=>{
  const scene=world();
  let player={x:2.45,y:.45,z:-1.02};
  const route=[
    {x:2.95,z:-1.02,y:.45},{x:2.95,z:-4.8,y:2.3},
    {x:4.55,z:-4.8,y:2.3},{x:4.55,z:-1.6,y:4.15},
    {x:4.55,z:.55,y:4.15},{x:4.3,z:1.5,y:4.15},
    {x:4.3,z:2.5,y:4.15},
  ];
  for(const stop of route){player=moveOnSurfaces(player,{x:stop.x-player.x,z:stop.z-player.z},scene);close(player.x,stop.x);close(player.z,stop.z);close(player.y,stop.y);}
  for(const stop of route.slice(0,-1).reverse()){player=moveOnSurfaces(player,{x:stop.x-player.x,z:stop.z-player.z},scene);close(player.x,stop.x);close(player.z,stop.z);close(player.y,stop.y);}
  player=moveOnSurfaces(player,{x:-.5,z:0},scene);close(player.x,2.45);close(player.y,.45);
});

test('折返楼梯扶手保护两跑之间的高差，北平台可以横向转弯',()=>{
  const scene=world();
  const onLower={x:2.95,y:.45+(-1.55+2.9)/2.7*1.85,z:-2.9};
  const blocked=moveOnSurfaces(onLower,{x:2,z:0},scene);
  assert.ok(blocked.x<3.32,`不应穿越扶手：${blocked.x}`);
  const turn=moveOnSurfaces({x:2.95,y:2.3,z:-4.8},{x:1.6,z:0},scene);
  close(turn.x,4.55);close(turn.y,2.3);
});

test('Aldous 门洞与楼板有真实几何，楼梯上方没有封闭楼板',()=>{
  const {group}=createAldousWing();group.updateMatrixWorld(true);
  const floor=new Raycaster(new Vector3(4.3,5,-.4),new Vector3(0,-1,0),0,2).intersectObject(group,true)[0];
  assert.ok(floor&&Math.abs(floor.point.y-ALDOUS.floor)<.03);
  const door=new Raycaster(new Vector3(4.5,5.6,-1.7),new Vector3(0,0,1),0,1).intersectObject(group,true);
  assert.equal(door.length,0,'真实门洞不能用实心墙遮挡');
  const stair=new Raycaster(new Vector3(2.95,6,-3),new Vector3(0,-1,0),0,6).intersectObject(group,true)[0];
  assert.ok(stair&&stair.point.y<2.1&&stair.point.y>1,'第一跑头顶应挑空');
});

test('蓝色内墙保留塔楼原有前窗和东窗，房间不变成封闭暗箱',()=>{
  const {group}=createAldousWing();group.updateMatrixWorld(true);
  const front=new Raycaster(new Vector3(3.7,6.6,3.3),new Vector3(0,0,1),0,1).intersectObject(group,true);
  const east=new Raycaster(new Vector3(4.5,6.6,1.8),new Vector3(1,0,0),0,1).intersectObject(group,true);
  assert.equal(front.length,0);assert.equal(east.length,0);
});

test('Aldous 家具分层碰撞，正下方一楼过厅仍能通行',()=>{
  const scene=world();
  for(const c of scene.colliders)assert.ok(Number.isFinite(c.minY)&&Number.isFinite(c.maxY)&&c.maxY!>c.minY!);
  const below=moveOnSurfaces({x:3.1,y:.45,z:2.4},{x:1.5,z:0},scene);
  close(below.x,4.6);close(below.y,.45);
  const dresser=moveOnSurfaces({x:2.95,y:4.15,z:2.1},{x:0,z:1.5},scene);
  assert.ok(dresser.z<3,'三屉柜应阻挡玩家');
  const opening=moveOnSurfaces({x:4.55,y:4.15,z:-1.6},{x:0,z:1.6},scene);
  close(opening.z,0);
});
