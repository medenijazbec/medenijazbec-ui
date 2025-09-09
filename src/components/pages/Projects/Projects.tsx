import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Projects.module.css";

import Navbar from "@/components/navbar/Navbar";
import { ASCII_CHARSET } from "@/components/badger/badger.constants";

import BADGER_DEFAULT from "@/assets/badger_default.png";
import BADGER_HARDWARE from "@/assets/badger_hardware.png";
import BADGER_SOFTWARE from "@/assets/badger_software.png";

/* ────────────────────────── TUNE THIS ────────────────────────── */
// Nudges the rendered ASCII image (not hotspots)
const NUDGE = { x: 0.04, y: 0.0 };
// Tight rectangular hitbox to switch modes (fraction of stage W/H)
const SWITCH_BOX = { w: 0.08, h: 0.10 };
// Extra margin only for the glitch effect around the box
const GLITCH_GROW = 0.018;

// 🔒 Hard-coded hotspot centers (normalized 0..1 of the stage)
const HOTSPOTS = {
  red:  { x: 0.42, y: 0.86 }, // Hardware  → 42%, 86%
  blue: { x: 0.58, y: 0.86 }, // Software  → 58%, 86%
};
/* ─────────────────────────────────────────────────────────────── */

type Mode = "default" | "hardware" | "software";

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const LUMA = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

type AsciiFrame = { lines: string[]; cols: number; rows: number };
type PillCenters = { red?: { x: number; y: number }, blue?: { x: number; y: number } };

