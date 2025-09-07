// src/components/branding/DreamsHero.tsx
import React, { useEffect, useRef } from 'react';
import styles from './DreamsHero.module.css';

type Props = {
  /** Fires once when the ASCII outline finishes revealing (phase hits 1). */
  onRevealDone?: () => void;
  /** When true, the outline reverses (fades back into background characters). */
  reverse?: boolean;
};

const DreamsHero: React.FC<Props> = ({ onRevealDone, reverse = false }) => {
  const gridRef = useRef<HTMLPreElement | null>(null);

  // keep latest reverse flag available inside the RAF loop
  const reverseRef = useRef(reverse);
  useEffect(() => { reverseRef.current = reverse; }, [reverse]);

  // track if we've already notified parent that reveal finished
  const revealedOnceRef = useRef(false);

  // keep latest onRevealDone without re-running the main effect
  const onRevealDoneRef = useRef(onRevealDone);
  useEffect(() => { onRevealDoneRef.current = onRevealDone; }, [onRevealDone]);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    /* --------- background filler line (swirl source) --------- */
    const LINE =
      "\\Fear and doubt are social constructs to keep you in line. Follow your dreams and reconnect with your inner child.                                                ";
    const LINE_WITH_SPACE = LINE + " ";

    /* ---------------------------- 9x9 ASCII OUTLINE FONT (ALL CAPS) ---------------------------- */
    const FONT: Record<string, string[]> = {
      A: ["   /\\    ","  /  \\   "," / /\\ \\  ","/ /__\\ \\ ","|  __  | ","| |  | | ","|_|  |_| ","         ","         "],
      B: [" ______  ","|  ___ \\ ","| | _ ) |","| | _ \\ |","| |___/ |","|______/ ","         ","         ","         "],
      C: ["  _____  "," / ____| ","| |      ","| |      ","| |      "," \\_____| ","         ","         ","         "],
      D: [" ______  ","|  _  \\  ","| | | |  ","| | | |  ","| |_| |  ","|____/   ","         ","         ","         "],
      E: [" _______ ","|  _____|","| |__    ","|  __|   ","| |_____ ","|_______|","         ","         ","         "],
      I: ["  _____  "," |_   _| ","   | |   ","   | |   ","   | |   ","  _| |_  "," |_____| ","         ","         "],
      J: ["     ___ ","    |_  |","      | |","      | |","  _   | |"," | |__| |","  \\____/ ","         ","         "],
      M: [" __  __  ","|  \\/  | ","| \\  / | ","| |\\/| | ","| |  | | ","| |  | | ","|_|  |_| ","         ","         "],
      N: [" _   _   ","| \\ | |  ","|  \\| |  ","| . ` |  ","| |\\  |  ","| | \\ |  ","|_|  \\_| ","         ","         "],
      Z: [" _______ ","     / / ","    / /  ","   / /   ","  / /    "," / /____ ","/_______|","         ","         "],
      " ": [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        ""
    ],
    };

    type BannerData = {
      lines: string[];
      spans: { start: number; width: number }[];
      height: number;
      width: number;
    };

    function makeBanner(text: string): BannerData {
      const t = text.toUpperCase();
      const sample = FONT["A"] || Object.values(FONT)[0];
      const glyphH = sample ? sample.length : 9;
      const GAP = "  ";

      const lines = Array.from({ length: glyphH }, () => "");
      const spans: { start: number; width: number }[] = [];

      let cursor = 0;
      for (let i = 0; i < t.length; i++) {
        const ch = t[i];
        const glyph = FONT[ch] || FONT[" "];
        const glyphW = glyph.reduce((m, r) => Math.max(m, r.length), 0);

        spans.push({ start: cursor, width: glyphW });

        for (let r = 0; r < glyphH; r++) {
          const row = (glyph[r] ?? "").padEnd(glyphW, " ");
          lines[r] += row;
        }
        for (let r = 0; r < glyphH; r++) lines[r] += GAP;
        cursor += glyphW + GAP.length;
      }
      return { lines, spans, height: glyphH, width: lines[0].length };
    }

    // Precomputed overlay + mask (updated on rebuild)
    let logoOutlineRows: string[] = [];
    let logoInsideMask: boolean[][] = [];

    function computeInsideMask(outline: string[], spans: { start: number; width: number }[]) {
      const mask: boolean[][] = [];
      for (let r = 0; r < outline.length; r++) {
        const row = outline[r];
        const L = row.length;
        const rowMask = new Array<boolean>(L).fill(false);
        for (const { start, width } of spans) {
          const end = Math.min(start + width, L);
          const slice = row.slice(start, end);
          const SL = slice.length;

          let inside = false;
          let i = 0;
          while (i < SL) {
            if (slice[i] !== " ") {
              while (i < SL && slice[i] !== " ") i++;
              inside = !inside;
            } else {
              if (inside) rowMask[start + i] = true;
              i++;
            }
          }
        }
        mask.push(rowMask);
      }
      return mask;
    }

    /* ---------------------------------- grid --------------------------------- */
    let TOTAL_ROWS = 0, COLS = 0;
    let rows: string[] = [];
    let textElems: HTMLDivElement[] = [];
    let logoTop = 0, logoLeft = 0, logoRows: string[] = [], logoCols = 0;

    function measureCellSize(target: HTMLElement) {
      const cs = getComputedStyle(target);
      const linePx = parseFloat(cs.lineHeight);
      const meas = document.createElement("span");
      meas.textContent = "M";
      (meas.style as any).visibility = "hidden";
      (meas.style as any).whiteSpace = "pre";
      target.appendChild(meas);
      const charPx = meas.getBoundingClientRect().width;
      target.removeChild(meas);
      return { charPx, linePx };
    }

    function rebuildGrid(target: HTMLElement) {
      const { charPx, linePx } = measureCellSize(target);
      const rect = target.getBoundingClientRect();
      COLS = Math.max(10, Math.ceil(rect.width / Math.max(1, charPx)));
      TOTAL_ROWS = Math.max(6, Math.ceil(rect.height / Math.max(1, linePx)));

      // Build base rows
      rows = [];
      const repeatsNeeded = Math.ceil(COLS / LINE_WITH_SPACE.length);
      const filler = LINE_WITH_SPACE.repeat(repeatsNeeded);
      for (let y = 0; y < TOTAL_ROWS; y++) rows.push(filler.slice(0, COLS));

      // Banner + masks
      const banner = makeBanner("MEDENI JAZBEC");
      logoRows = banner.lines;
      logoCols = banner.width;
      logoOutlineRows = banner.lines.map((s) => s);
      logoInsideMask = computeInsideMask(banner.lines, banner.spans);

      logoTop  = Math.max(0, Math.floor(TOTAL_ROWS / 2 - logoRows.length / 2));
      logoLeft = Math.max(0, Math.floor(COLS / 2 - logoCols / 2));

      target.innerHTML = "";
      textElems = [];
      for (let y = 0; y < TOTAL_ROWS; y++) {
        const line = document.createElement("div");
        line.className = styles.row;
        line.textContent = rows[y];
        target.appendChild(line);
        textElems.push(line as HTMLDivElement);
      }
    }

    rebuildGrid(el);
    const ro = new ResizeObserver(() => rebuildGrid(el));
    ro.observe(el);

    /* --------------------------- swirl + timings ----------------------------- */
    const COORD_SCALE = 0.72;
    const RING_FALLOFF = 2.2;
    const BASE_SPEED = 0.11;

    const SWIRL_DELAY = 0.0;        // seconds
    const revealStart = 0.0;        // when reveal begins (after swirl starts)
    const revealDurIn = 5.0;        // reveal duration (fade in)
    const revealDurOut = 3.1;       // reverse duration (fade out)

    let t0 = performance.now();
    let raf = 0;

    let reverseStart: number | null = null;   // time 't' when reverse begins

    function clamp01(v: number) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function ease(p: number) { const x = clamp01(p); return x * x * (3 - 2 * x); } // smoothstep

    function animate(ts: number) {
      raf = requestAnimationFrame(animate);
      if (rows.length === 0) return;

      const tReal = (ts - t0) * 0.001;
      const t = Math.max(0, tReal - SWIRL_DELAY);

      // If Home toggled reverse and we haven't latched a start, do it now.
      if (reverseRef.current && reverseStart === null) reverseStart = t;

      const totalRows = rows.length, cols = rows[0].length;

      // Forward reveal phase (0->1)
      const forwardPhase = clamp01((t - revealStart) / revealDurIn);
      if (!revealedOnceRef.current && forwardPhase >= 1) {
        revealedOnceRef.current = true;
        onRevealDoneRef.current?.();
      }

      // Final phase (forward or reversing)
      let phase = forwardPhase;
      if (reverseStart !== null) {
        const out = clamp01((t - reverseStart) / revealDurOut);
        phase = 1 - out; // goes from 1 back to 0
      }
      const phaseE = ease(phase);

      for (let y = 0; y < totalRows; y++) {
        let rowStr = "";
        const s0 = 1 - 2 * (y / totalRows);
        const s = s0 * COORD_SCALE;

        for (let x = 0; x < cols; x++) {
          const o0 = 2 * (x / cols) - 1;
          const o = o0 * COORD_SCALE;

          const d = Math.sqrt(o * o + s * s);
          const l = (BASE_SPEED * t) / Math.pow(Math.max(0.1, d), RING_FALLOFF);
          const sinL = Math.sin(l), cosL = Math.cos(l);

          const u = o * sinL - s * cosL;
          let m = Math.round(((o * cosL + s * sinL) + 1) / 2 * cols);
          let h = Math.round(((u + 1) / 2) * totalRows) % totalRows;

          if (m < 0) m = 0; if (m >= cols) m = cols - 1;
          if (h < 0) h = 0; if (h >= totalRows) h = totalRows - 1;

          let ch = rows[h][m] || " ";

          // ----- overlay outline & clear interior (mask) with FADE -----
          const withinLogo =
            y >= logoTop && y < logoTop + logoRows.length &&
            x >= logoLeft && x < logoLeft + logoCols;

          if (withinLogo) {
            const ly = y - logoTop;
            const lx = x - logoLeft;

            const outlineChar =
              (logoOutlineRows[ly] && logoOutlineRows[ly][lx]) || " ";
            const isInside =
              !!(logoInsideMask[ly] && logoInsideMask[ly][lx]);

            if (outlineChar !== " ") {
              const blended = Math.round(
                ch.charCodeAt(0) * (1 - phaseE) + outlineChar.charCodeAt(0) * phaseE
              );
              ch = String.fromCharCode(blended);
            } else if (isInside) {
              const blended = Math.round(
                ch.charCodeAt(0) * (1 - phaseE) + 32 * phaseE
              );
              ch = String.fromCharCode(blended);
            }
          }
          // -------------------------------------------------------------

          rowStr += ch;
        }
        textElems[y].textContent = rowStr;
      }
    }

    raf = requestAnimationFrame(animate);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []); // run once; callback refs keep latest props

  return (
    <div className={styles.root}>
      <pre id="grid" ref={gridRef} className={styles.grid} />
    </div>
  );
};

export default DreamsHero;
