import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./ShealthHistoryModule.module.css";
import { useShealthHistory, type FitnessRow } from "./ShealthHistoryModule.logic";

// We use ApexCharts directly so it works without extra React wrappers
// npm i apexcharts
import ApexCharts, { type ApexOptions } from "apexcharts";

type Metric = "steps" | "distance";
const RANGES = [30, 60, 90, 180, 365] as const;

function dateToUTC(d: Date) { return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); }
function isoUTC(d: Date)     { return new Date(dateToUTC(d)); }

function daysBetween(a: Date, b: Date) {
  return Math.round((dateToUTC(b) - dateToUTC(a)) / 86400000);
}
function addDays(d: Date, n: number) {
  const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x;
}

export default function ShealthHistoryModule() {
  const { rows, months, extremes, loading, error } = useShealthHistory();

  const [metric, setMetric] = useState<Metric>("steps");
  const [range, setRange]   = useState<number | "all">(365);

  // build a continuous per-day series for the selected range
  const { seriesDaily, seriesAvg, from, to, monthLines, yearLines } = useMemo(() => {
    const result = {
      seriesDaily: [] as { x: number; y: number | null }[],
      seriesAvg: [] as { x: number; y: number | null }[],
      from: null as Date | null,
      to: null as Date | null,
      monthLines: [] as number[],
      yearLines: [] as number[],
    };

    if (!rows.length) return { ...result, from: null, to: null };

    // map by date for quick lookup
    const map = new Map<string, FitnessRow>();
    for (const r of rows) map.set(r.day, r);

    const latest = isoUTC(new Date());         // today (UTC, 00:00)
    let earliest = isoUTC(new Date(rows[0].day + "T00:00:00Z"));
    for (const r of rows) {
      const d = isoUTC(new Date(r.day + "T00:00:00Z"));
      if (d < earliest) earliest = d;
    }

    // apply selected range
    const to  = latest;
    const from = range === "all"
      ? earliest
      : addDays(to, -Math.max(0, (range as number) - 1));

    // fill every day (show all days)
    const values: number[] = [];
    const points: { x:number; y:number }[] = [];

    let d = new Date(from);
    while (dateToUTC(d) <= dateToUTC(to)) {
      const key = d.toISOString().slice(0, 10);
      const rec = map.get(key);
      const val = metric === "steps"
        ? Math.max(0, Number(rec?.steps ?? 0))
        : Math.max(0, Number(rec?.distanceKm ?? 0));
      const x = dateToUTC(d);
      values.push(val);
      points.push({ x, y: val });
      d = addDays(d, 1);
    }

    // 7d moving average (for the second series)
    const avg: { x:number; y:number }[] = [];
    let sum = 0;
    const win = 7;
    for (let i = 0; i < values.length; i++) {
      sum += values[i];
      if (i >= win) sum -= values[i - win];
      const y = i >= win - 1 ? +(sum / win).toFixed(metric === "steps" ? 0 : 2) : null;
      avg.push({ x: points[i].x, y: y as any });
    }

    // month and year split lines
    const monthsXs: number[] = [];
    const yearsXs: number[] = [];
    const mStart = isoUTC(new Date(from));
    mStart.setUTCDate(1);
    while (mStart <= to) {
      const x = dateToUTC(mStart);
      monthsXs.push(x);
      if (mStart.getUTCMonth() === 0) yearsXs.push(x);
      // next month
      mStart.setUTCMonth(mStart.getUTCMonth() + 1);
    }

    result.seriesDaily = points;
    result.seriesAvg = avg;
    result.from = from;
    result.to = to;
    result.monthLines = monthsXs;
    result.yearLines = yearsXs;
    return result;
  }, [rows, metric, range]);

  // ---------------- ApexCharts ----------------
  const elRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ApexCharts | null>(null);

  // Make colors align with your theme
  const COLOR_PRIMARY = "#00ff66";  // phosphor
  const COLOR_AVG     = "#7ef2b7";  // lighter

  const buildOptions = (): ApexOptions => ({
    chart: {
      type: "area",
      height: "100%",
      fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue'",
      toolbar: { show: false },
      foreColor: "#aaf5d0",
      animations: { enabled: false },
      zoom: { enabled: false },
      background: "transparent",
    },
    stroke: { width: 3, curve: "smooth" },
    colors: [COLOR_PRIMARY, COLOR_AVG],
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 0.35,
        opacityFrom: 0.35,
        opacityTo: 0.02,
        stops: [0, 92, 100],
      },
    },
    grid: {
      show: true,
      borderColor: "rgba(16,185,129,0.22)",
      strokeDashArray: 4,
      padding: { left: 8, right: 8, top: 8, bottom: 4 },
    },
    legend: { show: true, labels: { colors: "#b6ffe0" } },
    tooltip: {
      enabled: true,
      shared: true,
      x: { format: "yyyy-MM-dd" },
      theme: "dark",
      y: {
        formatter: (val: number | null) => {
          if (val == null) return "";
          return metric === "steps"
            ? `${Math.round(val).toLocaleString()} steps`
            : `${val.toLocaleString(undefined,{maximumFractionDigits:2})} km`;
        },
      },
    },
     dataLabels: { enabled: false },    // 🔕 added
  markers: { size: 0, hover: { size: 0 } }, // 🔕 added
    xaxis: {
      type: "datetime",
      labels: {
        datetimeUTC: false,
        style: { colors: "#aef5d4" },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
      tickAmount: 8,
    },
    yaxis: {
      labels: {
        style: { colors: "#aef5d4" },
        formatter: (v) =>
          metric === "steps" ? Math.round(v).toLocaleString() : v.toFixed(1),
      },
    },
    annotations: {
      xaxis: [
        // month separators (thin dashed)
        ...monthLines.map((x) => ({
          x,
          strokeDashArray: 4,
          borderColor: "rgba(0,255,102,0.22)",
        })),
        // year separators (thicker)
        ...yearLines.map((x) => ({
          x,
          borderColor: "rgba(0,255,102,0.45)",
          strokeDashArray: 0,
          label: {
            text: new Date(x).getUTCFullYear().toString(),
            borderColor: "rgba(0,255,102,0.25)",
            style: {
              color: "#c7ffe5",
              background: "rgba(7,26,20,0.9)",
              fontSize: "11px",
            },
            orientation: "vertical",
          },
        })),
      ],
    },
    series: [
      { name: metric === "steps" ? "Daily steps" : "Daily distance (km)", data: seriesDaily },
      { name: metric === "steps" ? "7-day avg"   : "7-day avg (km)",      data: seriesAvg   },
    ],
  });

  // init & update
  useEffect(() => {
    if (!elRef.current) return;
    if (!chartRef.current) {
      chartRef.current = new ApexCharts(elRef.current, buildOptions());
      chartRef.current.render();
    } else {
      chartRef.current.updateOptions(buildOptions(), false, true);
    }
  }, [seriesDaily, seriesAvg, monthLines, yearLines, metric]); // eslint-disable-line

  useEffect(() => {
    // clean up on unmount
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, []);

  // Pretty range note
  const rangeNote = useMemo(() => {
    if (!from || !to) return "";
    const f = new Date(from).toLocaleDateString();
    const t = new Date(to).toLocaleDateString();
    const span = daysBetween(from, to) + 1;
    return `${f} → ${t} • ${span.toLocaleString()} days`;
  }, [from, to]);

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.row}>
          <label className={styles.meta}>Metric:&nbsp;</label>
          <select className={styles.select} value={metric} onChange={(e)=>setMetric(e.target.value as Metric)}>
            <option value="steps">Steps</option>
            <option value="distance">Distance (km)</option>
          </select>

          <div className={styles.sep} />

          <label className={styles.meta}>Range:&nbsp;</label>
          <select
            className={styles.select}
            value={String(range)}
            onChange={(e)=>setRange(e.target.value === "all" ? "all" : Number(e.target.value))}
          >
            {RANGES.map(d => <option key={d} value={d}>{d} days</option>)}
            <option value="all">All</option>
          </select>

          {rangeNote && <div className={`${styles.meta} ${styles.note}`}>• {rangeNote}</div>}
        </div>

        {loading && <div className={styles.meta}>Loading…</div>}
        {error && <div className={styles.bad}>{error}</div>}

        <div className={styles.chartCard}>
          <div ref={elRef} className={styles.chart} />
        </div>
      </div>

      {/* Top lists */}
      <div className={styles.grid2}>
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Top 10 — Most steps</h3>
          <table className={styles.table}>
            <thead><tr><th>Date</th><th style={{textAlign:"right"}}>Steps</th><th style={{textAlign:"right"}}>Distance (km)</th></tr></thead>
            <tbody>
              {extremes.bySteps.map(r => (
                <tr key={`s-${r.day}`}>
                  <td className={styles.meta}>{new Date(r.day+"T00:00:00Z").toLocaleDateString()}</td>
                  <td style={{textAlign:"right"}}>{(r.steps ?? 0).toLocaleString()}</td>
                  <td style={{textAlign:"right"}}>{Number(r.distanceKm ?? 0).toLocaleString(undefined,{maximumFractionDigits:2})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Top 10 — Longest distance</h3>
          <table className={styles.table}>
            <thead><tr><th>Date</th><th style={{textAlign:"right"}}>Distance (km)</th><th style={{textAlign:"right"}}>Steps</th></tr></thead>
            <tbody>
              {extremes.byDist.map(r => (
                <tr key={`d-${r.day}`}>
                  <td className={styles.meta}>{new Date(r.day+"T00:00:00Z").toLocaleDateString()}</td>
                  <td style={{textAlign:"right"}}>{Number(r.distanceKm ?? 0).toLocaleString(undefined,{maximumFractionDigits:2})}</td>
                  <td style={{textAlign:"right"}}>{(r.steps ?? 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
