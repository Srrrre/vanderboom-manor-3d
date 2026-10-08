import { HemisphereLight, PointLight, type Scene } from 'three';

/** 室内补光不投实时阴影；唯一阴影光源仍是原有太阳。 */
export function createInteriorLighting(scene: Scene) {
  const positions = [[.2,3.55,2.1],[-.5,5,-1.3],[7.9,3,0.3],[-.4,7.2,1.5]];
  for(const [x,y,z] of positions){
    const light=new PointLight(0xffdab1,5,7,2);light.position.set(x,y,z);scene.add(light);
  }
  const ambient=scene.children.find(o=>o instanceof HemisphereLight) as HemisphereLight | undefined;
  let mix=0;
  return { update(dt:number,indoors:boolean){
    mix+=((indoors?1:0)-mix)*(1-Math.exp(-3*dt));
    if(ambient)ambient.intensity=2.4-mix*1.05;
    // 雾起点在建筑尺寸之外，室内保持清晰，透窗的远景仍有空气透视。
  }};
}
