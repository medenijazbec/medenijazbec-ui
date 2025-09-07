// src/components/branding/DreamsHero.tsx
import React, { useEffect, useRef } from 'react';
import styles from './DreamsHero.module.css';

const DreamsHero: React.FC = () => {
  const gridRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    /* --------- background filler line (swirl source) --------- */
    const LINE =
      "\\Fear and doubt are social constructs to keep you in line. Follow your dreams and reconnect with your inner child.                                                ";
    const LINE_WITH_SPACE = LINE + " ";

    /* ---------------------------- 9x9 ASCII OUTLINE FONT (ALL CAPS) ---------------------------- */
    /* Only the letters used by "MEDENI JAZBEC" plus SPACE. Roughly 9 cols × 9 rows per glyph.    */
    const FONT: Record<string, string[]> = {
      A: [
        "   /\\    ",
        "  /  \\   ",
        " / /\\ \\  ",
        "/ /__\\ \\ ",
        "|  __  | ",
        "| |  | | ",
        "|_|  |_| ",
        "         ",
        "         ",
      ],
      B: [
        " ______  ",
        "|  ___ \\ ",
        "| | _ ) |",
        "| | _ \\ |",
        "| |___/ |",
        "|______/ ",
        "         ",
        "         ",
        "         ",
      ],
      C: [
        "  _____  ",
        " / ____| ",
        "| |      ",
        "| |      ",
        "| |      ",
        " \\_____| ",
        "         ",
        "         ",
        "         ",
      ],
      D: [
        " ______  ",
        "|  _  \\  ",
        "| | | |  ",
        "| | | |  ",
        "| |_| |  ",
        "|____/   ",
        "         ",
        "         ",
        "         ",
      ],
      E: [
        " _______ ",
        "|  _____|",
        "| |__    ",
        "|  __|   ",
        "| |_____ ",
        "|_______|",
        "         ",
        "         ",
        "         ",
      ],
      I: [
        "  _____  ",
        " |_   _| ",
        "   | |   ",
        "   | |   ",
        "   | |   ",
        "  _| |_  ",
        " |_____| ",
        "         ",
        "         ",
      ],
      J: [
        "     ___ ",
        "    |_  |",
        "      | |",
        "      | |",
        "  _   | |",
        " | |__| |",
        "  \\____/ ",
        "         ",
        "         ",
      ],
      M: [
        " __  __  ",
        "|  \\/  | ",
        "| \\  / | ",
        "| |\\/| | ",
        "| |  | | ",
        "| |  | | ",
        "|_|  |_| ",
        "         ",
        "         ",
      ],
      N: [
        " _   _   ",
        "| \\ | |  ",
        "|  \\| |  ",
        "| . ` |  ",
        "| |\\  |  ",
        "| | \\ |  ",
        "|_|  \\_| ",
        "         ",
        "         ",
      ],
      Z: [
        " _______ ",
        "     / / ",
        "    / /  ",
        "   / /   ",
        "  / /    ",
        " / /____ ",
        "/_______|",
        "         ",
        "         ",
      ],
      " ": [
        " ",
        " ",
        " ",
        " ",
        " ",
        " ",
        " ",
        " ",
        " ",
      ],
    };

    type BannerData = {
      lines: string[];                 // outline-only characters (spaces elsewhere)
      spans: { start: number; width: number }[]; // per-letter horizontal ranges
      height: number;                  // 9
      width: number;                   // total width
      gapWidth: number;                // 2 (spaces)
    };

    /** Build the banner (ALL CAPS), keeping fixed widths so we can mask interiors. */
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

        // record this letter's horizontal span
        spans.push({ start: cursor, width: glyphW });

        // append each row, padding the glyph rows to glyphW
        for (let r = 0; r < glyphH; r++) {
          const row = (glyph[r] ?? "").padEnd(glyphW, " ");
          lines[r] += row;
        }

        // gap after the letter
        for (let r = 0; r < glyphH; r++) lines[r] += GAP;
        cursor += glyphW + GAP.length;
      }

      const totalWidth = lines[0].length;
      return { lines, spans, height: glyphH, width: totalWidth, gapWidth: GAP.length };
    }

    // Precomputed overlay + mask, updated when grid is rebuilt
    let logoOutlineRows: string[] = [];       // stroke characters (non-space)
    let logoInsideMask: boolean[][] = [];     // interior (true = blank background)

    /** From outline rows + spans, compute an inside mask (per row, per x). */
    function computeInsideMask(outline: string[], spans: { start: number; width: number }[]) {
      const mask: boolean[][] = [];

      for (let r = 0; r < outline.length; r++) {
        const row = outline[r];
        const L = row.length;
        const rowMask = new Array<boolean>(L).fill(false);

        // Process each letter span separately so gaps between letters are NOT masked.
        for (const { start, width } of spans) {
          const end = Math.min(start + width, L);
          const slice = row.slice(start, end);
          const SL = slice.length;

          let inside = false;
          let i = 0;
          while (i < SL) {
            if (slice[i] !== " ") {
              // skip a contiguous stroke segment (outline)
              while (i < SL && slice[i] !== " ") i++;
              // after crossing a stroke, toggle inside
              inside = !inside;
            } else {
              if (inside) rowMask[start + i] = true; // interior becomes blank
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

      // Use container size (NOT the viewport)
      const rect = target.getBoundingClientRect();
      COLS = Math.max(10, Math.ceil(rect.width / Math.max(1, charPx)));
      TOTAL_ROWS = Math.max(6, Math.ceil(rect.height / Math.max(1, linePx)));

      // Build base rows
      rows = [];
      const repeatsNeeded = Math.ceil(COLS / LINE_WITH_SPACE.length);
      const filler = LINE_WITH_SPACE.repeat(repeatsNeeded);
      for (let y = 0; y < TOTAL_ROWS; y++) rows.push(filler.slice(0, COLS));

      // Build 9x9 ASCII banner and masks
      const banner = makeBanner("MEDENI JAZBEC");
      logoRows = banner.lines;
      logoCols = banner.width;
      logoOutlineRows = banner.lines.map((s) => s); // outlines already in lines
      logoInsideMask = computeInsideMask(banner.lines, banner.spans);

      // Position (center) within the hero container
      logoTop  = Math.max(0, Math.floor(TOTAL_ROWS / 2 - logoRows.length / 2));
      logoLeft = Math.max(0, Math.floor(COLS / 2 - logoCols / 2));

      // Draw static DOM lines
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

    // initial draw sized to the hero div
    rebuildGrid(el);

    // resize observer keeps it within the hero only
    const ro = new ResizeObserver(() => rebuildGrid(el));
    ro.observe(el);

    /* --------------------------- swirl + timings ----------------------------- */
    const COORD_SCALE = 0.72;
    const RING_FALLOFF = 2.2;
    const BASE_SPEED = 0.11;

    const SWIRL_DELAY = 0.2;   // seconds
    const revealStart = 1.0;   // when fade begins (after swirl starts)
    const revealDur = 5.0;     // seconds for full reveal

    let t0 = performance.now();
    let raf = 0;

    function animate(ts: number) {
      raf = requestAnimationFrame(animate);
      if (rows.length === 0) return;

      const tReal = (ts - t0) * 0.001;
      const t = Math.max(0, tReal - SWIRL_DELAY);

      const totalRows = rows.length, cols = rows[0].length;

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

          // ----- overlay outline & clear interior (mask) with FADE-IN -----
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

            // phase 0..1 for reveal
            const phase = Math.min(Math.max((t - revealStart) / revealDur, 0), 1);

            if (outlineChar !== " ") {
              // fade from background char -> outline char
              const blended = Math.round(
                ch.charCodeAt(0) * (1 - phase) + outlineChar.charCodeAt(0) * phase
              );
              ch = String.fromCharCode(blended);
            } else if (isInside) {
              // fade interior from background char -> space (blank)
              const blended = Math.round(
                ch.charCodeAt(0) * (1 - phase) + 32 * phase
              );
              ch = String.fromCharCode(blended);
            }
          }
          // ------------------------------------------------------------------

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
  }, []);

  return (
    <div className={styles.root}>
      <pre id="grid" ref={gridRef} className={styles.grid} />
    </div>
  );
};

export default DreamsHero;
