import * as THREE from 'three';
import { MANOR } from '../config.ts';
import { doorOpening } from './interior-layout.ts';
import { createMaterials } from '../render/materials.ts';
import { box, wall, batchStatic, type WallSpec } from './architecture.ts';
import type { Collider, WorldPart } from './types.ts';
/** 带檐口的闭合分层坡顶；每层为矩形，支持四坡与折线帽顶。 */
function roofGeometry(levels: { y: number; w: number; d: number }[]) {
  const vertices: number[] = [], indices: number[] = [];
  for (const { y, w, d } of levels) vertices.push(-w / 2, y, -d / 2, w / 2, y, -d / 2, w / 2, y, d / 2, -w / 2, y, d / 2);
  for (let k = 0; k < levels.length - 1; k++) for (let i = 0; i < 4; i++) {
    const a = k * 4 + i, b = k * 4 + (i + 1) % 4, c = a + 4, d = b + 4;
    indices.push(a, d, b, a, c, d);
  }
  const t = (levels.length - 1) * 4;
  indices.push(t, t + 2, t + 1, t, t + 3, t + 2, 0, 1, 2, 0, 2, 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices); g.computeVertexNormals();
  return g.toNonIndexed();
}

/** 外壳与室内共用坐标，墙洞同时从网格和碰撞里切除，动态门另行装配。 */
export function createManor(): WorldPart {
  const group = new THREE.Group(); group.name = 'vanderboom-manor';
  const colliders: Collider[] = [], m = createMaterials();
  const paint = new THREE.MeshStandardMaterial({color:0x81938a,roughness:.94});
  const glass = new THREE.MeshStandardMaterial({color:0x9aafb0,transparent:true,opacity:.16,roughness:.23,depthWrite:false,side:THREE.DoubleSide});
  const part = (name:string) => {const p=new THREE.Group();p.name=name;group.add(p);return p;};
  const main=part('main-house'),tower=part('square-tower'),annex=part('right-annex'),porch=part('four-column-porch');
  const wh=(center:number,y:number,w:number,h:number)=>({center,width:w+.02,bottom:y-h/2,top:y+h/2});
  function shellWall(parent:THREE.Group,spec:WallSpec,outward:number,material:THREE.Material=m.wall){
    wall(parent,colliders,spec,material);
    wall(parent,[],{...spec,fixed:spec.fixed-outward*(spec.thickness/2+.007),thickness:.012},paint);
    // 挂板接缝同样避开洞口，不能在透空窗与入口留下横线。
    for(let y=Math.max(.65,spec.bottom+.2);y<spec.top-.15;y+=.3){
      let spans=[[spec.from,spec.to]];
      for(const hole of spec.openings??[]){
        if(y<hole.bottom || y>hole.top)continue;
        const lo=hole.center-hole.width/2,hi=hole.center+hole.width/2;
        spans=spans.flatMap(([a,b])=>b<=lo||a>=hi?[[a,b]]:[[a,Math.min(b,lo)],[Math.max(a,hi),b]].filter(([u,v])=>v-u>.001));
      }
      for(const [a,b] of spans){
        const fixed=spec.fixed+outward*(spec.thickness/2+.007);
        box(parent,spec.axis==='x'?b-a:.022,.018,spec.axis==='x'?.022:b-a,spec.axis==='x'?(a+b)/2:fixed,y,spec.axis==='x'?fixed:(a+b)/2,m.seam);
      }
    }
  }
  const frontHoles=[doorOpening('front',.05),wh(-3.4,2.13,1.2,1.83),...[-3.25,-.35].map(x=>wh(x,6.6,.95,2.05))];
  shellWall(main,{axis:'x',fixed:3.88,from:-5.4,to:2.1,bottom:0,top:8.2,thickness:.24,openings:frontHoles},1);
  shellWall(main,{axis:'x',fixed:-3.68,from:-5.4,to:2.1,bottom:0,top:8.2,thickness:.24,openings:[2.15,6.6].flatMap(y=>[-3.6,-.8].map(x=>wh(x,y,1.02,1.85)))},-1);
  shellWall(main,{axis:'z',fixed:-5.28,from:-3.8,to:4,bottom:0,top:8.2,thickness:.24,openings:[2.15,6.6].flatMap(y=>[-1.8,1.4].map(z=>wh(z,y,1.02,1.85)))},-1);
  shellWall(main,{axis:'z',fixed:1.98,from:-3.8,to:4,bottom:0,top:8.2,thickness:.24,openings:[{center:1.7,width:1.7,bottom:.45,top:3.25}]},1);
  shellWall(tower,{axis:'x',fixed:3.88,from:2.1,to:5.4,bottom:0,top:11.6,thickness:.24,openings:[wh(3.25,2.13,1.2,1.83),wh(3.7,6.6,.95,2.05)]},1);
  shellWall(tower,{axis:'x',fixed:-.08,from:2.1,to:5.4,bottom:0,top:11.6,thickness:.24},-1);
  shellWall(tower,{axis:'z',fixed:2.22,from:-.2,to:4,bottom:8.2,top:11.6,thickness:.24},-1);
  shellWall(tower,{axis:'z',fixed:5.28,from:-.2,to:4,bottom:3.5,top:11.6,thickness:.24,openings:[6.6,9.6].map(y=>wh(1.8,y,.85,1.65))},1);
  shellWall(annex,{axis:'x',fixed:3.88,from:5.4,to:10.6,bottom:0,top:3.5,thickness:.24,openings:[6.7,9.2].map(x=>wh(x,1.95,.88,1.43))},1,m.wood);
  shellWall(annex,{axis:'x',fixed:-2.68,from:5.4,to:10.6,bottom:0,top:3.5,thickness:.24},-1,m.wood);
  shellWall(annex,{axis:'z',fixed:10.48,from:-2.8,to:4,bottom:0,top:3.5,thickness:.24,openings:[-1.3,1.9].map(z=>wh(z,1.95,.88,1.43))},1,m.wood);
  shellWall(annex,{axis:'z',fixed:5.52,from:-2.8,to:4,bottom:0,top:3.5,thickness:.24,openings:[doorOpening('dining')]},-1,m.wood);
  function roof(parent:THREE.Group,x:number,y:number,z:number,levels:{y:number;w:number;d:number}[],material:THREE.Material){
    const mesh=new THREE.Mesh(roofGeometry(levels),material);mesh.position.set(x,y,z);parent.add(mesh);
  }
  function win(parent:THREE.Group,x:number,y:number,z:number,w:number,h:number,cols=2,rows=3,angle=0,opaque=false){
    const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=angle;parent.add(g);
    for(const sx of [-1,1])box(g,.1,h+.2,.16,sx*(w/2+.05),0,0,m.trim);
    for(const sy of [-1,1])box(g,w,.1,.16,0,sy*(h/2+.05),0,m.trim);
    box(g,w,h,.022,0,0,.015,opaque?m.glass:glass);
    for(let j=1;j<cols;j++)box(g,.045,h,.1,-w/2+j*w/cols,0,.045,m.trim);
    for(let j=1;j<rows;j++)box(g,w,.045,.1,0,h/2-j*h/rows,.045,m.trim);
    box(g,w+.32,.09,.3,0,-h/2-.1,.08,m.trim);
    const pts=[-w/2-.16,w/2+.16].flatMap(u=>[-.14,.25].map(v=>({x:x+u*Math.cos(angle)+v*Math.sin(angle),z:z-u*Math.sin(angle)+v*Math.cos(angle)})));
    colliders.push({type:'box',minX:Math.min(...pts.map(p=>p.x)),maxX:Math.max(...pts.map(p=>p.x)),minZ:Math.min(...pts.map(p=>p.z)),maxZ:Math.max(...pts.map(p=>p.z)),minY:y-h/2-.14,maxY:y+h/2+.1});
  }
  const a=MANOR.main,t=MANOR.tower,n=MANOR.annex,p=MANOR.porch;
  for(const [parent,v] of [[main,a],[tower,t],[annex,n]] as const){
    box(parent,v.width+.1,.26,v.depth+.1,v.x,.2,v.z,m.stone);
    box(parent,v.width+.14,.16,v.depth+.14,v.x,v.height-.07,v.z,m.trim);
  }
  roof(main,a.x,a.height,a.z,[{y:0,w:a.width+.6,d:a.depth+.65},{y:a.roofRise,w:a.width-1,d:.16}],m.roof);
  box(main,a.width-.9,.11,.22,a.x,a.height+a.roofRise,a.z,m.roofEdge);
  box(main,1.16,1.54,1.8,-1.25,9.62,1.67,m.roof);
  win(main,-1.25,9.65,2.61,.88,1.3,2,2,0,true);
  roof(main,-1.25,10.43,1.75,[{y:0,w:1.3,d:2.05},{y:.24,w:.12,d:1.8}],m.roofEdge);
  roof(tower,t.x,t.height,t.z,[{y:0,w:4.15,d:5.05},{y:.36,w:3.65,d:4.55},{y:3.25,w:2.4,d:3.3},{y:3.6,w:2.32,d:3.2}],m.roof);
  box(tower,4.25,.15,5.15,t.x,t.height-.02,t.z,m.trim);box(tower,2.5,.16,3.35,t.x,15.19,t.z,m.roofEdge);
  box(tower,1.25,1.8,1.05,t.x,13.45,3.67,m.roof);win(tower,t.x,13.5,4.23,.91,1.6,2,2,0,true);
  const arch=new THREE.Mesh(new THREE.TorusGeometry(.56,.065,5,16,Math.PI),m.trim);arch.position.set(t.x,14.31,4.27);tower.add(arch);
  roof(annex,n.x,n.height,n.z,[{y:0,w:n.width+.6,d:n.depth+.6},{y:n.roofRise,w:n.width+.15,d:.05}],m.annexRoof);
  box(porch,p.width,p.floor,p.depth,p.x,p.floor/2,p.z,m.stone);box(porch,p.width,.07,p.depth,p.x,p.floor-.035,p.z,m.trim);
  for(let i=0;i<3;i++)box(porch,4,(3-i)*.15,.4,0,(3-i)*.075,6.7+i*.4,m.stone);
  for(const x of p.columns){
    box(porch,.5,.18,.5,x,.57,6.08,m.trim);box(porch,.37,.15,.37,x,.72,6.08,m.trim);box(porch,.25,2.55,.25,x,2.03,6.08,m.trim);
    for(const offset of [-.075,.075])box(porch,.021,2.4,.02,x+offset,2.03,6.22,m.seam);
    box(porch,.45,.4,.39,x,3.42,6.08,m.trim);
    const disc=new THREE.Mesh(new THREE.TorusGeometry(.116,.018,4,12),m.seam);disc.position.set(x,3.42,6.29);porch.add(disc);
    colliders.push({type:'box',minX:x-.25,maxX:x+.25,minZ:5.83,maxZ:6.33,minY:.45,maxY:3.62});
  }
  box(porch,p.width+.15,.21,.4,p.x,3.62,6.08,m.trim);
  const canopy=box(porch,p.width+.3,.15,3.08,p.x,3.97,5.17,m.roof);canopy.rotation.x=.19;
  box(porch,p.width+.4,.12,.15,p.x,3.68,6.7,m.roofEdge);
  for(const x of MANOR.windows.groundX)win(x<2?main:tower,x,2.13,4.02,1.2,1.83,3,5);
  for(const x of MANOR.windows.upperX)win(x>2?tower:main,x,6.6,4.02,.95,2.05,2,4);
  for(const x of [-.76,.66])box(porch,.1,2.79,.31,x,1.775,3.99,m.trim);
  box(porch,1.52,.14,.31,-.05,3.16,3.99,m.trim);
  for(const y of [2.15,6.6])for(const z of [-1.8,1.4])win(main,-5.42,y,z,1.02,1.85,2,3,-Math.PI/2);
  for(const y of [2.15,6.6])for(const x of [-3.6,-.8])win(main,x,y,-3.82,1.02,1.85,2,3,Math.PI);
  for(const z of [-1.3,1.9])win(annex,10.62,1.95,z,.88,1.43,2,3,Math.PI/2);
  for(const y of [6.6,9.6])win(tower,5.42,y,1.8,.85,1.65,2,3,Math.PI/2);
  for(const p of [main,tower,annex,porch])batchStatic(p);
  return {group,colliders};
}
