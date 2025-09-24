// src/components/branding/DreamsHero.tsx
import React, { useEffect, useRef } from 'react';
import styles from './DreamsHero.module.css';




//https://codepen.io/fiorella-coitinho/pen/MWyMXLe
// type Props ...
type Props = {
  onRevealDone?: () => void;
  reverse?: boolean;
  /** Start onRevealDone this many ms BEFORE the ASCII fully reveals */
  leadMs?: number; // NEW
};

const DreamsHero: React.FC<Props> = ({ onRevealDone, reverse = false, leadMs = 0 }) => {
  const gridRef = useRef<HTMLPreElement | null>(null);
  const overlayRef = useRef<HTMLPreElement | null>(null); // RGB overlay (logo only)

  // keep latest leadMs inside RAF without re-running effect
  const leadSecRef = useRef((leadMs ?? 0) / 1000);
  useEffect(() => { leadSecRef.current = (leadMs ?? 0) / 1000; }, [leadMs]);

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
    const targetEl = el as HTMLPreElement;

    /* --------- background filler line (swirl source) --------- */
    const RAW_QUOTES = String.raw`
\Brake fuild? No you can't be that strong.             
\Birds flu? Yeah they do that.          
\Peanut? At the same time?         
\Fear and doubt are social constructs to keep you in line.       
\Follow your dreams and reconnect with your inner child.
\Iran? No I walked there.       
\I am the Lorax, I speak for the trees.
\Metal gear solid? Yeah they're not supposed to break.
\Selfish? How much?
\Fish sticks? Yea if you throw it hard enough.
\He always betrays them, he always!            
\Can I buy some crude oil?             
\I am the Senate.
\Uau            
\Give drug to grug
\Ahj
\F1 im a scav, f1                           
\I am once again asking for your financial support              
\E služivej e to naša točka
\Ahti jebagla
`;

    const LINE = RAW_QUOTES
      .replace(/\\/g, '\n')
      .split(/\r?\n/);

    const LINE_WITH_SPACE = LINE.join(' ') + ' ';

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
      " ": ["","","","","","","","",""],
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
      return { lines, spans: spans as any, height: glyphH, width: lines[0].length };
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
    let overlayElems: HTMLDivElement[] = []; // rows for the RGB overlay
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
     
      logoInsideMask = computeInsideMask(banner.lines, (banner as any).spans);

      logoTop  = Math.max(0, Math.floor(TOTAL_ROWS / 2 - logoRows.length / 2));
      logoLeft = Math.max(0, Math.floor(COLS / 2 - logoCols / 2));

      // Draw static DOM lines for base grid
      target.innerHTML = "";
      textElems = [];
      for (let y = 0; y < TOTAL_ROWS; y++) {
        const line = document.createElement("div");
        line.className = styles.row;
        line.textContent = rows[y];
        target.appendChild(line);
        textElems.push(line as HTMLDivElement);
      }

      // Draw static DOM lines for RGB overlay (same row count/width)
      const overlayEl = overlayRef.current;
      if (overlayEl) {
        overlayEl.innerHTML = "";
        overlayElems = [];
        for (let y = 0; y < TOTAL_ROWS; y++) {
          const line = document.createElement("div");
          line.className = styles.row;
          // start empty (all spaces), we’ll fill only logo chars per frame
          line.textContent = " ".repeat(rows[y].length);
          overlayEl.appendChild(line);
          overlayElems.push(line as HTMLDivElement);
        }
      }
    }

    rebuildGrid(targetEl);
    const ro = new ResizeObserver(() => rebuildGrid(targetEl));
    ro.observe(targetEl);

    /* --------------------------- swirl + timings ----------------------------- */
    const COORD_SCALE = 0.72;
    const RING_FALLOFF = 2.2;
    const BASE_SPEED = 0.11;

    const SWIRL_DELAY = 0.0;        // seconds
    const revealStart = 0.0;        // when reveal begins (after swirl starts)
    const revealDurIn = 3.0;        // reveal duration (fade in)
    const revealDurOut = 4.1;       // reverse duration (fade out)
    const revealFireAt = revealStart + revealDurIn; // full reveal time
    let t0 = performance.now();
    let raf = 0;

    let reverseStart: number | null = null;   // time 't' when reverse begins

    function clamp01(v: number) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function ease(p: number) { const x = clamp01(p); return x * x * (3 - 2 * x); } // smoothstep

    // === RGB timewarp config (Sony Vegas style channel split) — OVERLAY ONLY ===
    const RGB_BASE_SPLIT = 1.5;   // px
    const RGB_WOBBLE = 1.0;       // px
    const RGB_BURST = 3.0;        // px
    const WOBBLE_HZ_R = 0.9;
    const WOBBLE_HZ_B = 1.3;
    const BURST_PERIOD = 2.5;     // seconds
    const BURST_DUR = 0.10;       // seconds

    // SAFE setter: update CSS vars on the overlay only
    const setRGBOffsets = (rx: number, ry: number, bx: number, by: number) => {
      const node = overlayRef.current;
      if (!node) return;
      node.style.setProperty('--rgb-rx', `${rx}px`);
      node.style.setProperty('--rgb-ry', `${ry}px`);
      node.style.setProperty('--rgb-bx', `${bx}px`);
      node.style.setProperty('--rgb-by', `${by}px`);
    };

    // Track overlay visibility to avoid flicker
    const overlayVisibleRef = { current: true };

    function setOverlayVisible(visible: boolean) {
      const node = overlayRef.current;
      if (!node) return;
      node.style.opacity = visible ? '0.92' : '0'; // hide when off
    }

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

      if (!revealedOnceRef.current && t >= (revealFireAt - leadSecRef.current)) {
        revealedOnceRef.current = true;
        onRevealDoneRef.current?.();
      }
      if (!revealedOnceRef.current && forwardPhase >= 1) {
        revealedOnceRef.current = true;
        onRevealDoneRef.current?.();
      }

      // Final phase (forward or reversing)
      let phase = forwardPhase;
      let reverseDone = false;
      if (reverseStart !== null) {
        const out = clamp01((t - reverseStart) / revealDurOut);
        phase = 1 - out; // goes from 1 back to 0
        reverseDone = out >= 1;
      }
      const phaseE = ease(phase);

      // Decide if overlay should be active (draw + wobble) this frame
      const overlayActive = phaseE > 0.001 && !reverseDone;

      // Apply / zero RGB offsets and show/hide overlay
      if (overlayActive) {
        const wr = Math.sin(t * Math.PI * 2 * WOBBLE_HZ_R);
        const wb = Math.cos(t * Math.PI * 2 * WOBBLE_HZ_B);
        let ax = RGB_BASE_SPLIT + RGB_WOBBLE * 0.7 * wr;
        let ay = RGB_BASE_SPLIT * 0.3 + RGB_WOBBLE * 0.5 * wb;
        const inBurst = (t % BURST_PERIOD) < BURST_DUR;
        if (inBurst) { ax += RGB_BURST; ay -= RGB_BURST * 0.5; }
        const rx = Math.round(ax);
        const ry = Math.round(ay);
        const bx = Math.round(-ax * 0.85);
        const by = Math.round(ay * 0.6);
        setRGBOffsets(rx, ry, bx, by);
        setOverlayVisible(true);
      } else {
        setRGBOffsets(0, 0, 0, 0);
        setOverlayVisible(false);
      }

      // Precompute a blank row to quickly clear overlay when needed
      const blankRow = " ".repeat(cols);

      for (let y = 0; y < totalRows; y++) {
        let rowStr = "";
        let overlayRowStr = ""; // only logo outline here (or blanks)
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

          let overlayCh = " "; // default: nothing on overlay

          if (withinLogo) {
            const ly = y - logoTop;
            const lx = x - logoLeft;

            const outlineChar =
              (logoOutlineRows[ly] && logoOutlineRows[ly][lx]) || " ";
            const isInside =
              !!(logoInsideMask[ly] && logoInsideMask[ly][lx]);

            if (outlineChar !== " ") {
              // Base grid gets blended (as before)
              const blended = Math.round(
                ch.charCodeAt(0) * (1 - phaseE) + outlineChar.charCodeAt(0) * phaseE
              );
              ch = String.fromCharCode(blended);

              // Overlay shows ONLY the outline char while active
              if (overlayActive) {
                overlayCh = ch; // render on overlay only if active
              } else {
                overlayCh = " ";
              }
            } else if (isInside) {
              const blendedToSpace = Math.round(
                ch.charCodeAt(0) * (1 - phaseE) + 32 * phaseE
              );
              ch = String.fromCharCode(blendedToSpace);
              // overlayCh stays space (no RGB on cleared interior)
            }
          }
          // -------------------------------------------------------------

          rowStr += ch;
          overlayRowStr += overlayCh;
        }

        // update base grid
        if (textElems[y]) textElems[y].textContent = rowStr;

        // update overlay rows
        if (overlayElems[y]) {
          if (overlayActive) {
            overlayElems[y].textContent = overlayRowStr;
          } else {
            // fully clear the overlay row when inactive (post-reverse)
            if (overlayElems[y].textContent !== blankRow) {
              overlayElems[y].textContent = blankRow;
            }
          }
        }
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
      {/* RGB overlay that only draws the ASCII logo; gets hidden/cleared after reverse */}
      <pre ref={overlayRef} className={styles.overlay} />
    </div>
  );
};

export default DreamsHero;
