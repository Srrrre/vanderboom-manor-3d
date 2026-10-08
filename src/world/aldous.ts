import * as THREE from 'three';
import { batchStatic, box, wall } from './architecture.ts';
import { ALDOUS, INTERIOR, doorOpening } from './interior-layout.ts';
import type { Collider, WorldPart } from './types.ts';

/** Aldous 的蓝色房间与塔楼后侧折返楼梯；所有坐标共用建筑配置。 */
export function createAldousWing(): WorldPart {
  const group=new THREE.Group();group.name='aldous-wing';
  const colliders:Collider[]=[];
  const mat=(color:number,roughness=.86)=>new THREE.MeshStandardMaterial({color,roughness});
  const m={blue:mat(0x6d8193),wood:mat(0x806049),dark:mat(0x3a3432),floor:mat(0x8a7966),seam:mat(0x6a5c50),cream:mat(0xd5d0b5),rose:mat(0xb18e7f),brass:mat(0x9e8a60),wall:mat(0xb8b8a4),roof:mat(0x596f6c),white:mat(0xd2d1c4),grey:mat(0x737875),black:mat(0x292e2d)};
  const makeGroup=(name:string)=>{const g=new THREE.Group();g.name=name;group.add(g);return g;};
  const shell=makeGroup('aldous-stair-bay-shell'),stairs=makeGroup('aldous-two-run-stair'),room=makeGroup('aldous-room');
  const cube=(p:THREE.Group,w:number,h:number,d:number,x:number,y:number,z:number,material:THREE.Material=m.wood)=>box(p,w,h,d,x,y,z,material);
  const solid=(x0:number,x1:number,z0:number,z1:number,bottom:number,top:number)=>colliders.push({type:'box',minX:x0,maxX:x1,minZ:z0,maxZ:z1,minY:bottom,maxY:top});
  const cylinder=(p:THREE.Group,r:number,h:number,x:number,y:number,z:number,material:THREE.Material=m.wood,top=r,n=12)=>{const a=new THREE.Mesh(new THREE.CylinderGeometry(top,r,h,n),material);a.position.set(x,y,z);p.add(a);return a;};
  const sphere=(p:THREE.Group,r:number,x:number,y:number,z:number,material:THREE.Material=m.wood)=>{const a=new THREE.Mesh(new THREE.SphereGeometry(r,10,6),material);a.position.set(x,y,z);p.add(a);return a;};
  const beam=(p:THREE.Group,a:THREE.Vector3,b:THREE.Vector3,w:number,material:THREE.Material=m.dark)=>{const direction=b.clone().sub(a),mesh=cube(p,w,direction.length(),w,0,0,0,material);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());return mesh;};
  const item=(x:number,y:number,z:number,rotation=0)=>{const p=new THREE.Group();p.position.set(x,y,z);p.rotation.y=rotation;room.add(p);return p;};
  const floor=(p:THREE.Group,b:{minX:number;maxX:number;minZ:number;maxZ:number},top:number,collision=true,visualThickness=.18)=>{
    const {minX:a,maxX:b1,minZ:c,maxZ:d}=b;
    cube(p,b1-a,visualThickness,d-c,(a+b1)/2,top-visualThickness/2,(c+d)/2,m.floor);
    if(collision)solid(a,b1,c,d,top-.18,top);
    const n=Math.ceil((b1-a)/.29),w=(b1-a)/n;
    for(let i=1;i<n;i++)cube(p,.009,.012,d-c,a+i*w,top+.003,(c+d)/2,m.seam);
  };
  floor(shell,ALDOUS.bay,INTERIOR.ground);
  floor(stairs,ALDOUS.middleLanding,ALDOUS.middle,false);
  // 顶平台视觉覆盖完整；实体竖边后退半径，脚底坡道在最后一步能够平顺接台。
  solid(ALDOUS.middleLanding.minX,ALDOUS.middleLanding.maxX,ALDOUS.middleLanding.minZ,ALDOUS.middleLanding.maxZ-.30,ALDOUS.middle-.18,ALDOUS.middle);
  floor(stairs,ALDOUS.upperLanding,ALDOUS.floor,false);
  solid(ALDOUS.upperLanding.minX,ALDOUS.upperLanding.maxX,ALDOUS.upperLanding.minZ+.30,ALDOUS.upperLanding.maxZ,ALDOUS.floor-.18,ALDOUS.floor);
  // 房间板底与既有过厅天花错开，避免共面闪烁；支撑面和碰撞高度保持不变。
  floor(room,{minX:2.1,maxX:5.4,minZ:-1.2,maxZ:4},ALDOUS.floor,true,.16);
  cube(room,3.18,.16,4.96,3.69,ALDOUS.ceiling+.08,1.28,m.cream);
  solid(2.1,5.4,-1.2,4,ALDOUS.ceiling,ALDOUS.ceiling+.16);

  // 后扩仅包住侧梯，占地 3.3×5.3 米；塔楼原有前立面及窗洞由 manor 保留。
  wall(shell,colliders,{axis:'z',fixed:2.22,from:-5.5,to:-5,bottom:0,top:7.95,thickness:.24},m.wall);
  wall(shell,colliders,{axis:'z',fixed:5.28,from:-5.5,to:-.2,bottom:0,top:7.95,thickness:.24},m.wall);
  const northWindow={center:3.75,width:1.5,bottom:3.95,top:5.65};
  wall(shell,colliders,{axis:'x',fixed:-5.38,from:2.1,to:5.4,bottom:0,top:7.95,thickness:.24,openings:[northWindow]},m.wall);
  for(const x of [2.95,4.55])cube(shell,.1,1.88,.18,x,4.8,-5.4,m.rose);
  for(const y of [3.9,5.7])cube(shell,1.6,.1,.18,3.75,y,-5.4,m.rose);
  cube(shell,.055,1.7,.12,3.75,4.8,-5.415,m.cream);cube(shell,1.5,.055,.12,3.75,4.8,-5.415,m.cream);
  const glass=new THREE.MeshStandardMaterial({color:0xb0c3c3,transparent:true,opacity:.13,roughness:.25,depthWrite:false,side:THREE.DoubleSide});
  cube(shell,1.5,1.7,.018,3.75,4.8,-5.4,glass);solid(3,4.5,-5.45,-5.35,3.95,5.65);
  const shape=new THREE.Shape();shape.moveTo(-1.83,0);shape.lineTo(1.83,0);shape.lineTo(0,.85);shape.closePath();
  const roof=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:5.65,steps:1,bevelEnabled:false}),m.roof);roof.position.set(3.75,7.95,-5.7);shell.add(roof);
  cube(shell,3.64,.12,5.7,3.75,7.94,-2.875,m.cream);
  cube(shell,.14,.12,5.72,3.75,8.81,-2.875,m.dark);

  const buildRun=(spec:typeof ALDOUS.lowerStair|typeof ALDOUS.upperStair,startY:number,endY:number,northwards:boolean)=>{
    const n=spec.steps,run=(spec.maxZ-spec.minZ)/n,rise=(endY-startY)/n;
    const midX=(spec.minX+spec.maxX)/2,width=spec.maxX-spec.minX;
    for(let i=0;i<n;i++){
      const z=northwards?spec.maxZ-(i+.5)*run:spec.minZ+(i+.5)*run,top=startY+(i+1)*rise;
      cube(stairs,width,top-.45,run,midX,(top+.45)/2,z,m.wood);
      cube(stairs,width+.025,.045,run+.012,midX,top-.0225,z,i%2?m.floor:m.wood);
      const safeTop=startY+i*rise-.28*rise/run-.085;
      if(safeTop>.45)solid(spec.minX,spec.maxX,z-run/2,z+run/2,.45,safeTop);
      for(const x of [spec.minX-.025,spec.maxX+.025]){
        cube(stairs,.046,.94,.046,x,top+.44,z,m.dark);
        solid(x-.035,x+.035,z-run/2,z+run/2,startY+i*rise-.02,top+1.03);
      }
    }
    for(const x of [spec.minX-.025,spec.maxX+.025]){
      const startZ=northwards?spec.maxZ:spec.minZ,endZ=northwards?spec.minZ:spec.maxZ;
      beam(stairs,new THREE.Vector3(x,startY+1.05,startZ),new THREE.Vector3(x,endY+1.05,endZ),.075,m.wood);
    }
  };
  buildRun(ALDOUS.lowerStair,.45,2.3,true);buildRun(ALDOUS.upperStair,2.3,4.15,false);
  // 中间平台四边由外墙及两条梯侧扶手保护，梯口保持完全开放。
  const rail=(x:number,z0:number,z1:number,y:number)=>{
    cube(stairs,.08,.08,z1-z0,x,y+1,(z0+z1)/2,m.wood);
    for(let z=z0;z<=z1+.001;z+=.2)cube(stairs,.045,.96,.045,x,y+.49,z,m.dark);
    solid(x-.045,x+.045,z0,z1,y,y+1.05);
  };
  rail(3.91,-1.85,-1.25,4.15);
  // 上平台左侧下方仍属于一层；高度范围不能把侧走廊封死。
  cube(stairs,.08,.1,.6,3.91,4.2,-1.55,m.dark);

  wall(room,colliders,{axis:'x',fixed:-1.2,from:2.1,to:5.4,bottom:4.15,top:7.82,thickness:.16,openings:[doorOpening('aldous')]},m.blue);
  const door=doorOpening('aldous');
  for(const x of [door.center-door.width/2-.045,door.center+door.width/2+.045])cube(room,.09,2.75,.23,x,5.525,-1.2,m.wood);
  cube(room,door.width+.18,.13,.23,door.center,6.86,-1.2,m.wood);
  // 仅薄饰面：为两扇原立面窗使用相同洞口，不给窗内添加背板。
  wall(room,[],{axis:'z',fixed:2.114,from:-1.08,to:3.76,bottom:4.15,top:7.82,thickness:.012},m.blue);
  wall(room,[],{axis:'x',fixed:3.749,from:2.22,to:5.16,bottom:4.15,top:7.82,thickness:.012,openings:[{center:3.7,width:.97,bottom:5.575,top:7.625}]},m.blue);
  wall(room,[],{axis:'z',fixed:5.149,from:-1.08,to:3.76,bottom:4.15,top:7.82,thickness:.012,openings:[{center:1.8,width:.87,bottom:5.775,top:7.425}]},m.blue);
  for(const x of [3.165,4.235])cube(room,.085,2.2,.07,x,6.6,3.715,m.rose);
  for(const y of [5.52,7.68])cube(room,1.15,.085,.07,3.7,y,3.715,m.rose);
  for(const z of [1.315,2.285])cube(room,.07,1.8,.085,5.113,6.6,z,m.rose);
  for(const y of [5.72,7.48])cube(room,.07,.085,1.06,5.113,y,1.8,m.rose);
  cube(room,2.95,.12,.07,3.69,4.23,3.71,m.rose);cube(room,.07,.12,4.84,2.15,4.23,1.34,m.rose);cube(room,.07,.12,4.84,5.11,4.23,1.34,m.rose);
  for(const z of [-.7,3.1]){
    beam(room,new THREE.Vector3(2.2,6.8,z),new THREE.Vector3(3.62,7.77,z),.16,m.dark);
    beam(room,new THREE.Vector3(5.12,6.8,z),new THREE.Vector3(3.7,7.77,z),.16,m.dark);
  }
  cube(room,.12,.13,4.75,3.66,7.73,1.3,m.dark);

  // 参考左视角：粉棕三屉柜与双铃小闹钟，不使用任何截图贴图。
  const dresser=item(2.98,4.15,3.36);
  cube(dresser,.82,.99,.5,0,.53,0,m.rose);cube(dresser,.9,.065,.55,0,1.05,0,m.wood);
  for(const y of [.25,.56,.87]){cube(dresser,.71,.26,.045,0,y,-.272,m.rose);cube(dresser,.23,.035,.045,0,y,-.307,m.dark);}
  for(const x of [-.3,.3])cube(dresser,.1,.14,.44,x,.07,0,m.wood);
  solid(2.53,3.43,3.06,3.64,4.15,5.24);
  const clock=cylinder(dresser,.13,.07,-.14,1.25,0,m.dark,.13,16);clock.rotation.x=Math.PI/2;
  const face=cylinder(dresser,.111,.015,-.14,1.25,-.044,m.cream,.111,16);face.rotation.x=Math.PI/2;
  for(const x of [-.23,-.05])sphere(dresser,.063,x,1.37,0,m.grey);
  cube(dresser,.015,.082,.018,-.14,1.276,-.057,m.dark);cube(dresser,.052,.013,.018,-.164,1.25,-.057,m.dark);
  cylinder(dresser,.045,.12,.21,1.14,-.04,m.brass,.025);sphere(dresser,.032,.21,1.235,-.04,m.cream);

  // 白色竖褶木框只还原屏帘的可见结构；不臆测屏帘后面的床型。
  const screen=item(2.45,4.15,1.35,Math.PI/2);
  for(const x of [-.86,.86]){cube(screen,.1,1.98,.14,x,1,0,m.wood);cube(screen,.17,.09,.19,x,2.03,0,m.rose);cube(screen,.18,.12,.22,x,.08,0,m.wood);}
  for(const y of [.18,.4,1.86])cube(screen,1.76,.12,.13,0,y,0,m.wood);
  cube(screen,1.62,1.36,.038,0,1.13,0,m.white);
  for(let i=0;i<13;i++)cube(screen,.03,1.34,.025,-.75+i*.125,1.13,.034,i%2?m.cream:m.grey);
  cube(screen,1.7,.055,.055,0,1.77,.07,m.rose);
  solid(2.32,2.62,.4,2.3,4.15,6.23);

  // 单柱小圆桌与碗靠屏帘放置，入口到窗边仍留一米以上的通路。
  const table=item(3.4,4.15,2.16);
  cylinder(table,.30,.06,0,.77,0,m.cream);cylinder(table,.16,.08,0,.05,0,m.cream,.22);
  cylinder(table,.11,.62,0,.40,0,m.cream,.055);sphere(table,.083,0,.66,0,m.cream);
  cylinder(table,.072,.052,.08,.827,0,m.cream,.105);cylinder(table,.089,.008,.08,.857,0,m.grey);
  colliders.push({type:'circle',x:3.4,z:2.16,radius:.30,minY:4.15,maxY:5});

  // 参考右视角衣帽架：两横杆、垂挂衣物、帽子及伞。保持靠墙摆放。
  const rack=item(4.9,4.15,3.04,Math.PI/2);
  for(const x of [-.38,.38]){cube(rack,.05,1.6,.05,x,.84,0,m.rose);sphere(rack,.045,x,1.68,0,m.wood);cube(rack,.09,.07,.39,x,.055,0,m.wood);}
  for(const y of [.84,1.43])cube(rack,.78,.045,.045,0,y,0,m.wood);
  cube(rack,.31,.38,.035,-.19,1.24,-.026,m.white);cube(rack,.27,.31,.045,.18,1.27,-.015,m.grey);cube(rack,.3,.36,.045,-.1,.66,-.022,m.wood);
  cylinder(rack,.11,.025,.35,1.57,0,m.dark);cylinder(rack,.079,.15,.35,1.66,0,m.black);
  cylinder(rack,.016,.55,.37,.65,.065,m.cream);cylinder(rack,.045,.25,.37,.53,.065,m.grey,.008,6);
  solid(4.69,5.11,2.6,3.49,4.15,5.93);

  // 入口旁双层杯柜来自第三张截图，避开房门整个转动范围。
  const cabinet=item(2.67,4.15,-.7);
  cube(cabinet,.57,.76,.34,0,.42,0,m.rose);cube(cabinet,.62,.07,.39,0,.83,0,m.wood);
  for(const x of [-.3,.3])cube(cabinet,.045,.52,.35,x,1.09,0,m.wood);
  cube(cabinet,.64,.06,.37,0,1.36,0,m.wood);cube(cabinet,.57,.5,.027,0,1.09,-.16,m.rose);
  for(const x of [-.145,.145]){cube(cabinet,.25,.62,.025,x,.43,.186,m.rose);cube(cabinet,.012,.10,.021,x*.28,.43,.21,m.dark);}
  cylinder(cabinet,.09,.11,0,.923,.06,m.cream,.11);for(const x of [-.11,.11]){const handle=new THREE.Mesh(new THREE.TorusGeometry(.046,.011,4,8),m.brass);handle.position.set(x,.94,.06);cabinet.add(handle);}
  solid(2.32,3.02,-.91,-.48,4.15,5.55);
  for(const p of [shell,stairs,room])batchStatic(p);
  return {group,colliders};
}
