import './style.css';
import { createManor } from './world/manor';
import { createEnvironment, walkableHeight } from './world/environment';
import { createRenderScene } from './render/scene';
import { FirstPersonController } from './controls/FirstPersonController';
import { drawMinimap } from './ui/minimap';
import { WORLD } from './config';

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = el<HTMLCanvasElement>('scene');
const welcome = el('welcome'), hud = el('hud'), pause = el('pause'), notice = el('notice');
const start = el<HTMLButtonElement>('start');
let noticeTimer = 0;
function inform(message: string, permanent = false) {
  clearTimeout(noticeTimer); notice.textContent = message; notice.hidden = false;
  if (!permanent) noticeTimer = window.setTimeout(() => { notice.hidden = true; }, 6000);
}

try {
  const { renderer, scene, camera } = createRenderScene(canvas);
  const manor = createManor(); scene.add(manor.group);
  const environment = createEnvironment(); scene.add(environment.group);
  let entered = false, lightQuality = false, resetOnEntry = true;
  const controller = new FirstPersonController(camera, canvas, [...manor.colliders, ...environment.colliders], walkableHeight,
    locked => {
      if (locked) { entered = true; welcome.hidden = true; hud.hidden = false; pause.hidden = true; document.body.classList.add('playing'); }
      else if (entered) pause.hidden = false;
      document.body.classList.toggle('locked', locked);
      el('scene-state').textContent = locked ? '正在探索 · 室外场景' : entered ? '探索已暂停' : '庄园已就绪';
    }, message => inform(message));
  // 欢迎镜头先展示完整轮廓；进入漫游后严格使用成年人的眼高。
  camera.position.set(24, 10, 38); camera.lookAt(-4, 6, 0);
  function begin() {
    if (resetOnEntry) { controller.reset(); resetOnEntry = false; }
    controller.lock();
  }
  start.addEventListener('click', begin);
  el('resume').addEventListener('click', () => controller.lock());
  el('restart').addEventListener('click', () => { controller.reset(); controller.lock(); });
  el('reset').addEventListener('click', () => { controller.reset(); controller.lock(); inform('已回到庄园前庭。'); });
  el('help').addEventListener('click', () => { controller.unlock(); pause.hidden = false; });
  canvas.addEventListener('click', begin);
  el('quality').addEventListener('click', () => {
    lightQuality = !lightQuality;
    renderer.setPixelRatio(lightQuality ? 1 : Math.min(devicePixelRatio, WORLD.maxPixelRatio));
    renderer.shadowMap.enabled = !lightQuality; renderer.shadowMap.needsUpdate = true;
    el('quality').querySelector('span')!.textContent = lightQuality ? '轻量画质' : '标准画质';
    inform(lightQuality ? '轻量画质：关闭阴影，分辨率限制为 1 倍。' : '标准画质：柔和阴影，最高 1.5 倍分辨率。');
  });
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(lightQuality ? 1 : Math.min(devicePixelRatio, WORLD.maxPixelRatio));
  });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); controller.unlock(); renderer.setAnimationLoop(null);
    inform('图形上下文已中断，请刷新页面重试，或关闭占用显卡的其他页面。', true);
  });
  window.addEventListener('error', () => inform('运行遇到错误。请刷新页面重试；若持续出现，可在 GitHub 提交问题。', true));
  let previous = performance.now(), uiElapsed = 0;
  renderer.setAnimationLoop(time => {
    const dt = Math.min((time - previous) / 1000, 0.05); previous = time;
    if (document.hidden) return;
    controller.update(dt);
    renderer.render(scene, camera);
    uiElapsed += dt;
    if (entered && uiElapsed > 0.1) {
      uiElapsed = 0;
      const { x, z } = camera.position;
      el('coordinates').textContent = `${Math.abs(x).toFixed(1)} ${x < 0 ? 'W' : 'E'} · ${Math.abs(z).toFixed(1)} ${z < 0 ? 'N' : 'S'}`;
      el('coordinates').dataset.x = x.toFixed(3); el('coordinates').dataset.z = z.toFixed(3); el('coordinates').dataset.y = camera.position.y.toFixed(3);
      el('location').textContent = x < -20 ? '湖畔林地' : z < -8 ? '庄园后院' : x > 15 ? '东侧原野' : z < 8 ? '庄园回廊' : '庄园前庭';
      drawMinimap(el<HTMLCanvasElement>('map'), x, z, camera.rotation.y);
    }
  });
  document.addEventListener('visibilitychange', () => { previous = performance.now(); });
  el('start-label').textContent = '开始探索'; start.disabled = false;
  el('scene-state').textContent = '庄园已就绪 · 自由漫游';
  // 供验收读取渲染状态，不暴露可绕过碰撞的控制接口。
  canvas.dataset.ready = 'true';
  renderer.render(scene, camera);
  canvas.dataset.triangles = String(renderer.info.render.triangles);
  canvas.dataset.drawCalls = String(renderer.info.render.calls);
} catch (error) {
  console.error(error);
  start.disabled = true; el('start-label').textContent = '场景无法启动';
  el('scene-state').textContent = '请检查浏览器图形支持';
  inform('场景初始化失败。请使用启用硬件加速的新版 Chrome、Edge 或 Firefox（需要 WebGL 2），然后刷新页面。', true);
}
