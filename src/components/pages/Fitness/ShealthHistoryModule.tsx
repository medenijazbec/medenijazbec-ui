import React, { useEffect, useMemo, useRef, useState } from "react";
import { useShealthHistory } from "./ShealthHistoryModule.logic";
import styles from "./ShealthHistoryModule.module.css";

type Metric = "steps" | "distance";
type Mode = "overview" | "zoom";

const ShealthHistoryModule: React.FC = () => {
  const { months, extremes, loading, error } = useShealthHistory();
  const [metric, setMetric] = useState<Metric>("steps");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 800, h: 320 });
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("overview");

  // keep track of the currently zoomed month index
  const [zoomMonthIdx, setZoomMonthIdx] = useState<number | null>(null);

  // resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
        setSize({ w: Math.max(300, cr.width), h: 320 });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ESC to go back to overview
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMode("overview");
        setZoomMonthIdx(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const monthCount = months.length;
  const padL = 36, padR = 10, padT = 10, padB = 22;
  const W = size.w, H = size.h;
  const innerW = Math.max(0, W - padL - padR);
  const innerH = Math.max(0, H - padT - padB);
  const monthW = monthCount > 0 ? innerW / monthCount : innerW;

  const maxMonthly = useMemo(() => {
    if (!months.length) return 1;
    return Math.max(
      ...months.map((m) => (metric === "steps" ? m.totalSteps : m.totalKm))
    );
  }, [months, metric]);

  const yScaleMonthly = (v: number) => innerH * (v / Math.max(1, maxMonthly));

  // Which month is under the cursor (based on X)
  const hoveredMonthIdx = useMemo(() => {
    if (hoverX == null || !months.length) return null;
    const x = Math.min(Math.max(hoverX - padL, 0), innerW - 1);
    return Math.min(monthCount - 1, Math.max(0, Math.floor(x / monthW)));
  }, [hoverX, months, monthCount, monthW, innerW, padL]);

  // Tooltip
  const [tip, setTip] = useState<{ left: number; top: number; text: string } | null>(null);

  const onMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHoverX(x);

    // Enter zoom mode on hover
    if (mode !== "zoom") setMode("zoom");

    // Update zoomed month to the one under cursor
    if (hoveredMonthIdx != null) setZoomMonthIdx(hoveredMonthIdx);

    // tip is set below (in an effect) once we know which bar/day we're over
    setTip((prev) => (prev ? { ...prev, left: x, top: y - 10 } : null));
  };
  const onLeave = () => {
    setHoverX(null);
    setTip(null);
    // Optional: return to overview on leave. If you want ESC-only, comment this out.
    setMode("overview");
    setZoomMonthIdx(null);
  };

  // Build the "zoom" model for the current month:
  // - full width allocation for all days in that month
  // - scale to that month's max day
  const zoom = useMemo(() => {
    if (mode !== "zoom" || zoomMonthIdx == null) return null;
    const month = months[zoomMonthIdx];
    if (!month) return null;

    const days = month.items;
    const lm = 6; // inner margin for nicer padding
    const dayW = Math.max(1, (innerW - lm * 2) / Math.max(days.length, 1));
    const maxDay = Math.max(
      ...days.map((d) =>
        metric === "steps" ? (d.steps ?? 0) : Number(d.distanceKm ?? 0)
      ),
      1
    );
    const scaleDay = (v: number) => (innerH - lm * 2) * (v / maxDay);

    const bars = days.map((d, i) => {
      const v = metric === "steps" ? (d.steps ?? 0) : Number(d.distanceKm ?? 0);
      const bh = scaleDay(v);
      const bx = padL + lm + i * dayW;
      const by = padT + (innerH - lm - bh);
      return {
        key: d.day,
        x: bx,
        y: by,
        w: Math.max(1, dayW - 1),
        h: bh,
        v,
        date: d.day,
      };
    });

    return {
      ym: month.ym,
      bars,
      lm,
      dayW,
    };
  }, [mode, zoomMonthIdx, months, innerW, innerH, padL, padT, metric]);

  // Compute tooltip while moving (zoom mode shows per-day tips)
  useEffect(() => {
    if (!zoom || hoverX == null) {
      setTip(null);
      return;
    }
    const x = hoverX;
    const firstX = zoom.bars.length ? zoom.bars[0].x : padL + zoom.lm;
    const idx = Math.min(
      Math.max(0, Math.floor((x - firstX) / Math.max(1, zoom.dayW))),
      Math.max(0, zoom.bars.length - 1)
    );
    const b = zoom.bars[idx];
    if (!b) {
      setTip(null);
      return;
    }
    const val =
      metric === "steps"
        ? `${(b.v as number).toLocaleString()} steps`
        : `${(b.v as number).toLocaleString(undefined, { maximumFractionDigits: 2 })} km`;
    setTip({
      left: b.x + b.w / 2,
      top: b.y,
      text: `${b.date}: ${val}`,
    });
  }, [zoom, hoverX, metric]);

  const prettyYM = (ym: string) => {
    const [y] = ym.split("-");
    const month = new Date(`${ym}-01T00:00:00Z`).toLocaleString(undefined, {
      month: "short",
    });
    return `${month} ${y}`;
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.row}>
          <label className={styles.meta}>Metric:&nbsp;</label>
          <select
            className={styles.select}
            value={metric}
            onChange={(e) => setMetric(e.target.value as Metric)}
          >
            <option value="steps">Steps</option>
            <option value="distance">Distance (km)</option>
          </select>
          <div className={styles.meta}>
            Hover a month to <b>zoom</b> (fills the whole chart). Press <b>Esc</b> to return.
          </div>
        </div>

        {loading && <div className={styles.meta}>Loading…</div>}
        {error && <div className={styles.bad}>{error}</div>}

        <div
          className={styles.chartWrap}
          ref={containerRef}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          onMouseEnter={() => setTip(null)}
        >
          <svg role="img" aria-label="Samsung Health timeline with month zoom">
            {/* OVERVIEW: monthly bars */}
            <g
              className={styles.overviewGroup}
              style={{ opacity: mode === "overview" ? 1 : 0 }}
            >
              {months.map((m, i) => {
                const v = metric === "steps" ? m.totalSteps : m.totalKm;
                const h = yScaleMonthly(v);
                const x = padL + i * monthW + 1;
                const y = padT + (innerH - h);
                const w = Math.max(1, monthW - 2);
                return (
                  <rect
                    key={m.ym}
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    className={styles.monthlyBar}
                  />
                );
              })}

              {/* Year ticks on the overview axis */}
              <line
                className={styles.axis}
                x1={padL}
                y1={padT + innerH}
                x2={padL + innerW}
                y2={padT + innerH}
              />
              {months.map((m, i) => {
                const yy = m.ym.slice(0, 4);
                const prev = i > 0 ? months[i - 1].ym.slice(0, 4) : null;
                if (yy === prev) return null;
                const x = padL + i * monthW;
                return (
                  <g key={yy} className={styles.yearTick}>
                    <line x1={x} y1={padT + innerH} x2={x} y2={padT + innerH + 5} />
                    <text x={x + 2} y={padT + innerH + 16}>
                      {yy}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* ZOOM: per-day bars for the month under the cursor, spanning full width */}
            <g
              className={styles.zoomGroup}
              style={{ opacity: mode === "zoom" && zoom ? 1 : 0 }}
            >
              {/* background dim for context */}
              <rect
                x={padL}
                y={padT}
                width={innerW}
                height={innerH}
                className={styles.zoomBg}
              />

              {/* Day bars */}
              {zoom?.bars.map((b) => (
                <rect
                  key={b.key}
                  className={styles.dayBar}
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                />
              ))}

              {/* Month label */}
              {zoom && (
                <text x={padL + 6} y={padT + 14} className={styles.lensLabel}>
                  {prettyYM(zoom.ym)}
                </text>
              )}

              {/* X axis (month zoom) */}
              <line
                className={styles.axis}
                x1={padL}
                y1={padT + innerH}
                x2={padL + innerW}
                y2={padT + innerH}
              />
            </g>
          </svg>

          {tip && (
            <div
              className={styles.tooltip}
              style={{ left: tip.left, top: tip.top }}
            >
              {tip.text}
            </div>
          )}
        </div>
      </div>

      {/* Top lists */}
      <div className={styles.grid2}>
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Top 10 — Most steps</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th style={{ textAlign: "right" }}>Steps</th>
                <th style={{ textAlign: "right" }}>Distance (km)</th>
              </tr>
            </thead>
            <tbody>
              {extremes.bySteps.map((r) => (
                <tr key={`s-${r.day}`}>
                  <td className={styles.meta}>
                    {new Date(r.day + "T00:00:00Z").toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {(r.steps ?? 0).toLocaleString()}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {Number(r.distanceKm ?? 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Top 10 — Longest distance</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th style={{ textAlign: "right" }}>Distance (km)</th>
                <th style={{ textAlign: "right" }}>Steps</th>
              </tr>
            </thead>
            <tbody>
              {extremes.byDist.map((r) => (
                <tr key={`d-${r.day}`}>
                  <td className={styles.meta}>
                    {new Date(r.day + "T00:00:00Z").toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {Number(r.distanceKm ?? 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {(r.steps ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ShealthHistoryModule;
