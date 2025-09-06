import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { AsciiEffect } from "three/examples/jsm/effects/AsciiEffect.js";
import {
  ANIM_DIR, ALLOWED_EXTS, ASCII_CHARSET, LABELS, FALLBACK_CLIPS,
  SCAN_ANIM_DIR, USE_DRACO, DRACO_DECODER_PATH
} from "./badger.constants";

// Silence Canvas2D readback warnings + make AsciiEffect a bit faster.
(() => {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type: any, opts?: any) {
    if (type === "2d") {
      return orig.call(this, type, { willReadFrequently: true, ...(opts || {}) });
    }
    return orig.call(this, type, opts);
  };
})();

/** Utilities to load & play GLB clips inside an ASCII-rendered Three.js scene. */
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
  private plate: THREE.Mesh | null = null;

  private loader: GLTFLoader;
  private draco: DRACOLoader | null = null;

  private mixer: THREE.AnimationMixer | null = null;
  private currentRoot: THREE.Object3D | null = null;
  private skeletonHelper: THREE.SkeletonHelper | null = null;

  private playing = true;
  private spin = true;
  private spinLight = true;

  private clock = new THREE.Clock();

  constructor(private mount: HTMLElement, private statusSetter?: (s: string) => void) {
    // Core
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      45, this.mount.clientWidth / this.mount.clientHeight, 0.1, 5000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.effect = new AsciiEffect(this.renderer, ASCII_CHARSET, { invert: true, resolution: 0.22 });
    this.effect.setSize(this.mount.clientWidth, this.mount.clientHeight);

    const rootStyles = getComputedStyle(document.documentElement);
    (this.effect.domElement as HTMLElement).style.color =
      rootStyles.getPropertyValue("--phosphor").trim() || "#00ff66";
    (this.effect.domElement as HTMLElement).style.backgroundColor =
      rootStyles.getPropertyValue("--bg").trim() || "#071a14";

    this.mount.appendChild(this.effect.domElement);

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
    this.scene.add(this.turntable);

    // GLTF loader (+ Draco if enabled)
    this.loader = new GLTFLoader();
    if (USE_DRACO) {
      this.draco = new DRACOLoader();
      this.draco.setDecoderPath(DRACO_DECODER_PATH); // e.g. /draco/ or Google CDN
      // this.draco.setDecoderConfig({ type: "js" }); // optional
      this.loader.setDRACOLoader(this.draco);
    }

    // events
    window.addEventListener("resize", this.onResize);
    window.addEventListener("dblclick", () => (this.controls as any).reset?.());

    // start render loop
    this.animate();
  }

  dispose = () => {
    window.removeEventListener("resize", this.onResize);
    this.clearCurrent();
    this.controls.dispose();
    this.draco?.dispose();
    this.renderer.dispose();
    this.mount.removeChild(this.effect.domElement);
  };

  // ---- Public controls (used by TSX) ----
  togglePlay = () => this.setPlaying(!this.playing);
  setPlaying = (v: boolean) => {
    this.playing = v;
    if (this.mixer) this.mixer.timeScale = v ? 1 : 0;
  };
  toggleTurntable = () => (this.spin = !this.spin);
  toggleLightSpin = () => (this.spinLight = !this.spinLight);

  /** Try several ways to get all .glb/.gltf files under ANIM_DIR */
  listAnimations = async (): Promise<string[]> => {
    // 1) Manifest (recommended)
    try {
      const r = await fetch(`${ANIM_DIR}animations.json`, { cache: "no-cache" });
      if (r.ok) {
        const arr = (await r.json()) as string[];
        return arr.filter((n) => ALLOWED_EXTS.some((ext) => n.toLowerCase().endsWith(ext)));
      }
    } catch {}

    // 2) Directory listing (if enabled)
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

    // 3) Fallback list
    return [...FALLBACK_CLIPS];
  };

  /** Load a GLB/GLTF from path (async) */
  loadClipPath = async (fileName: string) => {
    const path = `${ANIM_DIR}${fileName}`;
    this.setStatus(`Loading: ${path}`);
    try {
      const gltf = await this.loader.loadAsync(path);
      this.afterLoad(gltf, path);
    } catch (err) {
      console.error(err);
      this.setStatus(`Failed: ${path}`);
    }
  };

  /** Load from an ArrayBuffer (async) */
  loadClipBuffer = async (arrayBuffer: ArrayBuffer, name = "buffer") => {
    try {
      const gltf = await this.loader.parseAsync(arrayBuffer, "");
      this.afterLoad(gltf, name);
    } catch (e) {
      console.error(e);
      this.setStatus(`Failed to parse ${name}`);
    }
  };

  // ---------- internals ----------

  private afterLoad(gltf: import("three/examples/jsm/loaders/GLTFLoader.js").GLTF, label: string) {
    this.clearCurrent();

    this.currentRoot = gltf.scene || gltf.scenes?.[0] || null;
    if (!this.currentRoot) throw new Error("No scene in GLTF");

    this.turntable.add(this.currentRoot);
    this.ensureVisible(this.currentRoot);

    this.mixer = new THREE.AnimationMixer(this.currentRoot);
    const clip = gltf.animations?.[0];
    if (clip) this.mixer.clipAction(clip).play();

    this.setStatus(`Loaded: ${label}`);
  }

  private setStatus = (s: string) => this.statusSetter?.(s);

  private clearCurrent() {
    if (this.currentRoot) {
      this.turntable.remove(this.currentRoot);
      this.currentRoot.traverse((o: any) => {
        if (o.geometry) o.geometry.dispose?.();
        if (o.material && o.material.dispose) o.material.dispose();
      });
    }
    if (this.skeletonHelper) {
      this.turntable.remove(this.skeletonHelper);
      (this.skeletonHelper.geometry as any)?.dispose?.();
      (this.skeletonHelper.material as any)?.dispose?.();
      this.skeletonHelper = null;
    }
    if (this.mixer) this.mixer.uncacheRoot(this.currentRoot as any);
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
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);

    rootOrHelper.position.sub(center);
    rootOrHelper.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(rootOrHelper);
    rootOrHelper.position.y -= box2.min.y;

    const target = 180;
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = target / maxDim;
    rootOrHelper.scale.setScalar(scale);

    const radius = Math.max(size.x, size.z) * scale * 0.6 || 60;
    const geo = new THREE.CylinderGeometry(radius * 1.1, radius * 1.1, radius * 0.04, 64);
    const mat = new THREE.MeshStandardMaterial({ color: 0x0e3b2c, roughness: 1, metalness: 0 });
    this.plate = new THREE.Mesh(geo, mat);
    this.plate.position.y = 0;
    this.turntable.add(this.plate);

    const dist = radius * 3.2;
    this.camera.position.set(0, radius * 1.1, dist);

    // Older OrbitControls typings miss these members; assign via `any`.
    const oc = this.controls as any;
    oc.target?.set(0, radius * 0.55, 0);
    oc.minDistance = radius * 1.1;
    oc.maxDistance = radius * 8.0;
    this.controls.update();

    this.key.position.set(radius * 2.0, radius * 1.2, 0);
  }

  private ensureVisible(obj: THREE.Object3D) {
    let hasGeo = false;
    obj.traverse((o: any) => { if (o.isMesh || o.isSkinnedMesh || o.geometry) hasGeo = true; });
    if (!hasGeo) {
      this.skeletonHelper = new THREE.SkeletonHelper(obj);
      (this.skeletonHelper.material as any).linewidth = 2;
      this.turntable.add(this.skeletonHelper);
      this.fitAndStage(this.skeletonHelper);
    } else {
      this.fitAndStage(obj);
    }
  }

  private onResize = () => {
    const w = this.mount.clientWidth;
    const h = this.mount.clientHeight;
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

  // ---- UI helpers for TSX ----
  ui = {
    playPauseLabel: () => (this.playing ? LABELS.pause : LABELS.play),
    turntableLabel: () => (this.spin ? LABELS.ttOn : LABELS.ttOff),
    lightLabel: () => (this.spinLight ? LABELS.lightOn : LABELS.lightOff),
  };
}