function makeCanvas() {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  return { c, ctx };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

/** Image → ASCII (oversampled, letterboxed & centered), then nudged */
function imageToAsciiFrame(
  img: HTMLImageElement,
  cols: number,
  rows: number,
  t: number
): AsciiFrame {
  const { c, ctx } = makeCanvas();

  const charAspect = 2.0;
  const SCALE = 2;

  const targetW = cols * SCALE;
  const targetH = Math.round(rows * charAspect) * SCALE;

  c.width = targetW;
  c.height = targetH;
  ctx.imageSmoothingEnabled = true;

  const scale = Math.min(targetW / img.width, targetH / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;

  let dx = (targetW - drawW) / 2;
  let dy = (targetH - drawH) / 2;

  dx += NUDGE.x * targetW;
  dy += NUDGE.y * targetH;

  const wobble = 0.15 * SCALE;
  dx += Math.sin(t * 0.8) * wobble;
  dy += Math.cos(t * 0.65) * wobble;

  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(img, dx, dy, drawW, drawH);
  const data = ctx.getImageData(0, 0, targetW, targetH).data;

  const cellW = SCALE;
  const cellH = Math.max(1, Math.floor(charAspect * SCALE));

  const BLACK_FLOOR = 0.085;
  const GAMMA = 0.9;

  const CHARSET = ASCII_CHARSET[0] === " " ? ASCII_CHARSET : [...ASCII_CHARSET].reverse();

  const lines: string[] = [];
  for (let y = 0; y < rows; y++) {
    const sy0 = y * cellH;
    const sy1 = Math.min((y + 1) * cellH, targetH);
    let row = "";
    for (let x = 0; x < cols; x++) {
      const sx0 = x * cellW;
      const sx1 = Math.min((x + 1) * cellW, targetW);

      let sum = 0, count = 0;
      for (let py = sy0; py < sy1; py++) {
        const base = py * targetW;
        for (let px = sx0; px < sx1; px++) {
          const i = (base + px) * 4;
          sum += LUMA(data[i], data[i + 1], data[i + 2]);
          count++;
        }
      }
      let lum = (sum / count) / 255;

      if (lum < BLACK_FLOOR) { row += " "; continue; }
      lum = Math.pow((lum - BLACK_FLOOR) / (1 - BLACK_FLOOR), GAMMA);

      const ci = Math.min(CHARSET.length - 1, Math.max(0, Math.round(lum * (CHARSET.length - 1))));
      row += CHARSET[ci];
    }
    lines.push(row);
  }
  return { lines, cols, rows };
}

/** Color-dominance pill finder (normalized) */
function detectPills(img: HTMLImageElement): PillCenters {
  const { c, ctx } = makeCanvas();
  const W = 320;
  const H = Math.round((img.height / img.width) * W);
  c.width = W; c.height = H;
  ctx.drawImage(img, 0, 0, W, H);
  const pixels = ctx.getImageData(0, 0, W, H).data;

  const acc: Record<"red" | "blue", { sx: number; sy: number; n: number }> = {
    red: { sx: 0, sy: 0, n: 0 },
    blue: { sx: 0, sy: 0, n: 0 },
  };

  for (let y = Math.floor(H * 0.5); y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      const isRed = r > 150 && r > g + 40 && r > b + 40;
      const isBlue = b > 150 && b > r + 30 && b > g + 30;
      if (isRed)  { acc.red.sx  += x; acc.red.sy  += y; acc.red.n++; }
      if (isBlue) { acc.blue.sx += x; acc.blue.sy += y; acc.blue.n++; }
    }
  }

  const centers: PillCenters = {};
  if (acc.red.n  > 15) centers.red  = { x: (acc.red.sx  / acc.red.n)  / W, y: (acc.red.sy  / acc.red.n)  / H };
  if (acc.blue.n > 15) centers.blue = { x: (acc.blue.sx / acc.blue.n) / W, y: (acc.blue.sy / acc.blue.n) / H };
  return centers;
}

/* ───────── component ───────── */
export default function ProjectsPage() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const baseRef = useRef<HTMLPreElement | null>(null);
  const leftRef = useRef<HTMLPreElement | null>(null);
  const rightRef = useRef<HTMLPreElement | null>(null);
  const pillRedRef = useRef<HTMLPreElement | null>(null);
  const pillBlueRef = useRef<HTMLPreElement | null>(null);

  const [mode, setMode] = useState<Mode>("default");
  const [imgs, setImgs] = useState<{ default: HTMLImageElement; hardware: HTMLImageElement; software: HTMLImageElement } | null>(null);
  const [centersMap, setCentersMap] = useState<{ default: PillCenters; hardware: PillCenters; software: PillCenters } | null>(null);

  const [hover, setHover] = useState<{ red: boolean; blue: boolean }>({ red: false, blue: false });
  const [glitch, setGlitch] = useState<{ red: boolean; blue: boolean }>({ red: false, blue: false });

  // Runtime monospace metrics
  const metricsRef = useRef<{ cw: number; ch: number; dirty: boolean }>({ cw: 8, ch: 16, dirty: true });

  // Preload all images + centers
  useEffect(() => {
    let alive = true;
    (async () => {
      const [d, h, s] = await Promise.all([
        loadImage(BADGER_DEFAULT),
        loadImage(BADGER_HARDWARE),
        loadImage(BADGER_SOFTWARE),
      ]);
      if (!alive) return;
      setImgs({ default: d, hardware: h, software: s });
      setCentersMap({
        default: detectPills(d),
        hardware: detectPills(h),
        software: detectPills(s),
      });
    })();
    (document as any).fonts?.ready?.then?.(() => { metricsRef.current.dirty = true; });
    return () => { alive = false; };
  }, []);

  // Measure actual monospace cell + subtract pre padding
  function ensureMetrics() {
    if (!wrapRef.current || !metricsRef.current.dirty) return metricsRef.current;
    const host = wrapRef.current;

    const probe = document.createElement("span");
    probe.className = styles.probe;
    probe.textContent = "M".repeat(100);  // width
    host.appendChild(probe);
    const r1 = probe.getBoundingClientRect();

    probe.textContent = "M\nM";           // height
    const r2 = probe.getBoundingClientRect();
    host.removeChild(probe);

    const cw = r1.width / 100;
    const ch = r2.height / 2;
    metricsRef.current = { cw, ch, dirty: false };
    return metricsRef.current;
  }

  // rectangle hit-testing in normalized stage coords
  const insideBox = (nx: number, ny: number, cx: number, cy: number, w: number, h: number) => {
    const hw = w * 0.5, hh = h * 0.5;
    return Math.abs(nx - cx) <= hw && Math.abs(ny - cy) <= hh;
  };

  // Build / animate
  useEffect(() => {
    if (!imgs || !centersMap || !wrapRef.current || !baseRef.current) return;

    const base = baseRef.current!;
    const left = leftRef.current!;
    const right = rightRef.current!;
    const pillR = pillRedRef.current!;
    const pillB = pillBlueRef.current!;

    let stop = false, raf = 0;

    const ro = new ResizeObserver(() => { metricsRef.current.dirty = true; if (!stop) draw(performance.now()); });
    ro.observe(wrapRef.current);

    const RGB_BASE_SPLIT = 1.5, RGB_WOBBLE = 1.0, RGB_BURST = 3.0;
    const WOBBLE_HZ_R = 0.9, WOBBLE_HZ_B = 1.3, BURST_PERIOD = 2.5, BURST_DUR = 0.10;

    function setRGB(el: HTMLElement, rx: number, ry: number, bx: number, by: number) {
      el.style.setProperty("--rgb-rx", `${rx}px`);
      el.style.setProperty("--rgb-ry", `${ry}px`);
      el.style.setProperty("--rgb-bx", `${bx}px`);
      el.style.setProperty("--rgb-by", `${by}px`);
    }
    function setGlitchVars(t: number, el: HTMLElement) {
      const wr = Math.sin(t * Math.PI * 2 * WOBBLE_HZ_R);
      const wb = Math.cos(t * Math.PI * 2 * WOBBLE_HZ_B);
      let ax = RGB_BASE_SPLIT + RGB_WOBBLE * 0.7 * wr;
      let ay = RGB_BASE_SPLIT * 0.3 + RGB_WOBBLE * 0.5 * wb;
      const inBurst = (t % BURST_PERIOD) < BURST_DUR;
      if (inBurst) { ax += RGB_BURST; ay -= RGB_BURST * 0.5; }
      setRGB(el, Math.round(ax), Math.round(ay), Math.round(-ax * 0.85), Math.round(ay * 0.6));
    }

    function draw(ts: number) {
      if (stop || !wrapRef.current) return;
      raf = requestAnimationFrame(draw);

      const image = imgs![mode];
      const centers = centersMap![mode];

      // measure cell & padding
      const { cw, ch } = ensureMetrics();
      const rect = wrapRef.current.getBoundingClientRect();

      const cs = getComputedStyle(base);
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);

      const innerW = rect.width - padX;
      const innerH = rect.height - padY;

      const cols = Math.max(100, Math.floor(innerW / cw));
      const rows = Math.max(48,  Math.floor(innerH / ch));

      const t = ts * 0.001;
      const frame = imageToAsciiFrame(image, cols, rows, t);

      // base ASCII
      base.textContent = frame.lines.join("\n");

      // nudge in grid units (to keep overlays aligned with base)
      const nudgeCols = Math.round(NUDGE.x * frame.cols);
      const nudgeRows = Math.round(NUDGE.y * frame.rows);

      // arm regions for overlays (from image detection)
      const rx = (centers.red?.x ?? 0.28);
      const ry = (centers.red?.y ?? 0.78);
      const bx = (centers.blue?.x ?? 0.72);
      const by = (centers.blue?.y ?? 0.78);

      const toCol = (nx: number) => clamp(Math.round(nx * frame.cols), 0, frame.cols - 1);
      const toRow = (ny: number) => clamp(Math.round(ny * frame.rows), 0, frame.rows - 1);

      const rCol = clamp(toCol(rx) + nudgeCols, 0, frame.cols - 1);
      const rRow = clamp(toRow(ry) + nudgeRows, 0, frame.rows - 1);
      const bCol = clamp(toCol(bx) + nudgeCols, 0, frame.cols - 1);
      const bRow = clamp(toRow(by) + nudgeRows, 0, frame.rows - 1);

      const rw = Math.round(frame.cols * 0.26);
      const rh = Math.round(frame.rows * 0.28);

      const rLeft  = clamp(rCol - Math.round(rw * 0.65), 0, frame.cols - 1);
      const rRight = clamp(rCol + Math.round(rw * 0.35), 0, frame.cols - 1);
      const rTop   = clamp(rRow - Math.round(rh * 0.65), 0, frame.rows - 1);
      const rBot   = clamp(rRow + Math.round(rh * 0.35), 0, frame.rows - 1);

      const bLeft  = clamp(bCol - Math.round(rw * 0.35), 0, frame.cols - 1);
      const bRight = clamp(bCol + Math.round(rw * 0.65), 0, frame.cols - 1);
      const bTop   = clamp(bRow - Math.round(rh * 0.65), 0, frame.rows - 1);
      const bBot   = clamp(bRow + Math.round(rh * 0.35), 0, frame.rows - 1);

      const leftLines: string[] = [];
      const rightLines: string[] = [];

      // pill masks (only bright glyphs kept)
      const brightGlyph = ASCII_CHARSET[ASCII_CHARSET.length - 1] || "@";
      const pillW = Math.max(6, Math.round(frame.cols * 0.03));
      const pillH = Math.max(3, Math.round(frame.rows * 0.04));

      const rPL = clamp(rCol - Math.round(pillW * 0.5), 0, frame.cols - 1);
      const rPR = clamp(rPL + pillW, 0, frame.cols - 1);
      const rPT = clamp(rRow - Math.round(pillH * 0.5), 0, frame.rows - 1);
      const rPB = clamp(rPT + pillH, 0, frame.rows - 1);

      const bPL = clamp(bCol - Math.round(pillW * 0.5), 0, frame.cols - 1);
      const bPR = clamp(bPL + pillW, 0, frame.cols - 1);
      const bPT = clamp(bRow - Math.round(pillH * 0.5), 0, frame.rows - 1);
      const bPB = clamp(bPT + pillH, 0, frame.rows - 1);

      const redPillLines: string[] = [];
      const bluePillLines: string[] = [];

      for (let y = 0; y < frame.rows; y++) {
        const baseRow = frame.lines[y];
        let L = "", R = "", RP = "", BP = "";
        for (let x = 0; x < frame.cols; x++) {
          const ch = baseRow[x] ?? " ";

          const inLeft  = x >= rLeft && x <= rRight && y >= rTop && y <= rBot;
          const inRight = x >= bLeft && x <= bRight && y >= bTop && y <= bBot;
          L += inLeft ? ch : " ";
          R += inRight ? ch : " ";

          const inRP = x >= rPL && x <= rPR && y >= rPT && y <= rPB;
          const inBP = x >= bPL && x <= bPR && y >= bPT && y <= bPB;
          RP += inRP && (ch === "@" || ch === brightGlyph) ? "@" : " ";
          BP += inBP && (ch === "@" || ch === brightGlyph) ? "@" : " ";
        }
        leftLines.push(L);
        rightLines.push(R);
        redPillLines.push(RP);
        bluePillLines.push(BP);
      }

      left.textContent = leftLines.join("\n");
      right.textContent = rightLines.join("\n");

      // Show pill overlays ONLY for the active hand (mode) and while hovered
      pillR.textContent = (mode === "hardware" && hover.red) ? redPillLines.join("\n") : "";
      pillB.textContent = (mode === "software" && hover.blue) ? bluePillLines.join("\n") : "";

      if (hover.red || glitch.red) { left.classList.add(styles.glitch); setGlitchVars(t, left); }
      else { left.classList.remove(styles.glitch); setRGB(left, 0, 0, 0, 0); }

      if (hover.blue || glitch.blue) { right.classList.add(styles.glitch); setGlitchVars(t, right); }
      else { right.classList.remove(styles.glitch); setRGB(right, 0, 0, 0, 0); }
    }

    raf = requestAnimationFrame(draw);
    return () => { stop = true; cancelAnimationFrame(raf); ro.disconnect(); };
  }, [imgs, centersMap, mode, hover.red, hover.blue, glitch.red, glitch.blue]);

  // Hover → SMALL RECTANGULAR HITBOXES (hard-coded centers)
  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;

    function onMove(e: MouseEvent) {
      const rect = el.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;

      const r = HOTSPOTS.red;
      const b = HOTSPOTS.blue;

      const overR = insideBox(nx, ny, r.x, r.y, SWITCH_BOX.w, SWITCH_BOX.h);
      const overB = insideBox(nx, ny, b.x, b.y, SWITCH_BOX.w, SWITCH_BOX.h);

      const nearR = insideBox(nx, ny, r.x, r.y, SWITCH_BOX.w + GLITCH_GROW * 2, SWITCH_BOX.h + GLITCH_GROW * 2);
      const nearB = insideBox(nx, ny, b.x, b.y, SWITCH_BOX.w + GLITCH_GROW * 2, SWITCH_BOX.h + GLITCH_GROW * 2);

      const nextMode: Mode = overR ? "hardware" : overB ? "software" : "default";
      setMode(nextMode);

      setHover({ red: overR, blue: overB });
      setGlitch({ red: nearR, blue: nearB });
    }

    function onLeave() {
      setHover({ red: false, blue: false });
      setGlitch({ red: false, blue: false });
      setMode("default");
    }

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // Label absolute positions (follow hard-coded hotspots)
  const [labelPos, setLabelPos] = useState<{ red?: { left: number; top: number }, blue?: { left: number; top: number } }>({});
  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setLabelPos({
        red:  { left: HOTSPOTS.red.x  * rect.width, top: HOTSPOTS.red.y  * rect.height - 42 },
        blue: { left: HOTSPOTS.blue.x * rect.width, top: HOTSPOTS.blue.y * rect.height - 42 },
      });
    };
    const ro = new ResizeObserver(update);
    ro.observe(el); update();
    return () => ro.disconnect();
  }, []);

  const showHardwareLabel = mode === "hardware" && hover.red;
  const showSoftwareLabel = mode === "software" && hover.blue;
  const hint = useMemo(
    () => (showHardwareLabel ? "Hardware" : showSoftwareLabel ? "Software" : ""),
    [showHardwareLabel, showSoftwareLabel]
  );

  return (
    <div className={styles.page}>
      <Navbar overlay brand="medenijazbec.pro" />
      <main className={styles.main}>
        <div className={styles.stage} ref={wrapRef} aria-label="ASCII badger">
          {/* Base ASCII */}
          <pre ref={baseRef} className={styles.ascii} />

          {/* Arm overlays (for subtle RGB glitch) */}
          <pre ref={leftRef}  className={`${styles.ascii} ${styles.overlay}`} />
          <pre ref={rightRef} className={`${styles.ascii} ${styles.overlay}`} />

          {/* Colored pill overlays (only '@' kept) */}
          <pre ref={pillRedRef}  className={`${styles.ascii} ${styles.pillRed}`} />
          <pre ref={pillBlueRef} className={`${styles.ascii} ${styles.pillBlue}`} />

          {/* Labels — only for active/hovered hand */}
          {showHardwareLabel && labelPos.red && (
            <div className={`${styles.label} ${styles.labelRed}`} style={{ left: labelPos.red.left, top: labelPos.red.top }}>
              Hardware
            </div>
          )}
          {showSoftwareLabel && labelPos.blue && (
            <div className={`${styles.label} ${styles.labelBlue}`} style={{ left: labelPos.blue.left, top: labelPos.blue.top }}>
              Software
            </div>
          )}

          {hint && <div className={styles.hint}>{hint}</div>}

          {/* DEV: visible outlines for precise targeting */}
          <div
            className={`${styles.hotbox} ${styles.hotboxRed} ${styles.hotboxGlitch}`}
            style={{
              left: `${HOTSPOTS.red.x * 100}%`,
              top: `${HOTSPOTS.red.y * 100}%`,
              width: `${(SWITCH_BOX.w + GLITCH_GROW * 2) * 100}%`,
              height: `${(SWITCH_BOX.h + GLITCH_GROW * 2) * 100}%`,
            }}
            aria-hidden
          />
          <div
            className={`${styles.hotbox} ${styles.hotboxRed} ${styles.hotboxSwitch}`}
            style={{
              left: `${HOTSPOTS.red.x * 100}%`,
              top: `${HOTSPOTS.red.y * 100}%`,
              width: `${SWITCH_BOX.w * 100}%`,
              height: `${SWITCH_BOX.h * 100}%`,
            }}
            aria-hidden
          />
          <div
            className={`${styles.hotbox} ${styles.hotboxBlue} ${styles.hotboxGlitch}`}
            style={{
              left: `${HOTSPOTS.blue.x * 100}%`,
              top: `${HOTSPOTS.blue.y * 100}%`,
              width: `${(SWITCH_BOX.w + GLITCH_GROW * 2) * 100}%`,
              height: `${(SWITCH_BOX.h + GLITCH_GROW * 2) * 100}%`,
            }}
            aria-hidden
          />
          <div
            className={`${styles.hotbox} ${styles.hotboxBlue} ${styles.hotboxSwitch}`}
            style={{
              left: `${HOTSPOTS.blue.x * 100}%`,
              top: `${HOTSPOTS.blue.y * 100}%`,
              width: `${SWITCH_BOX.w * 100}%`,
              height: `${SWITCH_BOX.h * 100}%`,
            }}
            aria-hidden
          />
        </div>

        <div className={styles.strip}>
          <img src={BADGER_DEFAULT}  alt="Default"  title="Default" />
          <img src={BADGER_HARDWARE} alt="Hardware" title="Hardware" />
          <img src={BADGER_SOFTWARE} alt="Software" title="Software" />
        </div>
      </main>
    </div>
  );
}
