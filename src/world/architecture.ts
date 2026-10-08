import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Collider } from './types.ts';

export function box(parent: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}

export interface WallOpening { center: number; width: number; bottom: number; top: number }
export interface WallSpec { axis: 'x' | 'z'; fixed: number; from: number; to: number; bottom: number; top: number; thickness: number; openings?: WallOpening[] }

/** 按洞口边界切成墙垛/窗下墙/过梁，实体网格与碰撞共用同一分割。 */
export function wall(parent: THREE.Group, colliders: Collider[], spec: WallSpec, material: THREE.Material) {
  const openings = spec.openings ?? [];
  const cuts = [spec.from, spec.to, ...openings.flatMap(o => [Math.max(spec.from, o.center - o.width / 2), Math.min(spec.to, o.center + o.width / 2)])].sort((a,b) => a-b);
  const unique = [...new Set(cuts)];
  for (let i=0;i<unique.length-1;i++) {
    const from=unique[i],to=unique[i+1]; if(to-from<0.001) continue;
    const mid=(from+to)/2;
    const gaps=openings.filter(o=>mid>o.center-o.width/2 && mid<o.center+o.width/2).sort((a,b)=>a.bottom-b.bottom);
    let lower=spec.bottom;
    const add=(bottom:number,top:number)=>{
      if(top-bottom<.001)return;
      const width=spec.axis==='x'?to-from:spec.thickness,depth=spec.axis==='x'?spec.thickness:to-from;
      const x=spec.axis==='x'?mid:spec.fixed,z=spec.axis==='x'?spec.fixed:mid;
      box(parent,width,top-bottom,depth,x,(bottom+top)/2,z,material);
      colliders.push({type:'box',minX:x-width/2,maxX:x+width/2,minZ:z-depth/2,maxZ:z+depth/2,minY:bottom,maxY:top});
    };
    for(const gap of gaps){add(lower,Math.min(gap.bottom,spec.top));lower=Math.max(lower,gap.top);}
    add(lower,spec.top);
  }
}

/** 局部静态合批；合批后仍保留独立房间/外壳节点。动态门不能调用此函数。 */
export function batchStatic(group: THREE.Group) {
  group.updateWorldMatrix(true,true);
  const inverse=group.matrixWorld.clone().invert();
  const buckets=new Map<THREE.Material,THREE.BufferGeometry[]>();
  const other:THREE.Object3D[]=[];
  group.traverse(o=>{
    if(o instanceof THREE.Mesh && !Array.isArray(o.material)){
      const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.deleteAttribute('uv');g.deleteAttribute('color');
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));
      const list=buckets.get(o.material)??[];list.push(g);buckets.set(o.material,list);
    } else if(o instanceof THREE.Light) other.push(o);
  });
  group.clear();
  for(const [material,geometries] of buckets){const g=mergeGeometries(geometries);if(g){const mesh=new THREE.Mesh(g,material);mesh.castShadow=!material.transparent;mesh.receiveShadow=true;group.add(mesh);}geometries.forEach(g=>g.dispose());}
  if(other.length)group.add(...other);
}
