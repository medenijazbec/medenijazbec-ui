// src/components/branding/AsciiOoze.tsx
import React, { useEffect, useRef, useState } from 'react';
import styles from './MoltenTitle.module.css';
import { ASCII_CHARSET } from '@/components/badger/badger.constants';

/**
 * Liquid-ier settings:
 * - lateral drift for meandering streams
 * - denser spawns + vertical smear for continuity
 * - grid width snaps to the text width
 */
const OOZE = {
  // Placement
  offsetCols: 0,        // keep centered under the text
  marginTopPx: 0,       // extra vertical offset besides --mj-ooze-gap

  // Look / feel
  widen: 2,             // half-thickness in columns (±2 is chunkier)
  smearDepth: 34,        // vertical smear length to look continuous
  intensityScale: 41.8,  // how fast chars climb the ramp

  // Vertical motion
  gravity: 0.012,
  friction: 0.988,
  maxV: 1.04,

  // Spawning
  spawnChance: 0.08,    // per eligible column per frame
  minSpawnCooldown: 1,  // frames between spawns per column

  // Lateral drift (meander)
  driftAmp: 0.2,       // max sideways push per frame (in columns)
  driftDamp: 0.96,      // velocity damping each frame
};

type Props = {
  text: string;
  anchorRef: React.RefObject<HTMLElement | null>;
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export const AsciiOoze: React.FC<Props> = ({ text, anchorRef }) => {
  const preRef = useRef<HTMLPreElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let raf = 0;
    let running = true;

    const start = async () => {
      try { await (document as any).fonts?.ready; } catch {}

      const anchor = anchorRef.current;
      const pre = preRef.current;
      if (!anchor || !pre) return;

      // Respect CSS var spacing from the title
      pre.style.marginTop = `calc(var(--mj-ooze-gap, 8px) + ${OOZE.marginTopPx}px)`;

      // Draw the title offscreen to find the lower silhouette
      const cs = getComputedStyle(anchor);
      const fontSize = parseFloat(cs.fontSize) || 96;
      const font = `bold ${fontSize}px Moliga, sans-serif`;

      const pad = Math.ceil(fontSize * 0.2);
      const w = Math.ceil(anchor.getBoundingClientRect().width);
      const h = Math.ceil(fontSize + pad * 2);
      const cvs = document.createElement('canvas');
      cvs.width = Math.max(w, 2);
      cvs.height = Math.max(h, 2);
      const ctx = cvs.getContext('2d')!;
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      ctx.fillStyle = '#fff';
      ctx.font = font;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(text, 0, fontSize + pad * 0.2);

      let img: Uint8ClampedArray | null = null;
      try { img = ctx.getImageData(0, 0, cvs.width, cvs.height).data; } catch {}

      // Collect spawn x-positions along the bottom of the glyphs
      const spawnColsPx: number[] = [];
      const sampleStep = 1; // dense sampling so width coverage matches the text
      if (img) {
        const cutoffY = Math.floor(fontSize * 0.28);
        const alphaAt = (x: number, y: number) => img![(y * cvs.width + x) * 4 + 3];
        for (let x = 0; x < cvs.width; x += sampleStep) {
          for (let y = cvs.height - 1; y >= cutoffY; y--) {
            if (alphaAt(x, y) > 150) { spawnColsPx.push(x); break; }
          }
        }
      } else {
        for (let x = 0; x < cvs.width; x += sampleStep) spawnColsPx.push(x);
      }

      // Measure monospace cell width then choose # of columns to SNAP to text width
      const probe = document.createElement('span');
      probe.style.font = getComputedStyle(pre).font;
      probe.textContent = 'M';
      document.body.appendChild(probe);
      const chWidth = Math.max(6, probe.getBoundingClientRect().width);
      document.body.removeChild(probe);

      const cols = Math.max(24, Math.round(cvs.width / chWidth)); // snap, not floor
      const rows = Math.max(14, Math.round(Math.min(40, fontSize / 2.6))); // a bit taller
      pre.style.width = `${cols * chWidth}px`; // grid width ~= text width

      const mapCol = (px: number) =>
        clamp(Math.round((px / (cvs.width - 1)) * (cols - 1)), 0, cols - 1);

      // Convert pixel spawn x to grid columns; fallback to even coverage if too sparse
      const mapped = spawnColsPx.map(px => clamp(mapCol(px) + OOZE.offsetCols, 0, cols - 1));
      const unique = Array.from(new Set(mapped));
      let spawnSet: Set<number>;
      if (unique.length < Math.max(10, Math.floor(cols * 0.25))) {
        const arr: number[] = [];
        for (let c = 1; c < cols - 1; c += 1) arr.push(c);
        spawnSet = new Set(arr);
      } else {
        spawnSet = new Set(unique);
      }

      type Drop = { c: number; r: number; v: number; vx: number };
      const drops: Drop[] = [];
      const lastSpawnFrame = new Map<number, number>();

      // Denser character ramp → less "dotty"
      const chars = (ASCII_CHARSET || ' .,:;~-=+!*iI1|/[](){}\\^&#%$@').split('');
      const maxIdx = chars.length - 1;

      let frame = 0;
      let lastT = performance.now();

      const tick = () => {
        if (!running) return;
        const now = performance.now();
        const dt = Math.min(50, now - lastT); // ms
        lastT = now;

        // Spawn with per-column cooldown (frequent enough to look continuous)
        spawnSet.forEach((c) => {
          const last = lastSpawnFrame.get(c) ?? -Infinity;
          if (frame - last >= OOZE.minSpawnCooldown && Math.random() < OOZE.spawnChance) {
            drops.push({ c, r: 0, v: 0, vx: (Math.random() * 2 - 1) * OOZE.driftAmp * 0.25 });
            lastSpawnFrame.set(c, frame);
          }
        });

        // Simulate: gravity + viscous damping + lateral meander (wind-like field)
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];

          // vertical
          d.v = Math.min(OOZE.maxV, (d.v + OOZE.gravity * (dt / 16.6)) * OOZE.friction);
          d.r += d.v;

          // lateral meander (cheap, deterministic)
          const wind = Math.sin((frame * 0.07) + d.r * 0.33 + d.c * 0.51) * OOZE.driftAmp * 0.12;
          d.vx = (d.vx + wind) * OOZE.driftDamp;
          d.c = clamp(d.c + d.vx, 0, cols - 1);

          if (d.r >= rows - 1) drops.splice(i, 1); // despawn off the grid
        }

        // Draw: widen columns + vertical smear for continuous streams
        const lines = Array.from({ length: rows }, () => Array(cols).fill(' '));
        for (const d of drops) {
          const rr = clamp(Math.floor(d.r), 0, rows - 1);
          const ci = clamp(Math.floor(d.v * OOZE.intensityScale), 0, maxIdx);
          const baseCol = Math.round(d.c);

          for (let dx = -OOZE.widen; dx <= OOZE.widen; dx++) {
            const cc = clamp(baseCol + dx, 0, cols - 1);
            const t = Math.max(0, ci - Math.abs(dx));

            // center
            lines[rr][cc] = chars[t];

            // smear downward to feel like water/lava
            for (let s = 1; s <= OOZE.smearDepth; s++) {
              const r2 = rr + s;
              if (r2 < rows && t - s >= 0) lines[r2][cc] = chars[t - s];
            }
            // small smear upward for cohesion
            if (rr - 1 >= 0 && t > 0) lines[rr - 1][cc] = chars[t - 1];
          }
        }

        (pre as HTMLPreElement).textContent = lines.map(r => r.join('')).join('\n');
        frame++;
        raf = requestAnimationFrame(tick);
      };

      setReady(true);
      raf = requestAnimationFrame(tick);
    };

    start();
    return () => { running = false; cancelAnimationFrame(raf); };
  }, [text, anchorRef]);

  return <pre ref={preRef} className={styles.ooze} aria-hidden={!ready} />;
};
