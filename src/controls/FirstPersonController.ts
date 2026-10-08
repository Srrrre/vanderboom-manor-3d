import type { PerspectiveCamera } from 'three';
import type { Collider } from '../world/types.ts';
import { PLAYER } from '../config.ts';
import { movementDelta, moveWithCollisions } from './movement.ts';

const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight']);
const pitchLimit = Math.PI / 2 - 0.01;

export class FirstPersonController {
  private readonly camera: PerspectiveCamera;
  private readonly element: HTMLElement;
  private readonly colliders: Collider[];
  private readonly groundHeight: (x: number, z: number) => number;
  private readonly onLockChange: (locked: boolean) => void;
  private readonly onError: (message: string) => void;
  private readonly document: Document;
  private readonly keys = new Set<string>();
  private disposed = false;
  private requesting = false;
  private wantsLock = false;
  private reportedLocked = false;

  constructor(
    camera: PerspectiveCamera,
    element: HTMLElement,
    colliders: Collider[],
    groundHeight: (x: number, z: number) => number,
    onLockChange: (locked: boolean) => void,
    onError: (message: string) => void,
  ) {
    this.camera = camera;
    this.element = element;
    this.colliders = colliders;
    this.groundHeight = groundHeight;
    this.onLockChange = onLockChange;
    this.onError = onError;
    this.document = element.ownerDocument;
    this.camera.rotation.reorder('YXZ');
    this.document.addEventListener('pointerlockchange', this.handleLockChange);
    this.document.addEventListener('pointerlockerror', this.handleLockError);
    this.document.addEventListener('keydown', this.handleKeyDown);
    this.document.addEventListener('keyup', this.handleKeyUp);
    this.document.addEventListener('mousemove', this.handleMouseMove);
    this.document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.document.defaultView?.addEventListener('blur', this.handleBlur);
    this.reset();
  }

  get isLocked(): boolean {
    return !this.disposed && this.document.pointerLockElement === this.element;
  }

  update(dt: number): void {
    if (!this.isLocked || this.document.hidden) return;
    const frameTime = Math.min(0.05, Math.max(0, Number.isFinite(dt) ? dt : 0));
    const delta = movementDelta({
      forward: Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS')),
      right: Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')),
      sprint: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
    }, this.camera.rotation.y, frameTime);
    const position = moveWithCollisions(this.camera.position, delta, this.colliders);
    this.camera.position.x = position.x;
    this.camera.position.z = position.z;
    const ground = this.groundHeight(position.x, position.z);
    const targetEye = ground + PLAYER.eyeHeight;
    // 平滑跨越低台阶，并始终让镜头留在地表上方。
    const nextEye = this.camera.position.y + (targetEye - this.camera.position.y) * (1 - Math.exp(-12 * frameTime));
    this.camera.position.y = Math.max(ground + 0.4, nextEye);
  }

  reset(): void {
    this.keys.clear();
    const [x, z] = PLAYER.spawn;
    this.camera.position.set(x, this.groundHeight(x, z) + PLAYER.eyeHeight, z);
    this.camera.lookAt(0, 5, 0);
  }

  lock(): void {
    if (this.disposed || this.isLocked || this.requesting) return;
    if (typeof this.element.requestPointerLock !== 'function') {
      this.onError('当前浏览器不支持鼠标锁定，请使用桌面版 Chrome、Edge 或 Firefox。');
      return;
    }
    this.wantsLock = true;
    this.requesting = true;
    try {
      const request = this.element.requestPointerLock();
      // 兼容旧浏览器的 void 返回值，以及新浏览器权限失败时拒绝的 Promise。
      if (request && typeof request.then === 'function') {
        void request.then(() => {
          if ((this.disposed || !this.wantsLock) && this.document.pointerLockElement === this.element) {
            this.document.exitPointerLock();
          }
        }).catch(this.handleLockError);
      }
    } catch {
      this.handleLockError();
    }
  }

  unlock(): void {
    this.keys.clear();
    this.wantsLock = false;
    if (this.document.pointerLockElement === this.element) this.document.exitPointerLock();
  }

  dispose(): void {
    if (this.disposed) return;
    this.unlock();
    this.disposed = true;
    this.document.removeEventListener('pointerlockchange', this.handleLockChange);
    this.document.removeEventListener('pointerlockerror', this.handleLockError);
    this.document.removeEventListener('keydown', this.handleKeyDown);
    this.document.removeEventListener('keyup', this.handleKeyUp);
    this.document.removeEventListener('mousemove', this.handleMouseMove);
    this.document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.document.defaultView?.removeEventListener('blur', this.handleBlur);
  }

  private readonly handleLockChange = (): void => {
    this.keys.clear();
    this.requesting = false;
    const locked = this.isLocked;
    if (locked && !this.wantsLock) {
      this.document.exitPointerLock();
      return;
    }
    if (!locked) this.wantsLock = false;
    if (locked !== this.reportedLocked) {
      this.reportedLocked = locked;
      this.onLockChange(locked);
    }
  };

  private readonly handleLockError = (): void => {
    if (this.disposed || !this.requesting) return;
    this.requesting = false;
    this.wantsLock = false;
    this.keys.clear();
    this.onError('未能锁定鼠标。请先点击页面，再点击“继续漫游”重试；也可在独立浏览器窗口打开。');
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.isLocked) return;
    // 部分浏览器环境不会原生响应 Esc 解锁；显式退出，但保留按键默认行为。
    if (event.code === 'Escape') {
      this.unlock();
      return;
    }
    if (!movementKeys.has(event.code)) return;
    event.preventDefault();
    this.keys.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.isLocked) return;
    this.camera.rotation.y -= event.movementX * 0.002;
    this.camera.rotation.x = Math.max(-pitchLimit, Math.min(pitchLimit, this.camera.rotation.x - event.movementY * 0.002));
  };

  private readonly handleBlur = (): void => { this.unlock(); };

  private readonly handleVisibilityChange = (): void => {
    if (this.document.hidden) this.unlock();
  };
}
