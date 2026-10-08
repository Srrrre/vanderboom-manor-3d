import * as THREE from 'three';
import { WORLD } from '../config';

/** 仅基础光照和雾；后处理可在 renderer.render 调用处扩展。 */
export function createRenderScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, WORLD.maxPixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xa3b4b7);
  scene.fog = new THREE.Fog(0xa3b4b7, 65, 235);
  scene.add(new THREE.HemisphereLight(0xdde9e6, 0x747e65, 2.4));
  const sun = new THREE.DirectionalLight(0xffedd0, 2.8);
  sun.position.set(-30, 55, 30); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -35; sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 35; sun.shadow.camera.bottom = -35; sun.shadow.camera.near = 1; sun.shadow.camera.far = 140;
  sun.shadow.normalBias = 0.04; sun.shadow.bias = -0.00012; scene.add(sun);
  const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.07, 380);
  return { renderer, scene, camera };
}
