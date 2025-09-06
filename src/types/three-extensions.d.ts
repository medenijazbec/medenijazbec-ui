declare module 'three/examples/jsm/effects/AsciiEffect.js' {
  import { WebGLRenderer, Camera, Scene } from 'three';
  export class AsciiEffect {
    constructor(renderer: WebGLRenderer, characters?: string, options?: { invert?: boolean; resolution?: number });
    domElement: HTMLElement;
    setSize(width: number, height: number): void;
    render(scene: Scene, camera: Camera): void;
    dispose(): void;
  }
}

declare module 'three/examples/jsm/controls/OrbitControls.js' {
  import { Camera, EventDispatcher } from 'three';
  export class OrbitControls extends EventDispatcher {
    constructor(object: Camera, domElement?: HTMLElement);
    enableDamping: boolean;
    dampingFactor: number;
    update(): void;
    dispose(): void;
  }
}
