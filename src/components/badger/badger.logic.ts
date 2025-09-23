// path: honey_badger_ui/src/components/badger/badger.logic.ts
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { AsciiEffect } from "three/examples/jsm/effects/AsciiEffect.js";
import {
  ANIM_DIR,
  ALLOWED_EXTS,
  ASCII_CHARSET,
  LABELS,
  FALLBACK_CLIPS,
  SCAN_ANIM_DIR,
  USE_DRACO,
  DRACO_DECODER_PATH,
} from "./badger.constants";

/** Speed up AsciiEffect readbacks. */
(() => {
  const proto = HTMLCanvasElement.prototype as any;
  const orig: (this: HTMLCanvasElement, ...args: any[]) => any = proto.getContext;
  if (typeof orig === "function") {
    proto.getContext = function (...args: any[]) {
      const [kind, opts] = args;
      if (kind === "2d") {
        return (orig as any).apply(this, ["2d", { willReadFrequently: true, ...(opts || {}) }]);
      }
      return (orig as any).apply(this, args);
    };
  }
})();

export type LoadOptions = {
  loopOnce?: boolean;
  loopForever?: boolean;
  fallbackMs?: number;
};

type QueueItem = { file: string; opts?: LoadOptions };

export class AsciiBadger {
  private renderer: THREE.WebGLRenderer;
  private effect: AsciiEffect;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private controls: OrbitControls;
  private hemi: THREE.HemisphereLight;
  private key: THREE.DirectionalLight;
  private lightPivot: THREE.Object3D;

  private turntable: THREE.Group;
  private modelPivot: THREE.Group; // holds only the model
  private plate: THREE.Mesh | null = null;   // saucer

  private loader: GLTFLoader;
  private draco: DRACOLoader | null = null;

  private mixer: THREE.AnimationMixer | null = null;
  private currentRoot: THREE.Object3D | null = null;
  private skeletonHelper: THREE.SkeletonHelper | null = null;

  private playing = true;
  private spin = false;
  private spinLight = false;

  private clock = new THREE.Clock();

  // queue + duration
  private onClipFinished: (() => void) | null = null;
  private finishTimer: number | null = null;
  private queueActive = false;
  private queueToken = 0;
  private finishWaiters: Array<() => void> = [];
  private lastDurationMs: number | null = null;
  private static readonly PAD_MS = 40;

  // Offsets (positive = down on screen ⇒ negative world-Y)
  private modelOffsetY = 0;
  private saucerOffsetY = 0;

  // Zoom / scale (1 = default)
  private modelZoom = 1;
  private saucerZoom = 1;
  private cameraZoom = 1;

  // Base measurements computed per loaded model
  private baseRadius = 120;        // inferred “stage” radius
  private baseCamY = 120;          // camera Y before zoom
  private baseCamDist = 360;       // camera Z before zoom

  constructor(private mount: HTMLElement, private statusSetter?: (s: string) => void) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.mount.clientWidth / this.mount.clientHeight,
      0.1,
      5000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.effect = new AsciiEffect(this.renderer, ASCII_CHARSET, { invert: true, resolution: 0.22 });

    const mountComputed = getComputedStyle(this.mount);
    if (mountComputed.position === "static") this.mount.style.position = "relative";
    this.mount.style.overflow = "hidden";

    const effEl = this.effect.domElement as HTMLElement;
    effEl.style.position = "absolute";
    effEl.style.inset = "0";
    effEl.style.display = "block";
    effEl.style.width = "100%";
    effEl.style.height = "100%";

    const rootStyles = getComputedStyle(document.documentElement);
    effEl.style.color = rootStyles.getPropertyValue("--phosphor").trim() || "#00ff66";
    effEl.style.backgroundColor = rootStyles.getPropertyValue("--bg").trim() || "#071a14";

    this.mount.appendChild(effEl);

    const w0 = Math.ceil(this.mount.clientWidth);
    const h0 = Math.ceil(this.mount.clientHeight);
    this.effect.setSize(w0, h0);

    this.controls = new OrbitControls(this.camera, this.effect.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x222222, 0.35);
    this.scene.add(this.hemi);

