import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./ShealthHistoryModule.module.css";
import { useShealthHistory } from "./ShealthHistoryModule.logic";
import ApexCharts, { type ApexOptions } from "apexcharts";

type Metric = "steps" | "distance";

function tsFirstOfMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return Date.UTC(y, (m || 1) - 1, 1);
}
const fmtDay = (iso: string) =>
  iso
    ? new Date(iso + "T00:00:00Z").toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

const weekday = (iso: string) =>
  iso
    ? new Date(iso + "T00:00:00Z").toLocaleDateString(undefined, { weekday: "long" })
    : "";

export default function ShealthHistoryModule() {
  const { months, rows, loading, error } = useShealthHistory();

  // ------- state -------
  const [metric, setMetric] = useState<Metric>("steps");
  const [hoverMonthIdx, setHoverMonthIdx] = useState<number>(-1);
  const [hoverDay, setHoverDay] = useState<{ date: string; value: number } | null>(null);

  // default to latest month
  useEffect(() => {
    if (months.length && hoverMonthIdx === -1) setHoverMonthIdx(months.length - 1);
  }, [months, hoverMonthIdx]);

  // ------- main (monthly) series -------
  const { mainSeries, avgSeries, yearMarkers, monthTicks } = useMemo(() => {
    const series = months.map((m) => ({
      x: tsFirstOfMonth(m.ym),
      y: metric === "steps" ? Number(m.totalSteps || 0) : Number(m.totalKm || 0),
    }));

    const avg: { x: number; y: number | null }[] = [];
    let acc = 0;
    for (let i = 0; i < series.length; i++) {
      acc += Number(series[i].y || 0);
      if (i >= 3) acc -= Number(series[i - 3].y || 0);
      avg.push({
        x: series[i].x,
        y: i >= 2 ? +(acc / 3).toFixed(metric === "steps" ? 0 : 2) : null,
      });
    }

    const years: number[] = [];
    const monthsXs: number[] = [];
    if (series.length) {
      const first = new Date(series[0].x);
      const last = new Date(series[series.length - 1].x);
      const cursor = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1));
      while (cursor <= last) {
        const x = Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1);
        monthsXs.push(x);
        if (cursor.getUTCMonth() === 0) years.push(x);
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    }

    return { mainSeries: series, avgSeries: avg, yearMarkers: years, monthTicks: monthsXs };
  }, [months, metric]);

  // ------- right panel (per-day bars) -------
  const monthDays = useMemo(() => {
    if (hoverMonthIdx < 0 || hoverMonthIdx >= months.length) return [];
    const mm = months[hoverMonthIdx].items;
    return mm.map((d) => ({
      x: d.day, // ISO date string
      y: metric === "steps" ? Number(d.steps || 0) : Number(d.distanceKm || 0),
    }));
  }, [months, hoverMonthIdx, metric]);

  // ------- top cards -------
  const totalDays = rows.length;
  const daysOver6k = rows.filter((r) => Number(r.steps || 0) > 6000).length;
  const daysWithKm = rows.filter((r) => Number(r.distanceKm || 0) > 0).length;

  const sparkSteps6000 = useMemo(
    () => months.map((m) => m.items.filter((d) => Number(d.steps || 0) > 6000).length),
    [months]
  );
  const sparkKmDays = useMemo(
    () => months.map((m) => m.items.filter((d) => Number(d.distanceKm || 0) > 0).length),
    [months]
  );
  const sparkAllDays = useMemo(() => months.map((m) => m.items.length), [months]);

  // ===================== Apex: refs =====================
  // containers
  const mainRef = useRef<HTMLDivElement | null>(null);
  const monthRef = useRef<HTMLDivElement | null>(null);
  const spark1Ref = useRef<HTMLDivElement | null>(null);
  const spark2Ref = useRef<HTMLDivElement | null>(null);
  const spark3Ref = useRef<HTMLDivElement | null>(null);

  // instances
  const mainChart = useRef<ApexCharts | null>(null);
  const monthChart = useRef<ApexCharts | null>(null);
  const spark1 = useRef<ApexCharts | null>(null);
  const spark2 = useRef<ApexCharts | null>(null);
  const spark3 = useRef<ApexCharts | null>(null);

  // render-state gates to avoid updateOptions before initial render() settles
  const mainRendered = useRef(false);
  const monthRendered = useRef(false);
  const spark1Rendered = useRef(false);
  const spark2Rendered = useRef(false);
  const spark3Rendered = useRef(false);

  // keep latest options for race-safe application after initial render
  const latestMainOptions = useRef<ApexOptions | null>(null);
  const latestMonthOptions = useRef<ApexOptions | null>(null);
  const latestSpark1Options = useRef<ApexOptions | null>(null);
  const latestSpark2Options = useRef<ApexOptions | null>(null);
  const latestSpark3Options = useRef<ApexOptions | null>(null);

  // ====== theme ======
  const C_PRIMARY = "#00ff66";
  const C_ACCENT = "#7ef2b7";
  const GRID = "rgba(16,185,129,0.22)";
  const LABEL = "#aef5d4";
  const LEGEND = "#b6ffe0";

  // ---------- MAIN (Monthly) ----------

  const mainOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "area",
        height: "100%",
        background: "transparent",
        toolbar: { show: false },
        foreColor: LABEL,
        animations: { enabled: false },
        events: {
          dataPointMouseEnter: (_e, _ctx, cfg) => {
            if (typeof cfg?.dataPointIndex === "number") setHoverMonthIdx(cfg.dataPointIndex);
          },
        },
      },
      colors: [C_PRIMARY, C_ACCENT],
      stroke: { width: 3, curve: "smooth" },
      fill: {
        type: "gradient",
        gradient: { shadeIntensity: 0.35, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 90, 100] },
      },
      dataLabels: { enabled: false },
      markers: { size: 0, hover: { size: 0 } },
      grid: { borderColor: GRID, strokeDashArray: 4, padding: { left: 8, right: 8, top: 8, bottom: 4 } },
      legend: { show: true, labels: { colors: LEGEND } },

      // ✅ custom tooltip (no dayjs)
      tooltip: {
        shared: true,
        theme: "dark",
        x: { show: false },
        custom: ({ dataPointIndex = 0, series = [], w }) => {
          const x =
            w?.globals?.seriesX?.[0]?.[dataPointIndex] ??
            w?.globals?.seriesX?.[1]?.[dataPointIndex] ??
            null;

          const d = x != null ? new Date(Number(x)) : null;
          const title = d
            ? d.toLocaleDateString(undefined, { year: "numeric", month: "short" })
            : "";

          const v0 = Number(series?.[0]?.[dataPointIndex] ?? NaN);
          const v1 = Number(series?.[1]?.[dataPointIndex] ?? NaN);

          const fmt = (val: number) =>
            metric === "steps"
              ? `${Math.round(val).toLocaleString()} steps`
              : `${val.toFixed(2)} km`;

          const line1 = Number.isFinite(v0) ? `<div>${fmt(v0)}</div>` : "";
          const line2 = Number.isFinite(v1) ? `<div>Avg: ${fmt(v1)}</div>` : "";

          return `<div style="padding:.28rem .55rem">
            <div><b>${title}</b></div>
            ${line1}${line2}
          </div>`;
        },
      },

      xaxis: {
        type: "datetime",
        labels: {
          datetimeUTC: false,
          style: { colors: LABEL },
          formatter: (val: string | number) => {
            const n = typeof val === "string" ? Number(val) : val;
            const d = new Date(Number(n || 0));
            return isNaN(d.getTime())
              ? ""
              : d.toLocaleDateString(undefined, { year: "2-digit", month: "short" });
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tickAmount: 8,
      },

      yaxis: {
        labels: {
          style: { colors: LABEL },
          formatter: (v) => (metric === "steps" ? Math.round(v).toLocaleString() : v.toFixed(1)),
        },
      },

      annotations: {
        xaxis: [
          ...monthTicks.map((x) => ({ x, borderColor: "rgba(0,255,102,0.15)", strokeDashArray: 4 })),
          ...yearMarkers.map((x) => ({
            x,
            borderColor: "rgba(0,255,102,0.4)",
            strokeDashArray: 0,
            label: {
              text: new Date(x).getUTCFullYear().toString(),
              borderColor: "rgba(0,255,102,0.25)",
              style: { color: "#c7ffe5", background: "rgba(7,26,20,0.9)", fontSize: "11px" },
              orientation: "vertical",
            },
          })),
        ],
      },

      series: [
        { name: metric === "steps" ? "Monthly steps" : "Monthly distance (km)", data: mainSeries },
        { name: metric === "steps" ? "3-month avg" : "3-month avg (km)", data: avgSeries },
      ],
      noData: { text: "No data" },
    }),
    [mainSeries, avgSeries, metric, monthTicks, yearMarkers]
  );

  // ---------- MONTH (per-day bars) ----------
  const monthOptions = useMemo<ApexOptions>(() => {
    const ymTitle =
      hoverMonthIdx >= 0 && hoverMonthIdx < months.length ? months[hoverMonthIdx].ym : "";
    const categories = monthDays.map((d) => String(d.x || ""));
    const values = monthDays.map((d) => Number(d.y || 0));

    return {
      chart: {
        type: "bar",
        height: "100%",
        background: "transparent",
        toolbar: { show: false },
        foreColor: LABEL,
        animations: { enabled: false },
        events: {
          dataPointMouseEnter: (_e, _ctx, cfg) => {
            const idx = cfg?.dataPointIndex ?? -1;
            const iso = categories[idx] || "";
            const val = values[idx] ?? 0;
            if (iso) setHoverDay({ date: iso, value: val });
          },
        },
      },
      plotOptions: { bar: { columnWidth: "70%", borderRadius: 4 } },
      colors: [C_PRIMARY],
      dataLabels: { enabled: false },
      grid: { borderColor: GRID, strokeDashArray: 4 },
      tooltip: {
        theme: "dark",
        x: { show: false },
        custom: ({ series, seriesIndex = 0, dataPointIndex = 0, w }) => {
          const iso =
            (w?.globals?.labels && w.globals.labels[dataPointIndex]) ||
            (w?.globals?.categoryLabels && w.globals.categoryLabels[dataPointIndex]) ||
            "";
          const raw = series?.[seriesIndex]?.[dataPointIndex];
          const val = Number(raw || 0);
          const valueText =
            metric === "steps"
              ? `${Math.round(val).toLocaleString()} steps`
              : `${val.toFixed(2)} km`;
          const dayText = iso ? fmtDay(String(iso)) : "";
          return `<div style="padding:.28rem .55rem">
              <div>${dayText}</div>
              <div><b>${valueText}</b></div>
            </div>`;
        },
      },
      xaxis: {
        type: "category",
        categories,
        labels: {
          rotate: -45,
          formatter: (v: string) => {
            if (!v) return "";
            const d = new Date(v + "T00:00:00Z");
            const day = d.getUTCDate();
            return Number.isNaN(day) ? "" : String(day);
          },
          style: { colors: LABEL },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: LABEL },
          formatter: (v) => (metric === "steps" ? Math.round(v).toLocaleString() : v.toFixed(1)),
        },
      },
      series: [{ name: ymTitle || "Month", data: values }],
      noData: { text: "No data" },
    };
  }, [monthDays, hoverMonthIdx, months, metric]);

  // ---------- Sparkline ----------
  const spark = (data: number[]): ApexOptions => ({
    chart: {
      type: "area",
      height: 60,
      sparkline: { enabled: true },
      animations: { enabled: false },
      toolbar: { show: false },
    },
    stroke: { width: 2, curve: "smooth" },
    fill: { type: "gradient", gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
    colors: [C_ACCENT],
    dataLabels: { enabled: false },
    series: [{ data: data.map((n) => Number(n || 0)) }],
    noData: { text: "No data" },
  });

  // ---------- Mount / update (race-safe) ----------
  useEffect(() => {
    latestMainOptions.current = mainOptions;
    const el = mainRef.current;

    if (el && !mainChart.current) {
      const chart = new ApexCharts(el, mainOptions);
      mainChart.current = chart;
      chart
        .render()
        .then(() => {
          mainRendered.current = true;
          // Apply latest options after initial render if they changed
          if (latestMainOptions.current) {
            chart.updateOptions(latestMainOptions.current as any, false, true);
          }
        })
        .catch(() => {
          // swallow to avoid breaking React tree
        });
    } else if (mainChart.current && mainRendered.current && latestMainOptions.current) {
      mainChart.current.updateOptions(latestMainOptions.current as any, false, true);
    }
  }, [mainOptions]);

  useEffect(() => {
    latestMonthOptions.current = monthOptions;
    const el = monthRef.current;

    if (el && !monthChart.current) {
      const chart = new ApexCharts(el, monthOptions);
      monthChart.current = chart;
      chart
        .render()
        .then(() => {
          monthRendered.current = true;
          if (latestMonthOptions.current) {
            chart.updateOptions(latestMonthOptions.current as any, false, true);
          }
        })
        .catch(() => {});
    } else if (monthChart.current && monthRendered.current && latestMonthOptions.current) {
      monthChart.current.updateOptions(latestMonthOptions.current as any, false, true);
    }
  }, [monthOptions]);

  useEffect(() => {
    const opts = spark(sparkAllDays);
    latestSpark1Options.current = opts;
    const el = spark1Ref.current;

    if (el && !spark1.current) {
      const chart = new ApexCharts(el, opts);
      spark1.current = chart;
      chart
        .render()
        .then(() => {
          spark1Rendered.current = true;
          if (latestSpark1Options.current) {
            chart.updateOptions(latestSpark1Options.current as any, false, true);
          }
        })
        .catch(() => {});
    } else if (spark1.current && spark1Rendered.current && latestSpark1Options.current) {
      spark1.current.updateOptions(latestSpark1Options.current as any, false, true);
    }
  }, [sparkAllDays]);

  useEffect(() => {
    const opts = spark(sparkSteps6000);
    latestSpark2Options.current = opts;
    const el = spark2Ref.current;

    if (el && !spark2.current) {
      const chart = new ApexCharts(el, opts);
      spark2.current = chart;
      chart
        .render()
        .then(() => {
          spark2Rendered.current = true;
          if (latestSpark2Options.current) {
            chart.updateOptions(latestSpark2Options.current as any, false, true);
          }
        })
        .catch(() => {});
    } else if (spark2.current && spark2Rendered.current && latestSpark2Options.current) {
      spark2.current.updateOptions(latestSpark2Options.current as any, false, true);
    }
  }, [sparkSteps6000]);

  useEffect(() => {
    const opts = spark(sparkKmDays);
    latestSpark3Options.current = opts;
    const el = spark3Ref.current;

    if (el && !spark3.current) {
      const chart = new ApexCharts(el, opts);
      spark3.current = chart;
      chart
        .render()
        .then(() => {
          spark3Rendered.current = true;
          if (latestSpark3Options.current) {
            chart.updateOptions(latestSpark3Options.current as any, false, true);
          }
        })
        .catch(() => {});
    } else if (spark3.current && spark3Rendered.current && latestSpark3Options.current) {
      spark3.current.updateOptions(latestSpark3Options.current as any, false, true);
    }
  }, [sparkKmDays]);

  // destroy on unmount (safe even if not rendered yet)
  useEffect(() => {
    return () => {
      try {
        mainChart.current?.destroy();
      } catch {}
      try {
        monthChart.current?.destroy();
      } catch {}
      try {
        spark1.current?.destroy();
      } catch {}
      try {
        spark2.current?.destroy();
      } catch {}
      try {
        spark3.current?.destroy();
      } catch {}
      mainChart.current = null;
      monthChart.current = null;
      spark1.current = null;
      spark2.current = null;
      spark3.current = null;
      mainRendered.current = false;
      monthRendered.current = false;
      spark1Rendered.current = false;
      spark2Rendered.current = false;
      spark3Rendered.current = false;
    };
  }, []);

  // ===================== Calendar heatmap =====================
  // Uses steps only for color intensity (darker = more steps)
  const calMonthTitle =
    hoverMonthIdx >= 0 && hoverMonthIdx < months.length ? months[hoverMonthIdx].ym : "";

  const calCells = useMemo(() => {
    if (hoverMonthIdx < 0 || hoverMonthIdx >= months.length) return { cells: [], max: 0 };
    const m = months[hoverMonthIdx];
    const [y, mnum] = m.ym.split("-").map(Number);
    const first = new Date(Date.UTC(y, (mnum || 1) - 1, 1));
    const daysInMonth = new Date(Date.UTC(y, (mnum || 1), 0)).getUTCDate();
    // Monday = 0 ... Sunday = 6
    const dowMon = (first.getUTCDay() + 6) % 7;

    const byDay = new Map<string, number>();
    let max = 0;
    for (const it of m.items) {
      const steps = Number(it.steps || 0);
      byDay.set(it.day, steps);
      if (steps > max) max = steps;
    }

    const cells: Array<{ iso?: string; dayNum?: number; steps?: number }> = [];
    for (let i = 0; i < dowMon; i++) cells.push({});
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = new Date(Date.UTC(y, (mnum || 1) - 1, d)).toISOString().slice(0, 10);
      const steps = byDay.get(iso) ?? 0;
      cells.push({ iso, dayNum: d, steps });
    }
    // pad to complete rows (up to 6 rows x 7 cols)
    while (cells.length % 7 !== 0) cells.push({});
    return { cells, max: Math.max(1, max) };
  }, [months, hoverMonthIdx]);

  function colorForSteps(steps: number, max: number) {
    const t = Math.max(0, Math.min(1, steps / max));
    const a = 0.12 + t * 0.78; // alpha from very light to strong
    return `rgba(0,255,102,${a.toFixed(3)})`;
  }

  // ------- UI -------
  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <div className={styles.cardSm}>
          <div className={styles.cardSmHead}>
            <div className={styles.kpiTitle}>Total days</div>
            <div className={styles.kpiValue}>{totalDays.toLocaleString()}</div>
          </div>
          <div ref={spark1Ref} className={styles.spark} />
        </div>

        <div className={styles.cardSm}>
          <div className={styles.cardSmHead}>
            <div className={styles.kpiTitle}>Days &gt; 6k steps</div>
            <div className={styles.kpiValue}>{daysOver6k.toLocaleString()}</div>
          </div>
          <div ref={spark2Ref} className={styles.spark} />
        </div>

        <div className={styles.cardSm}>
          <div className={styles.cardSmHead}>
            <div className={styles.kpiTitle}>Days with km</div>
            <div className={styles.kpiValue}>{daysWithKm.toLocaleString()}</div>
          </div>
          <div ref={spark3Ref} className={styles.spark} />
        </div>

        <div className={styles.controls}>
          <label className={styles.meta}>Metric:&nbsp;</label>
          <select
            className={styles.select}
            value={metric}
            onChange={(e) => setMetric(e.target.value as Metric)}
          >
            <option value="steps">Steps</option>
            <option value="distance">Distance (km)</option>
          </select>
        </div>
      </div>

      {loading && <div className={styles.meta}>Loading…</div>}
      {error && <div className={styles.bad}>{error}</div>}

      <div className={styles.grid}>
        <div className={styles.mainCard}>
          <div ref={mainRef} className={styles.mainChart} />
        </div>

        <div className={styles.rightCol}>
          {/* Per-month bars */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.cardTitle}>
                {hoverMonthIdx >= 0 && hoverMonthIdx < months.length ? months[hoverMonthIdx].ym : "Month"}
              </div>
              <div className={styles.meta}>Hover a month on the big chart</div>
            </div>
            <div ref={monthRef} className={styles.monthChart} />
          </div>

          {/* NEW: Calendar heatmap */}
          <div className={styles.card}>
            <div className={styles.calHead}>
              <div className={styles.cardTitle}>Daily steps calendar</div>
              <div className={styles.calNav}>
                <button
                  className={styles.calBtn}
                  onClick={() => setHoverMonthIdx((i) => Math.max(0, i - 1))}
                  disabled={hoverMonthIdx <= 0}
                  aria-label="Previous month"
                  title="Previous month"
                >
                  ◀
                </button>
                <div className={styles.calMonthLabel}>
                  {calMonthTitle || "—"}
                </div>
                <button
                  className={styles.calBtn}
                  onClick={() =>
                    setHoverMonthIdx((i) => Math.min(months.length - 1, (i < 0 ? months.length - 1 : i) + 1))
                  }
                  disabled={hoverMonthIdx >= months.length - 1}
                  aria-label="Next month"
                  title="Next month"
                >
                  ▶
                </button>
              </div>
            </div>

            <div className={styles.calWeekdays}>
              <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
            </div>

            <div className={styles.calGrid}>
              {calCells.cells.map((c, idx) => {
                const clickable = !!c.iso;
                const bg = c.steps != null ? colorForSteps(c.steps, calCells.max) : "transparent";
                return (
                  <div
                    key={idx}
                    className={`${styles.calCell} ${clickable ? styles.calCellHasData : styles.calCellEmpty}`}
                    style={{ background: bg }}
                    onMouseEnter={() => {
                      if (clickable) {
                        setHoverDay({
                          date: c.iso!,
                          value: months[hoverMonthIdx]?.items.find((d) => d.day === c.iso)?.steps || 0,
                        });
                      }
                    }}
                    onClick={() => {
                      if (clickable) {
                        setHoverDay({
                          date: c.iso!,
                          value: months[hoverMonthIdx]?.items.find((d) => d.day === c.iso)?.steps || 0,
                        });
                      }
                    }}
                    title={
                      c.iso
                        ? `${fmtDay(c.iso)} • ${(
                            months[hoverMonthIdx]?.items.find((d) => d.day === c.iso)?.steps || 0
                          ).toLocaleString()} steps`
                        : ""
                    }
                  >
                    {c.dayNum ?? ""}
                  </div>
                );
              })}
            </div>

            <div className={styles.calLegend}>
              <span className={styles.meta}>Less</span>
              <span className={styles.legendBar}>
                <i style={{ background: "rgba(0,255,102,0.12)" }} />
                <i style={{ background: "rgba(0,255,102,0.28)" }} />
                <i style={{ background: "rgba(0,255,102,0.48)" }} />
                <i style={{ background: "rgba(0,255,102,0.68)" }} />
                <i style={{ background: "rgba(0,255,102,0.9)" }} />
              </span>
              <span className={styles.meta}>More</span>
            </div>
          </div>

          {/* Day details */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.cardTitle}>Day</div>
              <div className={styles.meta}>Hover a bar in the month chart</div>
            </div>
            <div className={styles.dayBox}>
              {hoverDay ? (
                <>
                  <div className={styles.dayBig}>{fmtDay(hoverDay.date)}</div>
                  <div className={styles.dayWeek}>{weekday(hoverDay.date)}</div>
                  <div className={styles.dayVal}>
                    {metric === "steps"
                      ? `${Math.round(hoverDay.value).toLocaleString()} steps`
                      : `${hoverDay.value.toFixed(2)} km`}
                  </div>
                </>
              ) : (
                <div className={styles.muted}>No day selected yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
