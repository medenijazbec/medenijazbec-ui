// src/pages/fitness/ShealthCaloriesMini.tsx
import React, { useEffect, useMemo, useRef } from "react";
import ApexCharts, { type ApexOptions } from "apexcharts";
import { useShealthHistory } from "./ShealthHistoryModule.logic"; // re-use your hook
import styles from "./ShealthCaloriesMini.module.css";

function tsFirstOfMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return Date.UTC(y, (m || 1) - 1, 1);
}
function daysInMonthFromYM(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, (m || 1), 0).getDate();
}

export default function ShealthCaloriesMini() {
  const { months, loading, error } = useShealthHistory();

  // ---- Gym energy model (given): 4 hypertrophy days + 1 legs day per week
  // Per-session kcals (88 kg, 75 min)
  const UPPER_KCAL = 404;           // ~3.5 MET
  const LEGS_KCAL_MOD = 578;        // ~5.0 MET
  const LEGS_KCAL_VIG = 693;        // ~6.0 MET (toggle below)
  const VIGOROUS_LEG_DAY = false;   // set true to assume ~6.0 MET legs day
  const WEEKLY_GYM_KCAL =
    4 * UPPER_KCAL + (VIGOROUS_LEG_DAY ? LEGS_KCAL_VIG : LEGS_KCAL_MOD); // ≈ 2195 or 2310

  // Pedometer calories only (from DB)
  const pedoSeries = useMemo(
    () =>
      months.map((m) => ({
        x: tsFirstOfMonth(m.ym),
        y: Number(m.totalCalories || 0),
        days: m.items.length,
        dim: daysInMonthFromYM(m.ym),
      })),
    [months]
  );

  // Hypothetical ALL calories = pedometer + gym (assuming 5/7 gym days each week)
  const allSeries = useMemo(
    () =>
      months.map((m) => {
        const dim = daysInMonthFromYM(m.ym);
        const gymMonth = (dim / 7) * WEEKLY_GYM_KCAL; // proportion of weeks in the month
        const pedo = Number(m.totalCalories || 0);
        return {
          x: tsFirstOfMonth(m.ym),
          y: Math.round(pedo + gymMonth),
          pedo,
          gym: Math.round(gymMonth),
          days: m.items.length,
          dim,
        };
      }),
    [months, WEEKLY_GYM_KCAL]
  );

  const C_HYPER = "#00ff66";  // bright phosphor (All calories)
  const C_ACCENT = "#7ef2b7"; // softer mint (Pedometer only)
  const GRID = "rgba(16,185,129,0.22)";
  const LABEL = "#aef5d4";

  const opts = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "area",
        height: 180, // slimmer height
        background: "transparent",
        toolbar: { show: false },
        animations: { enabled: false },
        foreColor: LABEL,
      },
      colors: [C_HYPER, C_ACCENT],
      stroke: { width: [3, 2], curve: "smooth" },
      fill: {
        type: "gradient",
        opacity: [0.22, 0.14],
        gradient: {
          shadeIntensity: 0.35,
          opacityFrom: 0.28,
          opacityTo: 0.06,
          stops: [0, 90, 100],
        },
      },
      grid: { borderColor: GRID, strokeDashArray: 4, padding: { left: 8, right: 8, top: 4, bottom: 0 } },
      dataLabels: { enabled: false },
      markers: { size: 0, hover: { size: 0 } },
      legend: { show: true, labels: { colors: LABEL } },
      xaxis: {
        type: "datetime",
        labels: {
          datetimeUTC: false,
          formatter: (n: string | number) => {
            const v = typeof n === "string" ? Number(n) : n;
            const d = new Date(Number(v || 0));
            return isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { year: "2-digit", month: "short" });
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tickAmount: 8,
      },
      yaxis: {
        title: { text: "kcal" },
        labels: { formatter: (v: number) => Math.round(v).toLocaleString() },
      },
      tooltip: {
        shared: true,
        theme: "dark",
        x: { show: false },
        custom: ({ dataPointIndex = 0, series = [], w }) => {
          // X (month)
          const xs =
            w?.globals?.seriesX?.[0]?.[dataPointIndex] ??
            w?.globals?.seriesX?.[1]?.[dataPointIndex];
          const d = xs != null ? new Date(Number(xs)) : null;
          const title = d ? d.toLocaleDateString(undefined, { year: "numeric", month: "long" }) : "";

          // Series values
          const allVal = Number(series?.[0]?.[dataPointIndex] ?? 0);
          const pedoVal = Number(series?.[1]?.[dataPointIndex] ?? 0);
          const gymVal = Math.max(0, allVal - pedoVal);

          const days =
            allSeries?.[dataPointIndex]?.days ??
            pedoSeries?.[dataPointIndex]?.days ??
            0;

          const avgAll = days > 0 ? Math.round(allVal / days) : 0;
          const avgPedo = days > 0 ? Math.round(pedoVal / days) : 0;
          const avgGym = days > 0 ? Math.round(gymVal / days) : 0;

          return `<div style="padding:.28rem .55rem">
            <div><b>${title}</b></div>
            <div style="margin-top:2px"><b>All (with gym):</b> ${allVal.toLocaleString()} kcal <span style="opacity:.8">(${avgAll.toLocaleString()} / day)</span></div>
            <div>Steps only: ${pedoVal.toLocaleString()} kcal <span style="opacity:.8">(${avgPedo.toLocaleString()} / day)</span></div>
            <div style="opacity:.9">+ Gym est.: ${gymVal.toLocaleString()} kcal <span style="opacity:.8">(${avgGym.toLocaleString()} / day)</span></div>
          </div>`;
        },
      },
      series: [
        { name: "All calories (with gym)", type: "area", data: allSeries },
        { name: "Samsung Steps calories", type: "area", data: pedoSeries },
      ],
      noData: { text: loading ? "Loading…" : (error || "No data") },
    }),
    [allSeries, pedoSeries, loading, error]
  );

  const elRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ApexCharts | null>(null);

  useEffect(() => {
    if (!elRef.current) return;
    if (!chartRef.current) {
      chartRef.current = new ApexCharts(elRef.current, opts);
      chartRef.current.render().catch(() => {});
    } else {
      chartRef.current.updateOptions(opts as ApexOptions, false, true);
    }
  }, [opts]);

  useEffect(() => {
    return () => {
      try { chartRef.current?.destroy(); } catch {}
      chartRef.current = null;
    };
  }, []);

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <div className={styles.title}>Monthly calories</div>
        <div className={styles.sub}>Samsung Steps vs. hypothetical gym-added total</div>
      </div>
      <div ref={elRef} className={styles.chart} />
    </div>
  );
}