    this.key = new THREE.DirectionalLight(0xffffff, 1.1);
    this.scene.add(this.key);
    this.lightPivot = new THREE.Object3D();
    this.scene.add(this.lightPivot);
    this.lightPivot.add(this.key);
    this.key.position.set(200, 120, 0);

    this.turntable = new THREE.Group();
    this.modelPivot = new THREE.Group();
    this.turntable.add(this.modelPivot);
    this.scene.add(this.turntable);

    this.loader = new GLTFLoader();
    if (USE_DRACO) {
      this.draco = new DRACOLoader();
      this.draco.setDecoderPath(DRACO_DECODER_PATH);
      this.loader.setDRACOLoader(this.draco);
    }

    window.addEventListener("resize", this.onResize);
    window.addEventListener("dblclick", () => (this.controls as any).reset?.());
    this.animate();
  }

  // --- Public setters ---
  /** Positive values move the character downward on screen. */
  setModelOffsetY = (y: number) => {
    this.modelOffsetY = y;
    this.modelPivot.position.y = -y;
  };

  /** Positive values move the saucer downward on screen. */
  setSaucerOffsetY = (y: number) => {
    this.saucerOffsetY = y;
    if (this.plate) this.plate.position.y = -y;
  };

  /** Multiplier for model size (1 = default). */
  setModelZoom = (m: number) => {
    this.modelZoom = Math.max(0.4, m);
    this.modelPivot.scale.setScalar(this.modelZoom);
  };

  /** Multiplier for saucer size (1 = default). */
  setSaucerZoom = (m: number) => {
    this.saucerZoom = Math.max(0.4, m);
    if (this.plate) this.plate.scale.setScalar(this.saucerZoom);
  };

  /** Multiplier for camera distance/height (1 = default). */
  setCameraZoom = (m: number) => {
    this.cameraZoom = Math.max(0.5, m);
    this.applyCamera();
  };

  // Light controls (disables spin)
  setLightYawDegrees = (deg: number) => {
    this.spinLight = false;
    this.lightPivot.rotation.y = THREE.MathUtils.degToRad(deg);
  };
  setLightHeight = (y: number) => {
    this.spinLight = false;
    this.key.position.y = y;
  };
  setLightDistance = (d: number) => {
    this.spinLight = false;
    this.key.position.x = d;
  };

  // lifecycle
  dispose = () => {
    window.removeEventListener("resize", this.onResize);
    this.stopQueue();
    this.clearCurrent();
    this.controls.dispose();
    this.draco?.dispose?.();
    this.renderer.dispose();
    this.mount.removeChild(this.effect.domElement);
    this.clearFinishTimer();
  };

  // basic controls
  private setPlaying = (v: boolean) => {
    this.playing = v;
    if (this.mixer) this.mixer.timeScale = v ? 1 : 0;
  };
  togglePlay = () => this.setPlaying(!this.playing);
  toggleTurntable = () => (this.spin = !this.spin);
  toggleLightSpin = () => (this.spinLight = !this.spinLight);
  setOnClipFinished = (cb: (() => void) | null) => { this.onClipFinished = cb; };

  // queue
  playQueue = (items: Array<QueueItem | string>) => {
    const normalized: QueueItem[] = items.map((it) =>
      typeof it === "string" ? { file: it, opts: { loopOnce: true, fallbackMs: 1200 } } : it
    );

    this.queueToken++;
    const token = this.queueToken;
    this.queueActive = true;

    const run = async () => {
      for (let i = 0; i < normalized.length; i++) {
        const item = normalized[i];
        const wantsForever = !!item.opts?.loopForever;

        await this.loadClipPath(
          item.file,
          wantsForever
            ? { loopForever: true }
            : { loopOnce: item.opts?.loopOnce !== false, fallbackMs: item.opts?.fallbackMs ?? 1200 }
        );

        if (!wantsForever) await this.waitForFinishOrDuration(token);
        else break;
      }
      if (token === this.queueToken) this.queueActive = false;
    };

    void run();
  };

  stopQueue = () => {
    this.queueToken++;
    this.queueActive = false;
    this.resolveFinishWaiters();
    this.setOnClipFinished(null);
  };
  isQueueActive = () => this.queueActive;

  // discovery
  listAnimations = async (): Promise<string[]> => {
    try {
      const r = await fetch(`${ANIM_DIR}animations.json`, { cache: "no-cache" });
      if (r.ok) {
        const arr = (await r.json()) as string[];
        return arr.filter((n) => ALLOWED_EXTS.some((ext) => n.toLowerCase().endsWith(ext)));
      }
    } catch {}
    if (SCAN_ANIM_DIR) {
      try {
        const r = await fetch(ANIM_DIR, { cache: "no-cache" });
        if (r.ok) {
          const html = await r.text();
          const files = [...html.matchAll(/href="([^"]+)"/gi)]
            .map((m) => decodeURIComponent(m[1]).split("/").pop() || "")
            .filter((n) => ALLOWED_EXTS.some((ext) => n.toLowerCase().endsWith(ext)));
          if (files.length) return files;
        }
      } catch {}
    }
    return [...FALLBACK_CLIPS];
  };

  // loading
  loadClipPath = async (fileName: string, opts?: LoadOptions) => {
    const path = `${ANIM_DIR}${fileName}`;
    this.setStatus(`Loading: ${path}`);
    try {
      const gltf = await this.loader.loadAsync(path);
      this.afterLoad(gltf, path, opts);
    } catch (err) {
      console.error(err);
      this.setStatus(`Failed: ${path}`);
    }
  };
  loadClipBuffer = async (arrayBuffer: ArrayBuffer, name = "buffer", opts?: LoadOptions) => {
    try {
      const gltf = await this.loader.parseAsync(arrayBuffer, "");
      this.afterLoad(gltf, name, opts);
    } catch (e) {
      console.error(e);
      this.setStatus(`Failed to parse ${name}`);
    }
  };

  private afterLoad(
    gltf: import("three/examples/jsm/loaders/GLTFLoader.js").GLTF,
    label: string,
    opts?: LoadOptions
  ) {
    this.clearCurrent();

    this.currentRoot = gltf.scene || gltf.scenes?.[0] || null;
    if (!this.currentRoot) throw new Error("No scene in GLTF");

    this.modelPivot.add(this.currentRoot);
    this.ensureVisible(this.currentRoot);

    this.mixer = new THREE.AnimationMixer(this.currentRoot);
    this.mixer.removeEventListener("finished", this.handleFinished as any);
    this.mixer.addEventListener("finished", this.handleFinished as any);

    const clip = gltf.animations?.[0];
    this.lastDurationMs = clip ? Math.max(1, Math.round(clip.duration * 1000)) : null;

    if (clip) {
      const action = this.mixer.clipAction(clip);
      if (opts?.loopForever) {
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.clampWhenFinished = false;
      } else if (opts?.loopOnce !== false) {
        action.setLoop(THREE.LoopOnce, 0);
        action.clampWhenFinished = true;
      }
      action.reset();
      action.time = 0;
      this.mixer.setTime(0);
      action.play();
    }

    // Static GLB fallback
    this.clearFinishTimer();
    if (!clip) {
      const ms = Math.max(300, opts?.fallbackMs ?? 1200);
      this.finishTimer = window.setTimeout(() => this.handleFinished(), ms) as unknown as number;
    }

    this.setStatus(`Loaded: ${label}`);
  }

  private handleFinished = () => {
    this.clearFinishTimer();
    this.resolveFinishWaiters();
    if (this.onClipFinished) {
      try { this.onClipFinished(); } catch (e) { console.error(e); }
    }
  };

  private waitForFinishOrDuration(token: number) {
    return new Promise<void>((resolve) => {
      if (token !== this.queueToken) { resolve(); return; }
      this.finishWaiters.push(resolve);
      if (this.lastDurationMs && this.lastDurationMs > 0) {
        const t = window.setTimeout(() => {
          if (token === this.queueToken) this.handleFinished();
        }, this.lastDurationMs + AsciiBadger.PAD_MS) as unknown as number;
        const clear = () => clearTimeout(t);
        this.finishWaiters.push(clear);
      }
    });
  }
  private resolveFinishWaiters() {
    const list = this.finishWaiters.splice(0);
    for (const fn of list) { try { fn(); } catch {} }
  }
  private clearFinishTimer() {
    if (this.finishTimer !== null) {
      clearTimeout(this.finishTimer as unknown as number);
      this.finishTimer = null;
    }
  }
  private setStatus = (s: string) => this.statusSetter?.(s);

  private clearCurrent() {
    this.clearFinishTimer();

    if (this.currentRoot) {
      this.modelPivot.remove(this.currentRoot);
      this.currentRoot.traverse((o: any) => {
        if (o.geometry) o.geometry.dispose?.();
        if (o.material && o.material.dispose) o.material.dispose();
      });
    }
    if (this.skeletonHelper) {
      this.modelPivot.remove(this.skeletonHelper);
      (this.skeletonHelper.geometry as any)?.dispose?.();
      (this.skeletonHelper.material as any)?.dispose?.();
      this.skeletonHelper = null;
    }
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer.removeEventListener("finished", this.handleFinished as any);
      this.mixer.uncacheRoot(this.currentRoot as any);
    }
    this.currentRoot = null;
    this.mixer = null;

    if (this.plate) {
      this.turntable.remove(this.plate);
      (this.plate.geometry as any)?.dispose?.();
      (this.plate.material as any)?.dispose?.();
      this.plate = null;
    }
  }

  private fitAndStage(rootOrHelper: THREE.Object3D) {
    rootOrHelper.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(rootOrHelper);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    rootOrHelper.position.sub(center);
    rootOrHelper.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(rootOrHelper);
    rootOrHelper.position.y -= box2.min.y;

    const target = 180;
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = target / maxDim;
    rootOrHelper.scale.setScalar(scale);

    const radius = Math.max(size.x, size.z) * scale * 0.6 || 60;
    this.baseRadius = radius;

    const geo = new THREE.CylinderGeometry(radius * 1.1, radius * 1.1, radius * 0.04, 64);
    const mat = new THREE.MeshStandardMaterial({ color: 0x0e3b2c, roughness: 1, metalness: 0 });
    this.plate = new THREE.Mesh(geo, mat);
    this.plate.position.y = -this.saucerOffsetY;
    this.plate.scale.setScalar(this.saucerZoom);
    this.turntable.add(this.plate);

    this.baseCamY = radius * 1.1;
    this.baseCamDist = radius * 3.2;
    this.applyCamera();

    const oc = this.controls as any;
    oc.target?.set(0, radius * 0.55, 0);
    oc.minDistance = radius * 1.1 * this.cameraZoom;
    oc.maxDistance = radius * 8.0 * this.cameraZoom;
    this.controls.update();

    this.key.position.set(radius * 2.0, radius * 1.2, 0);

    // Apply offsets & zooms
    this.modelPivot.position.y = -this.modelOffsetY;
    this.modelPivot.scale.setScalar(this.modelZoom);
  }

  private applyCamera() {
    this.camera.position.set(0, this.baseCamY * this.cameraZoom, this.baseCamDist * this.cameraZoom);
    this.camera.updateProjectionMatrix();
  }

  private ensureVisible(obj: THREE.Object3D) {
    let hasGeo = false;
    obj.traverse((o: any) => { if (o.isMesh || o.isSkinnedMesh || o.geometry) hasGeo = true; });
    if (!hasGeo) {
      this.skeletonHelper = new THREE.SkeletonHelper(obj);
      (this.skeletonHelper.material as any).linewidth = 2;
      this.modelPivot.add(this.skeletonHelper);
      this.fitAndStage(this.skeletonHelper);
    } else {
      this.fitAndStage(obj);
    }
  }

  private onResize = () => {
    const w = Math.ceil(this.mount.clientWidth);
    const h = Math.ceil(this.mount.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.effect.setSize(w, h);
  };

  private animate = () => {
    const dt = this.clock.getDelta();
    if (this.mixer) this.mixer.update(dt);
    if (this.turntable && this.turntable.children.length && this.spin) this.turntable.rotation.y += 0.01;
    if (this.spinLight) this.lightPivot.rotation.y += 0.012;
    this.controls.update();
    this.effect.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  };

  // ---- UI helpers ----
  ui = {
    playPauseLabel: () => (this.playing ? LABELS.pause : LABELS.play),
    turntableLabel: () => (this.spin ? LABELS.ttOn : LABELS.ttOff),
    lightLabel: () => (this.spinLight ? LABELS.lightOn : LABELS.lightOff),
  };
}
