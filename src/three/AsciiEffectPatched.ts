// Minimal, self-contained ASCII effect with willReadFrequently:true
// API-compatible: new AsciiEffectPatched(renderer, chars?, opts?)
import { WebGLRenderer } from "three";

type Options = {
  invert?: boolean;
  resolution?: number; // 0..1 (bigger -> fewer chars)
  color?: boolean;     // if true, colorize ascii
  bg?: string;         // CSS background on the container
};

export default class AsciiEffectPatched {
  public domElement: HTMLDivElement;

  private _renderer: WebGLRenderer;
  private _width = 0;
  private _height = 0;

  private _charSet: string;
  private _invert: boolean;
  private _color: boolean;
  private _resolution: number;

  // Offscreen 2D canvas we read from — where the spec hint matters
  private _srcCanvas: HTMLCanvasElement;
  private _srcCtx: CanvasRenderingContext2D;

  // Target <pre> we'll write ASCII into
  private _pre: HTMLPreElement;
  private _imageSmoothing = false;

  constructor(
    renderer: WebGLRenderer,
    charSet = " .:-=+*#%@",
    opts: Options = {}
  ) {
    this._renderer = renderer;
    this._charSet = charSet;
    this._invert = !!opts.invert;
    this._color = !!opts.color;
    this._resolution = Math.min(Math.max(opts.resolution ?? 0.15, 0.05), 1.0);

    // Container
    const container = document.createElement("div");
    container.style.position = "relative";
    container.style.display = "inline-block";
    if (opts.bg) container.style.background = opts.bg;

    // Pre element to print ASCII
    this._pre = document.createElement("pre");
    this._pre.style.margin = "0";
    this._pre.style.lineHeight = "1em";
    this._pre.style.fontFamily = "monospace";
    this._pre.style.whiteSpace = "pre";
    this._pre.style.userSelect = "none";

    container.appendChild(this._pre);
    this.domElement = container;

    // Offscreen 2D canvas used to read pixels from WebGL <canvas>
    this._srcCanvas = document.createElement("canvas");

    // IMPORTANT: willReadFrequently
    const ctx = this._srcCanvas.getContext("2d", {
      willReadFrequently: true,
      alpha: false,
    });

    if (!ctx) {
      throw new Error("Failed to create 2D canvas context for AsciiEffect.");
    }
    this._srcCtx = ctx;
    this._srcCtx.imageSmoothingEnabled = this._imageSmoothing;
  }

  setSize(width: number, height: number) {
    // Number of chars horizontally/vertically based on resolution and font size
    this._width = Math.max(1, Math.floor(width * this._resolution));
    this._height = Math.max(1, Math.floor(height * this._resolution));

    this._srcCanvas.width = this._width;
    this._srcCanvas.height = this._height;

    // Size the <pre> to roughly match character grid size
    // (inverse relation to resolution)
    const px = Math.max(2, Math.floor(1 / this._resolution));
    this._pre.style.fontSize = `${px}px`;
  }

  render(scene: any, camera: any) {
    // Render WebGL to its own canvas first
    this._renderer.render(scene, camera);

    const glCanvas = this._renderer.domElement as HTMLCanvasElement;
    if (!glCanvas.width || !glCanvas.height || this._width === 0 || this._height === 0) {
      return;
    }

    // Downscale into our 2D canvas
    this._srcCtx.drawImage(glCanvas, 0, 0, this._width, this._height);

    const img = this._srcCtx.getImageData(0, 0, this._width, this._height);
    const data = img.data;

    const cs = this._charSet;
    const clen = cs.length - 1;

    const colorize = this._color;
    const step = 4;

    if (!colorize) {
      // Plain monochrome text — fastest path
      let out = "";
      for (let y = 0; y < this._height; y++) {
        for (let x = 0; x < this._width; x++) {
          const i = (y * this._width + x) * step;
          const r = data[i + 0];
          const g = data[i + 1];
          const b = data[i + 2];

          // luminance
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const idx = Math.max(
            0,
            Math.min(clen, Math.round((this._invert ? 1 - lum : lum) * clen))
          );
          out += cs[idx];
        }
        out += "\n";
      }
      this._pre.textContent = out;
      return;
    }

    // Colorized output — build a fragment of <span> nodes
    const frag = document.createDocumentFragment();
    for (let y = 0; y < this._height; y++) {
      for (let x = 0; x < this._width; x++) {
        const i = (y * this._width + x) * step;
        const r = data[i + 0];
        const g = data[i + 1];
        const b = data[i + 2];

        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const idx = Math.max(
          0,
          Math.min(clen, Math.round((this._invert ? 1 - lum : lum) * clen))
        );

        const span = document.createElement("span");
        span.textContent = cs[idx];
        span.style.color = `rgb(${r}, ${g}, ${b})`;
        frag.appendChild(span);
      }
      frag.appendChild(document.createTextNode("\n"));
    }
    this._pre.replaceChildren(frag);
  }

  // Option setters (keep API parity with original AsciiEffect)
  setCharSet(chars: string) {
    this._charSet = chars;
  }
  setInvert(v: boolean) {
    this._invert = v;
  }
  setResolution(r: number) {
    this._resolution = Math.min(Math.max(r, 0.05), 1.0);
  }
  setColorize(c: boolean) {
    this._color = c;
  }

  dispose() {
    this._pre.replaceChildren();
    // keep container element so callers can remove it if they want
  }
}
