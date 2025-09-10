import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./ShealthIso3D.module.css";
import { useShealthHistory, type FitnessRow } from "./ShealthHistoryModule.logic";

type Metric = "steps" | "distance";
type DaysProp = number | "all";

type Cell = {
  date: string;  // YYYY-MM-DD
  value: number;
  week: number;  // 0..W-1
  dow: number;   // 0..6 (Mon..Sun, Monday=0)
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function dowMon0(d: Date) {
  const js = d.getUTCDay();   // 0..6 Sun..Sat
  return (js + 6) % 7;        // Mon->0 .. Sun->6
}

export default function ShealthIso3D({
  days = "all",
  metric: initialMetric = "steps",
}: {
  days?: DaysProp;
  metric?: Metric;
}) {
  const { rows, loading, error } = useShealthHistory();
  const [metric, setMetric] = useState<Metric>(initialMetric);

  // ---------- layout / container ----------
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 1024, h: 520 });
  const [fullscreen, setFullscreen] = useState(false);
  const [xray, setXray] = useState(false);

  useEffect(() => {
    if (!hostRef.current) return;
    const ro = new ResizeObserver((es) => {
      for (const e of es) {
        const r = e.contentRect;
        setSize({ w: Math.max(520, r.width), h: Math.max(360, r.height) });
      }
    });
    ro.observe(hostRef.current);
    return () => ro.disconnect();
  }, []);

  // Decide how many days to render
  const effectiveDays = useMemo<number>(() => {
    if (!rows.length) return typeof days === "number" ? days : 365;
    if (days === "all") {
      const today = startOfDay(new Date());
      const earliestMs = rows.reduce(
        (min, r) => Math.min(min, Date.parse(r.day + "T00:00:00Z")),
        Number.POSITIVE_INFINITY
      );
      const earliest = startOfDay(new Date(earliestMs));
      const diff = Math.floor((today.getTime() - earliest.getTime()) / 86400000) + 1;
      return Math.max(1, diff);
    }
    return Math.max(1, days);
  }, [rows, days]);

  // ---------- data -> last N days aligned to Monday ----------
  const lastCells = useMemo(() => {
    if (!rows.length) return { cells: [] as Cell[], max: 1, weeks: 0 };
    const today = startOfDay(new Date());
    const first = new Date(today);
    first.setUTCDate(first.getUTCDate() - (effectiveDays - 1));
    // start from Monday to make a clean grid
    while (dowMon0(first) !== 0) first.setUTCDate(first.getUTCDate() - 1);

    const map = new Map<string, FitnessRow>();
    for (const r of rows) map.set(r.day, r);

    const cells: Cell[] = [];
    let d = new Date(first);
    let idx = 0;
    let max = 1;

    while (d <= today) {
      const key = d.toISOString().slice(0, 10);
      const rec = map.get(key);
      const val =
        metric === "steps" ? Math.max(0, Number(rec?.steps ?? 0))
                           : Math.max(0, Number(rec?.distanceKm ?? 0));
      const week = Math.floor(idx / 7);
      const dow = idx % 7;
      max = Math.max(max, val);
      cells.push({ date: key, value: val, week, dow });
      d.setUTCDate(d.getUTCDate() + 1);
      idx++;
    }
    const weeks = Math.max(1, Math.ceil(cells.length / 7));
    return { cells, max, weeks };
  }, [rows, effectiveDays, metric]);

  const { cells, max, weeks } = lastCells;

  // ---------- isometric geometry (FLIPPED) ----------
  const PAD_L = 26, PAD_R = 26, PAD_T = 28, PAD_B = 42;
  const W = Math.max(10, size.w - PAD_L - PAD_R);
  const H = Math.max(10, size.h - PAD_T - PAD_B);

  // diamond size (ensure full range fits horizontally)
  const cellW = Math.max(10, Math.floor((W * 2) / (weeks + 8))); // +8 lateral margin
  const cellH = Math.max(6, Math.floor(cellW / 2));

  // height scale
  const MAX_H = Math.max(70, Math.floor(H * 0.72));
  const zFor = (v: number) => Math.round((v / (max || 1)) * MAX_H);

  // origin, and horizontal flip (week 0 => right edge)
  const originX = PAD_L + 7 * (cellW / 2);           // push right a bit, avoids clipping
  const originY = PAD_T + Math.floor(H * 0.63);      // baseline so columns rise upwards
  const flipWeek = (w: number) => (weeks - 1 - w);
  const center = (week: number, dow: number) => {
    const wf = flipWeek(week);
    const cx = originX + (wf - dow) * (cellW / 2);
    const cy = originY + (wf + dow) * (cellH / 2);
    return { cx, cy, wf };
  };

  // color scale (darker/richer for higher values)
  const faceColors = (norm: number) => {
    const topL   = 66 - norm * 30; // lighter
    const rightL = 52 - norm * 28;
    const leftL  = 42 - norm * 26; // darkest
    return {
      top:   `hsl(150 62% ${topL}%)`,
      right: `hsl(150 65% ${rightL}%)`,
      left:  `hsl(150 68% ${leftL}%)`,
    };
  };

  // build polygons for each day; sort by FLOOR depth (far -> near) to avoid odd overlaps
  type Box = {
    key: string;
    top: string; left: string; right: string;
    cx: number; cy: number; z: number; baseCy: number; baseCx: number;
    value: number; colors: { top: string; left: string; right: string };
  };

  const boxes: Box[] = useMemo(() => {
    const out: Box[] = [];
    for (const c of cells) {
      const { cx, cy, wf } = center(c.week, c.dow);
      const baseCy = originY + (wf + c.dow) * (cellH / 2);                   // floor center Y
      const baseCx = originX + (wf - c.dow) * (cellW / 2);                   // floor center X
      const z = zFor(c.value);
      const norm = (max ? c.value / max : 0);
      const col = faceColors(norm);

      // top diamond
      const Tt = `${cx},${cy - z - cellH/2}`;
      const Rt = `${cx + cellW/2},${cy - z}`;
      const Bt = `${cx},${cy - z + cellH/2}`;
      const Lt = `${cx - cellW/2},${cy - z}`;

      // floor diamond
      const Rf = `${cx + cellW/2},${cy}`;
      const Bf = `${cx},${cy + cellH/2}`;
      const Lf = `${cx - cellW/2},${cy}`;

      const top   = `${Tt} ${Rt} ${Bt} ${Lt}`;
      const right = `${Rt} ${Rf} ${Bf} ${Bt}`;
      const left  = `${Lt} ${Lf} ${Bf} ${Bt}`;

      out.push({
        key: c.date,
        top, left, right,
        cx, cy: cy - z - cellH/2,
        z, baseCy, baseCx,
        value: c.value, colors: col
      });
    }
    // Sort by floor depth first (far -> near), then slight bias by baseCx so edges layer nicely
    out.sort((a, b) => {
      const d = a.baseCy - b.baseCy;         // smaller cy ~ farther
      if (d !== 0) return d;
      const e = a.baseCx - b.baseCx;         // tie-break horizontally
      if (e !== 0) return e;
      return a.z - b.z;                      // then height
    });
    return out;
  }, [cells, cellW, cellH, max, originX, originY]);

  // ---------- interactive viewport (zoom/pan) ----------
  const viewportRef = useRef<SVGGElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  const applyZoom = (factor: number, svgX: number, svgY: number) => {
    if (!viewportRef.current || !svgRef.current) return;
    const group = viewportRef.current;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = svgX; pt.y = svgY;

    // pointer in group coords (before transform)
    const p = pt.matrixTransform(group.getScreenCTM()!.inverse());

    const next = clamp(zoom * factor, 0.4, 6);
    // keep pointer anchored: svgPt = local*scale + T  =>  T' = svgPt - local*next
    const TnextX = svgX - p.x * next;
    const TnextY = svgY - p.y * next;

    setZoom(next);
    setTx(TnextX);
    setTy(TnextY);
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.1 : 1/1.1;
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    applyZoom(delta, e.clientX - rect.left, e.clientY - rect.top);
  };

  // panning
  const drag = useRef<{ sx: number; sy: number; tx0: number; ty0: number } | null>(null);
  const onMouseDown = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    drag.current = { sx: e.clientX - rect.left, sy: e.clientY - rect.top, tx0: tx, ty0: ty };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current) return;
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTx(drag.current.tx0 + (x - drag.current.sx));
    setTy(drag.current.ty0 + (y - drag.current.sy));
  };
  const onMouseUpOrLeave = () => { drag.current = null; };

  const zoomIn  = () => applyZoom(1.2, size.w * 0.5, size.h * 0.5);
  const zoomOut = () => applyZoom(1/1.2, size.w * 0.5, size.h * 0.5);
  const resetView = () => { setZoom(1); setTx(0); setTy(0); };

  // ---------- tooltip ----------
  const [tip, setTip] = useState<{ x: number; y: number; html: string } | null>(null);

  const onPointerMove = (e: React.MouseEvent) => {
    if (!svgRef.current || !viewportRef.current) return;
    const svg = svgRef.current;
    const group = viewportRef.current;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;

    const localPt = pt.matrixTransform(group.getScreenCTM()!.inverse());

    // nearest by top center
    let best: Box | null = null;
    let bestD = Infinity;
    for (const b of boxes) {
      const dx = b.cx - localPt.x;
      const dy = b.cy - localPt.y;
      const d2 = dx*dx + dy*dy;
      if (d2 < bestD) { bestD = d2; best = b; }
    }
    if (best) {
      // anchor in root coords
      const p = svg.createSVGPoint();
      p.x = best.cx; p.y = best.cy;
      const root = p.matrixTransform(group.getCTM()!);

      const html = metric === "steps"
        ? `${best.key}: <b>${Math.round(best.value).toLocaleString()}</b> steps`
        : `${best.key}: <b>${best.value.toLocaleString(undefined,{maximumFractionDigits:2})}</b> km`;

      setTip({ x: root.x, y: root.y - 10, html });
    }
  };
  const clearTip = () => setTip(null);

  // ---------- quick stats ----------
  const highest = useMemo(() => (cells.length ? Math.max(...cells.map(c=>c.value)) : 0), [cells]);
  const average = useMemo(() => (cells.length ? cells.reduce((a,c)=>a+c.value,0)/cells.length : 0), [cells]);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.title}>Samsung Health — Isometric Grid</div>

        <div className={styles.controls}>
          <label className={styles.meta}>Metric:&nbsp;</label>
          <select className={styles.select} value={metric} onChange={(e)=>setMetric(e.target.value as Metric)}>
            <option value="steps">Steps</option>
            <option value="distance">Distance (km)</option>
          </select>

          <div className={styles.sep} />

          <button className={styles.ctrlBtn} onClick={zoomOut} title="Zoom out">−</button>
          <button className={styles.ctrlBtn} onClick={zoomIn} title="Zoom in">+</button>
          <button className={styles.ctrlBtn} onClick={resetView} title="Reset view">Reset</button>

          <label className={styles.check}>
            <input type="checkbox" checked={xray} onChange={(e)=>setXray(e.target.checked)} />
            <span>X-ray</span>
          </label>

          <button className={styles.ctrlBtn} onClick={()=>setFullscreen(s=>!s)} title="Toggle fullscreen">
            {fullscreen ? "Exit Full" : "Fullscreen"}
          </button>
        </div>
      </div>

      {loading && <div className={styles.meta}>Loading…</div>}
      {error && <div className={styles.bad}>{error}</div>}

      <div className={`${styles.stage} ${fullscreen ? styles.stageFull : ""}`} ref={hostRef}>
        <svg
          ref={svgRef}
          className={styles.svg}
          viewBox={`0 0 ${size.w} ${size.h}`}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={(e)=>{ onMouseMove(e); onPointerMove(e); }}
          onMouseUp={onMouseUpOrLeave}
          onMouseLeave={()=>{ onMouseUpOrLeave(); clearTip(); }}
        >
          {/* viewport (pan + zoom) */}
          <g ref={viewportRef} transform={`translate(${tx},${ty}) scale(${zoom})`}>
            {/* floor grid */}
            <g className={styles.grid}>
              {Array.from({ length: weeks }).map((_, w) =>
                Array.from({ length: 7 }).map((__, d) => {
                  const { cx, cy } = center(w, d);
                  const top = `${cx},${cy - cellH/2}`;
                  const right = `${cx + cellW/2},${cy}`;
                  const bottom = `${cx},${cy + cellH/2}`;
                  const left = `${cx - cellW/2},${cy}`;
                  return (
                    <polygon
                      key={`g-${w}-${d}`}
                      points={`${top} ${right} ${bottom} ${left}`}
                      className={styles.gridTile}
                    />
                  );
                })
              )}
            </g>

            {/* columns */}
            <g className={`${styles.columns} ${xray ? styles.columnsXray : ""}`}>
              {boxes.map((b) => (
                <g key={b.key}>
                  <polygon points={b.left}  style={{ fill: b.colors.left }}  className={`${styles.face} ${styles.faceLeft}`} />
                  <polygon points={b.right} style={{ fill: b.colors.right }} className={`${styles.face} ${styles.faceRight}`} />
                  <polygon points={b.top}   style={{ fill: b.colors.top }}   className={`${styles.faceTop}`} />
                </g>
              ))}
            </g>
          </g>

          {/* HUD */}
          <g className={styles.hud} transform={`translate(${size.w - 260}, 26)`}>
            <text className={styles.hudTitle} x={0} y={0}>Stats</text>
            <text className={styles.hudLine}  x={0} y={18}>
              Highest day: {metric === "steps"
                ? Math.round(highest).toLocaleString()
                : highest.toLocaleString(undefined,{maximumFractionDigits:2})}
            </text>
            <text className={styles.hudLine}  x={0} y={36}>
              Average/day: {metric === "steps" ? average.toFixed(0) : average.toFixed(2)}
            </text>
            <text className={styles.hudLine}  x={0} y={54}>
              Range: last {effectiveDays} days
            </text>
          </g>

          {/* tooltip (root SVG space) */}
          {tip && (
            <foreignObject x={tip.x - 130} y={tip.y - 36} width="260" height="44">
              <div className={styles.tooltip} dangerouslySetInnerHTML={{ __html: tip.html }} />
            </foreignObject>
          )}
        </svg>
      </div>

      <div className={styles.footer}>
        <span className={styles.meta}>
          Drag to pan • Scroll to zoom • Week 0 on the <b>right</b> • {xray ? "X-ray on" : "X-ray off"}.
        </span>
      </div>
    </div>
  );
}
