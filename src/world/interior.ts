import * as THREE from 'three';
import { batchStatic, box, wall } from './architecture.ts';
import { INTERIOR, doorOpening } from './interior-layout.ts';
import type { Collider, WorldPart } from './types.ts';

/** 全部物件由简洁几何构成；不使用游戏贴图或人物素材。 */
export function createInterior(): WorldPart {
  const group = new THREE.Group(); group.name = 'manor-interior';
  const colliders: Collider[] = [];
  const material = (color: number, roughness = .83, metalness = 0) => new THREE.MeshStandardMaterial({color, roughness, metalness});
  const m = {
    green: material(0x63736b), pale: material(0xa7b09d), grey: material(0x979b92),
    wood: material(0x665043), dark: material(0x413932), honey: material(0x967556),
    floor: material(0x806b54), floorLight: material(0x8b765f), floorDark: material(0x74604c),
    cream: material(0xd7d3bb), linen: material(0xc4c5b3), pink: material(0xa2797b),
    velvet: material(0x69785c), red: material(0x6d5552), iron: material(0x353b3a,.65,.25),
    brass: material(0x9b8860,.49,.4), black: material(0x272e2e), art: material(0x7d8980),
    glow: new THREE.MeshStandardMaterial({color:0xead7a6,emissive:0xc99556,emissiveIntensity:.28,roughness:.8}),
  };
  const room = (name: string) => {const g = new THREE.Group(); g.name = name; group.add(g); return g;};
  const floors = room('floor-and-ceiling');
  const foyer = room('foyer');
  const kitchen = room('kitchen');
  const living = room('living');
  const dining = room('dining');
  const upper = room('upper-bedroom');
  const stairs = room('stair-and-gallery');
  const east = room('east-passage');
  const cube = (p: THREE.Group, w:number,h:number,d:number,x:number,y:number,z:number, mat = m.wood) => box(p,w,h,d,x,y,z,mat);
  const cylinder = (p:THREE.Group,r:number,h:number,x:number,y:number,z:number,mat=m.wood,top=r,segments=12) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top,r,h,segments),mat);
    mesh.position.set(x,y,z); mesh.castShadow=mesh.receiveShadow=true;p.add(mesh);return mesh;
  };
  const sphere = (p:THREE.Group,r:number,x:number,y:number,z:number,mat=m.brass) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r,10,6),mat);mesh.position.set(x,y,z);p.add(mesh);return mesh;
  };
  const solid = (x:number,z:number,w:number,d:number,minY:number,maxY:number) => colliders.push({type:'box',minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY,maxY});
  const footprint = (x:number,z:number,w:number,d:number,y:number,h:number,rotation=0) => {
    const c=Math.abs(Math.cos(rotation)),s=Math.abs(Math.sin(rotation));solid(x,z,w*c+d*s,d*c+w*s,y,y+h);
  };
  const object = (p:THREE.Group,x:number,y:number,z:number,rotation=0) => {const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rotation;p.add(g);return g;};
  const beam = (p:THREE.Group,a:THREE.Vector3,b:THREE.Vector3,width:number,mat=m.wood) => {
    const v=b.clone().sub(a), mesh=cube(p,width,v.length(),width,0,0,0,mat);
    mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return mesh;
  };
  const slab = (x0:number,x1:number,z0:number,z1:number,top:number,mat=m.floor,collision=true) => {
    cube(floors,x1-x0,.18,z1-z0,(x0+x1)/2,top-.09,(z0+z1)/2,mat);
    if(collision)solid((x0+x1)/2,(z0+z1)/2,x1-x0,z1-z0,top-.18,top);
  };
  const planks = (x0:number,x1:number,z0:number,z1:number,y:number) => {
    // 细缝与轻微色差形成木地板，无纹理采样成本；同材质最后合批。
    const count=Math.ceil((x1-x0)/.29),width=(x1-x0)/count;
    for(let i=0;i<count;i++) {
      const mat=i%5===0?m.floorDark:i%3===0?m.floorLight:m.floor;
      cube(floors,width-.009,.012,z1-z0,x0+width*(i+.5),y+.003,(z0+z1)/2,mat);
      for(let j=0;j<3;j++) {
        const z=z0+.7+((i%3)*.45)+j*1.8;
        if(z<z1)cube(floors,width-.005,.014,.009,x0+width*(i+.5),y+.005,z,m.floorDark);
      }
    }
  };
  slab(-5.4,2.1,-3.8,4,.45); slab(2.1,5.4,-.2,4,.45);slab(5.4,10.6,-2.8,4,.45);
  planks(-5.16,1.86,-3.56,3.76,.45);planks(2.22,5.28,-.08,3.76,.45);planks(5.52,10.36,-2.56,3.76,.45);
  // 绝不整块封闭二楼：北侧楼梯与中庭仍然挑空。
  slab(-5.16,-3.8,-3.56,3.76,4.15,m.floor,false);slab(-3.85,1.86,-.45,3.76,4.15);
  // 楼梯顶端的板边碰撞后退一个玩家半径，避免脚未升到平台时胸部先撞竖边。
  // 可见楼板与可站立表面不缩小；其余栏廊板体仍保留完整厚度碰撞。
  solid((-5.16-4.09)/2,(-3.56-2.15)/2,1.07,1.41,3.97,4.15);
  solid((-5.16-3.8)/2,(-2.15+3.76)/2,1.36,5.91,3.97,4.15);
  planks(-5.16,-3.8,-3.56,3.76,4.15);planks(-3.85,1.86,-.45,3.76,4.15);
  const ceiling=(x0:number,x1:number,z0:number,z1:number,bottom:number)=>{
    cube(floors,x1-x0,.18,z1-z0,(x0+x1)/2,bottom+.09,(z0+z1)/2,m.cream);
    solid((x0+x1)/2,(z0+z1)/2,x1-x0,z1-z0,bottom,bottom+.18);
  };
  ceiling(-5.16,1.86,-3.56,3.76,8.04);ceiling(2.22,5.28,-.08,3.76,3.97);ceiling(5.52,10.36,-2.56,3.76,3.35);

  wall(kitchen,colliders,{axis:'z',fixed:-1.5,from:.55,to:3.76,bottom:.45,top:3.97,thickness:.16,openings:[doorOpening('kitchen')]},m.grey);
  wall(living,colliders,{axis:'x',fixed:.55,from:-5.16,to:1.86,bottom:.45,top:3.97,thickness:.16,openings:[doorOpening('living')]},m.green);
  wall(upper,colliders,{axis:'z',fixed:-3.7,from:-.45,to:3.76,bottom:4.15,top:8.04,thickness:.16,openings:[doorOpening('bedroom')]},m.green);
  wall(upper,colliders,{axis:'x',fixed:-.45,from:-3.7,to:1.86,bottom:4.15,top:8.04,thickness:.16},m.green);
  const frame=(p:THREE.Group,x:number,z:number,y:number,width:number,height:number,rotation=0)=>{
    const g=object(p,x,y,z,rotation);
    for(const sx of [-1,1])cube(g,.105,height+.1,.22,sx*(width/2+.055),height/2,0,m.cream);
    cube(g,width+.22,.15,.22,0,height+.04,0,m.cream);
    cube(g,width+.29,.055,.26,0,height+.14,0,m.wood);
  };
  frame(foyer,-.05,.55,.45,doorOpening('living').width,2.65);
  frame(foyer,-1.5,2,.45,doorOpening('kitchen').width,2.65,Math.PI/2);
  frame(upper,-3.7,1.55,4.15,doorOpening('bedroom').width,2.65,Math.PI/2);
  // 内墙踢脚、腰线避开门洞，外立面窗的位置完全交由外壳模块维护。
  for(const [x,w] of [[-3,4.14],[1.32,1.08]])for(const y of [.57,1.35])cube(living,w,.1,.045,x,y,.447,m.wood);
  for(const [z,d]of [[.915,.73],[3.215,1.09]])for(const y of [.57,1.35])cube(foyer,.04,.1,d,-1.397,y,z,m.wood);
  for(const y of [4.27,5.12,7.89])cube(upper,5.48,.1,.045,-.88,y,-.347,m.wood);
  for(const [z,d]of [[.19,1.28],[3.015,1.49]])for(const y of [4.27,5.12,7.89])cube(upper,.045,.1,d,-3.599,y,z,m.wood);

  const chair=(p:THREE.Group,x:number,y:number,z:number,rotation=0,upholstery=m.velvet,arms=false)=>{
    const g=object(p,x,y,z,rotation),w=arms?.8:.52,d=arms?.75:.56;
    for(const sx of [-1,1])for(const sz of [-1,1])cube(g,.065,.46,.065,sx*(w/2-.08),.23,sz*(d/2-.07),m.dark);
    cube(g,w,.1,d,0,.48,0,m.wood);cube(g,w-.05,.12,d-.04,0,.565,0,upholstery);
    cube(g,w,.72,.105,0,.92,-d/2+.04,m.wood);cube(g,w-.11,.55,.065,0,.94,-d/2+.105,upholstery);
    if(arms)for(const sx of [-1,1]){cube(g,.1,.42,.1,sx*(w/2-.03),.71,d/2-.09,m.wood);cube(g,.12,.13,d,sx*(w/2-.03),.91,0,upholstery);}
    footprint(x,z,w,d,y,1.3,rotation);
  };
  const table=(p:THREE.Group,x:number,y:number,z:number,w:number,d:number,rotation=0,cloth=false)=>{
    const g=object(p,x,y,z,rotation);
    for(const sx of [-1,1])for(const sz of [-1,1]){cube(g,.09,.73,.09,sx*(w/2-.14),.365,sz*(d/2-.14),m.dark);cube(g,.13,.055,.13,sx*(w/2-.14),.07,sz*(d/2-.14),m.wood);}
    cube(g,w,.12,d,0,.77,0,m.wood);cube(g,w-.15,.13,d-.15,0,.65,0,m.wood);
    if(cloth){cube(g,w+.04,.022,d+.04,0,.842,0,m.linen);for(const sx of [-1,1])cube(g,.023,.27,d+.04,sx*(w/2+.014),.712,0,m.linen);for(const sz of [-1,1])cube(g,w+.04,.27,.023,0,.712,sz*(d/2+.014),m.linen);}
    footprint(x,z,w,d,y,.85,rotation);return g;
  };
  const roundTable=(p:THREE.Group,x:number,y:number,z:number,r=.36)=>{
    const g=object(p,x,y,z);
    cylinder(g,r,.07,0,.76,0,m.wood);cylinder(g,.08,.64,0,.4,0,m.dark,.11);
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;beam(g,new THREE.Vector3(0,.17,0),new THREE.Vector3(Math.cos(a)*r*.82,.08,Math.sin(a)*r*.82),.09,m.wood);}
    colliders.push({type:'circle',x,z,radius:r,minY:y,maxY:y+.8});return g;
  };
  const picture=(p:THREE.Group,x:number,y:number,z:number,w:number,h:number,rotation=0)=>{
    const g=object(p,x,y,z,rotation);cube(g,w,.07,.04,0,h/2,0,m.brass);cube(g,w,.07,.04,0,-h/2,0,m.brass);
    for(const sx of [-1,1])cube(g,.06,h,.04,sx*w/2,0,0,m.brass);
    cube(g,w-.08,h-.08,.018,0,0,-.01,m.art);
    cylinder(g,.14,.012,0,.06,.006,m.grey,.14,16).rotation.x=Math.PI/2;
    cube(g,w*.4,h*.27,.012,0,-h*.24,.013,m.dark);
  };
  const chandelier=(p:THREE.Group,x:number,z:number,top:number,bottom:number,r=.36)=>{
    cylinder(p,.025,top-bottom,x,(top+bottom)/2,z,m.brass);
    sphere(p,.09,x,bottom,z,m.brass);
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5,tx=x+Math.cos(a)*r,tz=z+Math.sin(a)*r;
      beam(p,new THREE.Vector3(x,bottom+.1,z),new THREE.Vector3(tx,bottom-.1,tz),.035,m.brass);
      cylinder(p,.055,.055,tx,bottom-.07,tz,m.brass,.08);cylinder(p,.028,.15,tx,bottom+.03,tz,m.cream);sphere(p,.034,tx,bottom+.135,tz,m.glow);
    }
  };
  const vase=(p:THREE.Group,x:number,y:number,z:number)=>{
    cylinder(p,.09,.2,x,y+.1,z,m.cream,.045);cylinder(p,.048,.06,x,y+.23,z,m.cream,.06);
    for(let i=0;i<3;i++){const a=i*2.1;beam(p,new THREE.Vector3(x,y+.24,z),new THREE.Vector3(x+Math.cos(a)*.08,y+.5+i*.03,z+Math.sin(a)*.08),.012,m.green);sphere(p,.045,x+Math.cos(a)*.08,y+.5+i*.03,z+Math.sin(a)*.08,m.pale);}
  };
  const cabinet=(p:THREE.Group,x:number,y:number,z:number,w:number,h:number,d:number,rotation=0)=>{
    const g=object(p,x,y,z,rotation);cube(g,w,h,d,0,h/2,0,m.dark);
    cube(g,w+.1,.09,d+.05,0,h+.02,0,m.wood);cube(g,w+.06,.11,d+.04,0,.09,0,m.wood);
    for(const sx of [-1,1]){cube(g,w/2-.035,h-.24,.035,sx*w/4,h/2+.02,d/2+.016,m.wood);sphere(g,.025,sx*.075,h/2+.04,d/2+.055,m.brass);}
    footprint(x,z,w,d,y,h+.07,rotation);return g;
  };

  // 门厅：圆桌保持在正门路线右侧；门扇旋转范围内不摆物件。
  const foyerTable=roundTable(foyer,1.1,.45,2.6,.37);vase(foyerTable,0,.81,0);
  picture(foyer,-1.397,2.24,.99,.48,.68,Math.PI/2);
  chandelier(foyer,.45,2.15,3.96,3.08,.33);
  cube(foyer,1.18,.012,1.75,.05,.468,2.18,m.red);
  cube(foyer,.96,.014,1.52,.05,.47,2.18,m.green);

  // 厨房：灰墙、粗木桌、木椅、铸铁炉与少量餐具。
  const kitchenTable=table(kitchen,-3.48,.45,2.54,1.15,.73);
  chair(kitchen,-3.45,.45,3.34,Math.PI,m.wood);
  cylinder(kitchenTable,.135,.015,-.21,.844,0,m.cream,.135,16);
  cylinder(kitchenTable,.08,.14,.23,.91,.07,m.grey,.085);
  const stove=object(kitchen,-4.61,.45,1.12);
  cube(stove,.68,.7,.58,0,.42,0,m.iron);cube(stove,.77,.07,.67,0,.8,0,m.black);
  for(const sx of [-1,1])for(const sz of [-1,1])cube(stove,.07,.13,.07,sx*.26,.065,sz*.21,m.iron);
  cube(stove,.38,.29,.032,0,.43,.307,m.black);cube(stove,.23,.035,.045,0,.47,.338,m.brass);
  for(const sx of [-1,1])cylinder(stove,.14,.012,sx*.2,.843,0,m.iron);
  cylinder(stove,.095,2.26,-.19,1.96,-.14,m.iron);
  cylinder(stove,.14,.18,.2,.94,0,m.grey,.12);
  footprint(-4.61,1.12,.8,.7,.45,3.12);
  cabinet(kitchen,-3.22,.45,.92,1.3,.84,.43);
  for(const y of [2.41,2.96]){cube(kitchen,1.5,.07,.29,-3.2,y,.8,m.wood);for(const x of [-3.73,-2.67])cube(kitchen,.05,.21,.24,x,y-.12,.775,m.dark);}
  for(let i=0;i<4;i++)cylinder(kitchen,.075,.17,-3.69+i*.28,2.535,.8,i%2?m.cream:m.grey,.065);
  picture(kitchen,-1.607,2.35,3.23,.49,.65,-Math.PI/2);
  chandelier(kitchen,-3.35,2.35,3.96,3.19,.29);

  // 主客厅：挑空厅粉色扶手椅与壁炉客厅元素的压缩空间重建。
  cube(living,3,.015,1.42,-2.65,.47,-.79,m.red);cube(living,2.74,.017,1.16,-2.65,.471,-.79,m.cream);cube(living,2.53,.019,.96,-2.65,.472,-.79,m.green);
  chair(living,-2.6,.45,-.58,-.27,m.pink,true);
  const side=roundTable(living,-3.65,.45,-.53,.3);vase(side,0,.81,0);
  const fireplace=object(living,-4.95,.45,-.91,Math.PI/2);
  cube(fireplace,1.57,.11,.5,0,.055,.1,m.cream);cube(fireplace,1.28,1.16,.25,0,.69,-.075,m.cream);
  cube(fireplace,.77,.83,.04,0,.52,.073,m.black);
  for(const sx of [-1,1]){cube(fireplace,.22,1.03,.31,sx*.58,.57,.03,m.cream);cube(fireplace,.28,.12,.37,sx*.58,1.04,.07,m.cream);}
  cube(fireplace,1.57,.14,.48,0,1.21,.055,m.cream);cube(fireplace,1.7,.065,.53,0,1.31,.055,m.cream);
  for(const sx of [-1,1]){const log=cylinder(fireplace,.07,.44,sx*.12,.2,.16,m.wood);log.rotation.z=Math.PI/2;}
  footprint(-4.95,-.91,1.7,.59,.45,1.38,Math.PI/2);
  cabinet(living,-4.7,.45,-1.99,.66,1.94,.5,Math.PI/2);
  picture(living,-3.28,2.44,.447,.93,1.02,Math.PI);
  chandelier(living,-1.55,-1.13,8.03,5.93,.54);

  // 北侧20级实心木楼梯；动态脚底使用外部坡道，几何保留真实踏步。
  const {stair}=INTERIOR,run=(stair.maxX-stair.minX)/stair.steps,rise=(INTERIOR.upper-INTERIOR.ground)/stair.steps;
  for(let i=0;i<stair.steps;i++){
    const eastX=stair.maxX-i*run,westX=eastX-run,x=(eastX+westX)/2,top=.45+(i+1)*rise;
    cube(stairs,run,top-.45,1.35,x,(top+.45)/2,-2.825,m.wood);
    cube(stairs,run+.017,.045,1.37,x,top-.0225,-2.825,i%2?m.floor:m.honey);
    // 玩家圆柱半径会提前接触相邻高一级柱体，按坡度留足脚底净空。
    const underTop=.45+i*rise-.28*rise/run-.085;
    if(underTop>.45)solid(x,-2.825,run,1.35,.45,underTop);
    const railX=Math.min(x,1.33),base=.45+(1.55-railX)/5.35*3.7;
    if(i===0)continue;
    for(const z of [-3.47,-2.18]){
      // 南侧低端缩短一级，让靠东墙的玩家可从主厅转入楼梯。
      if(z===-2.18 && i===1)continue;
      cube(stairs,.045,.92,.045,railX,base+.48,z,m.dark);
      cylinder(stairs,.038,.1,railX,base+.48,z,m.honey,.038,8);
      // 每段高度随楼梯上升，楼下仍可进入足够高的梯底空间。
      solid(x,z,run+.012,.075,.45+i*rise-.02,top+1.02);
    }
  }
  for(const z of [-3.47,-2.18]){
    const start=z===-2.18?1.015:1.3,startY=.45+(1.55-start)/5.35*3.7+.97;
    beam(stairs,new THREE.Vector3(start,startY,z),new THREE.Vector3(-3.78,5.13,z),.08,m.wood);
    for(const x of [start,-3.78]){const y=.45+(1.55-x)/5.35*3.7;cube(stairs,.1,1.06,.1,x,y+.51,z,m.dark);sphere(stairs,.073,x,y+1.08,z,m.honey);}
  }
  // 栏廊只在朝向挑空的一侧设栏杆，楼梯顶端保留完整横向入口。
  const railing=(x:number,z0:number,z1:number,y:number)=>{
    cube(stairs,.09,.09,z1-z0,x,y+1.02,(z0+z1)/2,m.wood);
    cube(stairs,.075,.1,z1-z0,x,y+.11,(z0+z1)/2,m.dark);
    const n=Math.ceil((z1-z0)/.21);
    for(let j=0;j<=n;j++)cube(stairs,j===0||j===n?.085:.04,.94,j===0||j===n?.085:.04,x,y+.56,z0+(z1-z0)*j/n,m.wood);
    solid(x,(z0+z1)/2,.09,z1-z0,y,y+1.1);
  };
  railing(-3.83,-2.11,-.5,4.15);
  cube(stairs,1.36,.12,.11,-4.48,4.11,-2.125,m.wood);

  // 右侧附屋餐厅：长白桌布、木椅和竖琴；从西门进入可沿桌边绕行。
  const diningTable=table(dining,8.42,.45,.42,1.25,2.65,0,true);
  for(const x of [7.32,9.52])for(const z of [-.36,1.21])chair(dining,x,.45,z,x<8? -Math.PI/2:Math.PI/2,m.red);
  chair(dining,8.42,.45,-1.35,0,m.red);chair(dining,8.42,.45,2.2,Math.PI,m.red);
  for(const x of [-.37,.37])for(const z of [-.8,.8])cylinder(diningTable,.16,.018,x,.862,z,m.cream,.16,16);
  for(const z of [-.51,.51]){cylinder(diningTable,.065,.17,0,.932,z,m.brass);cylinder(diningTable,.025,.2,0,1.11,z,m.cream);}
  vase(diningTable,0,.86,0);
  chandelier(dining,8.42,.4,3.34,2.78,.36);
  const harp=object(dining,6.2,.45,-1.49,.12);
  cube(harp,.71,.12,.37,0,.06,0,m.wood);
  beam(harp,new THREE.Vector3(-.27,.13,0),new THREE.Vector3(-.27,1.81,0),.1,m.honey);
  beam(harp,new THREE.Vector3(.29,.17,0),new THREE.Vector3(.14,1.55,0),.09,m.wood);
  beam(harp,new THREE.Vector3(-.27,1.81,0),new THREE.Vector3(.14,1.55,0),.13,m.honey);
  for(let i=0;i<8;i++){const x=-.22+i*.054;beam(harp,new THREE.Vector3(x,.22,0),new THREE.Vector3(x,1.75-(x+.22)*.63,0),.007,m.brass);}
  sphere(harp,.095,-.27,1.84,0,m.honey);footprint(6.2,-1.49,.75,.48,.45,1.92,.12);
  cabinet(dining,10.03,.45,-1.25,1.28,1.09,.48,-Math.PI/2);
  // 独立内饰拱框紧贴后墙，不改动也不遮住正立面现有窗洞。
  for(const x of [7.45,9.12]){
    for(const sx of [-1,1])cube(dining,.07,1.27,.055,x+sx*.48,1.63,-2.51,m.cream);
    for(let j=0;j<12;j++){
      const a=j*Math.PI/12,b=(j+1)*Math.PI/12;
      beam(dining,new THREE.Vector3(x+Math.cos(a)*.48,2.265+Math.sin(a)*.48,-2.51),new THREE.Vector3(x+Math.cos(b)*.48,2.265+Math.sin(b)*.48,-2.51),.07,m.cream);
    }
  }

  // 卧室：截图可见长椅、白立钟、鸟笼；床是资料未呈现视角的合理补全。
  const bench=object(upper,-.4,4.15,.2);
  for(const sx of [-1,1])for(const sz of [-1,1])cube(bench,.07,.4,.07,sx*.77,.2,sz*.22,m.wood);
  cube(bench,1.73,.17,.62,0,.49,0,m.velvet);cube(bench,1.73,.6,.1,0,.83,-.27,m.velvet);
  for(const sx of [-1,1])cube(bench,.12,.38,.63,sx*.85,.73,0,m.wood);
  footprint(-.4,.2,1.85,.7,4.15,1.14);
  const bed=object(upper,.66,4.15,2.46);
  cube(bed,1.52,.26,2.06,0,.35,0,m.wood);cube(bed,1.44,.25,1.96,0,.59,0,m.cream);
  cube(bed,1.46,.05,1.37,0,.744,-.26,m.green);
  for(const x of [-.36,.36])cube(bed,.54,.13,.4,x,.8,.66,m.linen);
  for(const z of [-1,1]){cube(bed,1.62,z>0?1.08:.7,.1,0,z>0?.64:.45,z,m.wood);for(const x of [-.78,.78]){cube(bed,.1,1.21,.1,x,.63,z,m.dark);sphere(bed,.071,x,1.27,z,m.honey);}}
  footprint(.66,2.46,1.66,2.19,4.15,1.35);
  const clock=object(upper,-2.61,4.15,-.1);
  cube(clock,.52,1.82,.35,0,.96,0,m.cream);cube(clock,.67,.17,.43,0,.09,0,m.cream);
  cube(clock,.37,.99,.025,0,.77,.191,m.wood);cylinder(clock,.12,.024,0,.62,.215,m.brass,.12,16).rotation.x=Math.PI/2;
  cube(clock,.021,.62,.022,0,.96,.225,m.brass);
  cube(clock,.68,.14,.43,0,1.9,0,m.cream);sphere(clock,.33,0,2.01,0,m.cream).scale.set(1,1,.58);
  cylinder(clock,.225,.024,0,1.79,.238,m.linen,.225,24).rotation.x=Math.PI/2;
  for(let i=0;i<12;i++){const a=i*Math.PI/6;cube(clock,.021,.026,.012,Math.sin(a)*.185,1.79+Math.cos(a)*.185,.258,m.dark);}
  beam(clock,new THREE.Vector3(0,1.79,.27),new THREE.Vector3(-.095,1.87,.27),.018,m.dark);beam(clock,new THREE.Vector3(0,1.79,.27),new THREE.Vector3(.055,1.93,.27),.015,m.dark);
  footprint(-2.61,-.1,.7,.47,4.15,2.36);
  const birdTable=roundTable(upper,-1.57,4.15,3.07,.34);
  cylinder(birdTable,.24,.04,0,.82,0,m.brass);
  for(let i=0;i<10;i++){const a=i*Math.PI/5;beam(birdTable,new THREE.Vector3(Math.cos(a)*.225,.85,Math.sin(a)*.225),new THREE.Vector3(Math.cos(a)*.225,1.32,Math.sin(a)*.225),.012,m.brass);beam(birdTable,new THREE.Vector3(Math.cos(a)*.225,1.32,Math.sin(a)*.225),new THREE.Vector3(0,1.56,0),.012,m.brass);}
  for(const y of [.9,1.28]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.226,.011,4,16),m.brass);ring.rotation.x=Math.PI/2;ring.position.y=y;birdTable.add(ring);}
  beam(birdTable,new THREE.Vector3(-.15,1.04,0),new THREE.Vector3(.15,1.04,0),.025,m.wood);sphere(birdTable,.041,0,1.59,0,m.brass);
  picture(upper,-1.03,6.48,-.347,.84,1.08);
  chandelier(upper,-1.06,1.64,8.03,7.04,.4);
  cube(upper,2.0,.014,1.12,-1.84,4.171,1.33,m.red);

  // 东过厅小几避开门厅到餐厅的中线。
  const passageTable=table(east,3.57,.45,.37,.85,.4);
  cylinder(passageTable,.13,.045,0,.86,0,m.cream);cylinder(passageTable,.09,.19,0,.965,0,m.cream,.115);sphere(passageTable,.115,0,1.15,0,m.cream).scale.set(.82,1.2,.86);
  chandelier(east,3.55,2.3,3.96,3.12,.28);

  for(const child of group.children)if(child instanceof THREE.Group)batchStatic(child);
  return {group,colliders};
}
