import React, { useEffect, useRef, useState } from 'react';
import styles from './MoltenTitle.module.css';
import { ASCII_CHARSET } from '@/components/badger/badger.constants';

/** Code-only knobs for molten behavior/placement. */
const OOZE = {
  // Placement
  offsetCols: 0,      // horizontal shift (columns; +right / -left)
  marginTopPx: 0,     // additional vertical offset besides --mj-ooze-gap

  // Look/feel
  widen: 1,           // drip thickness (cells on each side)
  intensityScale: 3.0,

  // Speed/physics (thick lava)
  gravity: 0.009,
  friction: 0.986,
  maxV: 0.36,
  spawnChance: 0.02,
  minSpawnCooldown: 6,
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

      // Ensure tiny/specific extra offset without fighting the CSS var:
      pre.style.marginTop = `calc(var(--mj-ooze-gap, 8px) + ${OOZE.marginTopPx}px)`;

      const cs = getComputedStyle(anchor);
      const fontSize = parseFloat(cs.fontSize) || 96;
      const font = `bold ${fontSize}px Moliga, sans-serif`;

      // Offscreen silhouette
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

      const img = ctx.getImageData(0, 0, cvs.width, cvs.height).data;

      // Spawn columns from lower silhouette
      const spawnCols: number[] = [];
      const step = Math.max(2, Math.floor(fontSize / 26));
      const cutoffY = Math.floor(fontSize * 0.28);
      const alphaAt = (x: number, y: number) => img[(y * cvs.width + x) * 4 + 3];

      for (let x = 0; x < cvs.width; x += step) {
        for (let y = cvs.height - 1; y >= cutoffY; y--) {
          if (alphaAt(x, y) > 150) { spawnCols.push(x); break; }
        }
      }

      // Grid sizing
      const probe = document.createElement('span');
      probe.style.font = getComputedStyle(pre).font;
      probe.textContent = 'M';
      document.body.appendChild(probe);
      const chWidth = Math.max(6, probe.getBoundingClientRect().width);
      document.body.removeChild(probe);

      const cols = Math.max(24, Math.floor(cvs.width / chWidth));
      const rows = Math.max(12, Math.round(Math.min(32, fontSize / 3.25)));
      pre.style.width = `${cols * chWidth}px`;

      const mapCol = (px: number) => clamp(Math.floor((px / cvs.width) * cols), 0, cols - 1);
      const spawnSet = new Set(spawnCols.map(px => clamp(mapCol(px) + OOZE.offsetCols, 0, cols - 1)));

      type Drop = { c: number; r: number; v: number };
      const drops: Drop[] = [];
      const lastSpawnFrame = new Map<number, number>();
      const chars = (ASCII_CHARSET || ' .,:;-~+=*#%@').split('');
      const maxIdx = chars.length - 1;

      let frame = 0;
      let lastT = performance.now();

      const tick = () => {
        if (!running) return;
        const now = performance.now();
        const dt = Math.min(50, now - lastT); // ms
        lastT = now;

        // Spawn with cooldown
        spawnSet.forEach((c) => {
          const last = lastSpawnFrame.get(c) ?? -Infinity;
          if (frame - last >= OOZE.minSpawnCooldown && Math.random() < OOZE.spawnChance) {
            drops.push({ c, r: 0, v: 0 });
            lastSpawnFrame.set(c, frame);
          }
        });

        // Simulate
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          d.v = Math.min(OOZE.maxV, (d.v + OOZE.gravity * (dt / 16.6)) * OOZE.friction);
          d.r += d.v;
          if (d.r >= rows - 1) drops.splice(i, 1);
        }

        // Draw
        const lines = Array.from({ length: rows }, () => Array(cols).fill(' '));
        for (const d of drops) {
          const rr = clamp(Math.floor(d.r), 0, rows - 1);
          const ci = clamp(Math.floor(d.v * OOZE.intensityScale), 0, maxIdx);
          for (let dx = -OOZE.widen; dx <= OOZE.widen; dx++) {
            const cc = clamp(d.c + dx, 0, cols - 1);
            const t = Math.max(0, ci - Math.abs(dx));
            lines[rr][cc] = chars[t];
            if (rr + 1 < rows && t > 0) lines[rr + 1][cc] = chars[Math.max(0, t - 1)];
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
