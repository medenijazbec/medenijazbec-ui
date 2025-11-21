import React, { useEffect, useMemo, useRef, useState } from "react";
import ApexCharts, { type ApexOptions } from "apexcharts";
import styles from "./TradingChartsPanel.module.css";
import { useCandles, type SymbolConfig } from "./trandingCharts.logic";

type Props = {
  config: SymbolConfig;
  isFocused: boolean;
  onFocus: () => void;
};

const C_UP = "#00ff66";
const C_DOWN = "#ff6b6b";
const GRID = "rgba(16,185,129,0.22)";
const LABEL = "#aef5d4";

/** Safe parse of timeframe code into minutes. */
function timeframeCodeToMinutes(code: string): number | null {
  const c = (code || "").trim().toLowerCase();
  if (!c) return null;
  // 1m, 3m, 5m, 15m, 30m, 45m
  const m = c.match(/^(\d+)\s*m$/);
  if (m) return Math.max(1, parseInt(m[1], 10));
  // 1h, 2h, 4h, 6h, 12h
  const h = c.match(/^(\d+)\s*h$/);
  if (h) return Math.max(1, parseInt(h[1], 10) * 60);
  // 1d, 2d
  const d = c.match(/^(\d+)\s*d$/);
  if (d) return Math.max(1, parseInt(d[1], 10) * 1440);
  return null;
}

/** Median of numeric array. */
function median(nums: number[]): number {
  if (!nums.length) return 0;
  const a = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

/** Derive expected candle interval in ms from timeframeCode or from data. */
function inferIntervalMs(timeframeCode: string, xs: number[]): number {
  const fromCodeMin = timeframeCodeToMinutes(timeframeCode);
  if (fromCodeMin) return fromCodeMin * 60_000;

  // Fallback: median of small diffs (ignore huge gaps)
  const diffs: number[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const d = xs[i + 1] - xs[i];
    if (d > 0 && d <= 120 * 60_000) diffs.push(d); // <= 2h
  }
  const m = median(diffs);
  // Clamp to at least 1 minute
  return Math.max(60_000, Math.round(m || 60_000));
}

export default function TradingChartCard({ config, isFocused, onFocus }: Props) {
  const { symbol, label, timeframeCode } = config;

  const { candles, loading, error } = useCandles(symbol, timeframeCode, 300);

  const elRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ApexCharts | null>(null);

  // Local maximize state (site-level "fullscreen")
  const [isMax, setIsMax] = useState(false);

  // --- 1) Sort candles by time (ascending) to be 100% sure ---
  const sortedCandles = useMemo(
    () =>
      [...candles].sort(
        (a, b) =>
          new Date(a.openTimeUtc).getTime() -
          new Date(b.openTimeUtc).getTime()
      ),
    [candles]
  );

  // Precompute raw timestamps (ms)
  const ts = useMemo(
    () => sortedCandles.map((c) => new Date(c.openTimeUtc).getTime()),
    [sortedCandles]
  );

  // --- 2) Build series from sorted candles ---
  const candlestickSeries = useMemo(
    () =>
      sortedCandles.map((c) => ({
        x: new Date(c.openTimeUtc).getTime(),
        y: [c.open, c.high, c.low, c.close],
      })),
    [sortedCandles]
  );

  const closeLineSeries = useMemo(
    () =>
      sortedCandles.map((c) => ({
        x: new Date(c.openTimeUtc).getTime(),
        y: c.close,
      })),
    [sortedCandles]
  );

  // --- 3) Compute a "nice" y-range that ignores crazy outliers ---
  const yRange = useMemo(() => {
    if (!sortedCandles.length) return null;

    const closes = sortedCandles.map((c) => c.close).sort((a, b) => a - b);
    const n = closes.length;
    const idxLow = Math.floor(n * 0.02); // 2nd percentile
    const idxHigh = Math.floor(n * 0.98); // 98th percentile
    const baseMin = closes[idxLow];
    const baseMax = closes[idxHigh];

    if (!Number.isFinite(baseMin) || !Number.isFinite(baseMax)) {
      return null;
    }

    const span = baseMax - baseMin || 1;
    const pad = span * 0.1; // 10% padding

    return {
      min: baseMin - pad,
      max: baseMax + pad,
    };
  }, [sortedCandles]);

  // --- 4) Day separators (visual only) ---
  const dayLines = useMemo(() => {
    if (ts.length === 0) return [] as any[];

    // put a dotted line at each UTC midnight covered by the range
    const DAY_MS = 24 * 60 * 60 * 1000;
    const startDay = Date.UTC(
      new Date(ts[0]).getUTCFullYear(),
      new Date(ts[0]).getUTCMonth(),
      new Date(ts[0]).getUTCDate()
    );
    const endDay = Date.UTC(
      new Date(ts[ts.length - 1]).getUTCFullYear(),
      new Date(ts[ts.length - 1]).getUTCMonth(),
      new Date(ts[ts.length - 1]).getUTCDate()
    );

    const lines: any[] = [];
    for (let t = startDay; t <= endDay + DAY_MS; t += DAY_MS) {
      const label = new Date(t).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      lines.push({
        x: t,
        borderColor: "rgba(148,163,184,0.5)",
        strokeDashArray: 3,
        label: {
          text: label,
          orientation: "horizontal",
          offsetY: -8,
          borderColor: "transparent",
          style: {
            color: "#9ca3af",
            background: "transparent",
            fontSize: "10px",
          },
        },
      });
    }
    return lines;
  }, [ts]);

  // --- 5) PRE/POST shading from *data gaps* (your requirement)
  // For each big gap between candles, shade from (last_candle_open + interval)
  // through (next_candle_open). This exactly marks the market-closed segment.
  const prePostBlocks = useMemo(() => {
    if (ts.length < 2) return [] as any[];

    const intervalMs = inferIntervalMs(timeframeCode, ts);
    // Threshold that counts as a "session break":
    // at least either 90 minutes or 5x interval, whichever is larger.
    const GAP_THRESHOLD = Math.max(90 * 60_000, 5 * intervalMs);

    const blocks: any[] = [];
    for (let i = 0; i < ts.length - 1; i++) {
      const cur = ts[i];
      const nxt = ts[i + 1];
      const gap = nxt - cur;

      if (gap > GAP_THRESHOLD) {
        const start = cur + intervalMs; // end of the last candle
        const end = nxt;                // start of the first candle next session
        if (end > start) {
          blocks.push({
            x: start,
            x2: end,
            fillColor: "rgba(0,255,102,0.10)",
            opacity: 0.5,
            borderColor: "transparent",
            label: {
              text: "PRE/POST DATA",
              orientation: "horizontal",
              offsetY: 22,
              borderColor: "rgba(16,185,129,0.45)",
              style: {
                color: "#a7f3d0",
                background: "rgba(7,26,20,0.75)",
                fontSize: "10px",
              },
            },
          });
        }
      }
    }
    return blocks;
  }, [ts, timeframeCode]);

  const options = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "candlestick",
        height: "100%",
        background: "transparent",
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true,
          },
          autoSelected: "zoom",
        },
        zoom: {
          enabled: true,
          type: "x",
          autoScaleYaxis: true,
        },
        animations: { enabled: false },
        foreColor: LABEL,
      },
      grid: {
        borderColor: GRID,
        strokeDashArray: 4,
        padding: { left: 8, right: 8, top: 8, bottom: 4 },
      },
      plotOptions: {
        candlestick: {
          colors: {
            upward: C_UP,
            downward: C_DOWN,
          },
          wick: {
            useFillColor: true,
          },
        },
      },
      xaxis: {
        type: "datetime",
        labels: {
          datetimeUTC: false,
          style: { colors: LABEL },
          formatter: (value: string | number) => {
            const n = typeof value === "string" ? Number(value) : value;
            const d = new Date(Number(n || 0));
            if (Number.isNaN(d.getTime())) return "";
            return d.toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            });
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tickAmount: 8,
      },
      yaxis: {
        min: yRange?.min,
        max: yRange?.max,
        labels: {
          style: { colors: LABEL },
          formatter: (v: number) => v.toFixed(2),
        },
        tooltip: { enabled: true },
      },
      tooltip: {
        shared: false,
        theme: "dark",
        x: {
          show: true,
          formatter: (value: number) =>
            new Date(value).toLocaleString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
        },
        custom: (cfg) => {
          const { dataPointIndex, w } = cfg;
          const ohlc =
            w?.config?.series?.[0]?.data?.[dataPointIndex] as
              | { x: number; y: [number, number, number, number] }
              | undefined;

          if (!ohlc) return "";
          const [open, high, low, close] = ohlc.y;
          const tsVal = ohlc.x;
          const timeStr = new Date(tsVal).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          const isUp = close >= open;
          const dirLabel = isUp ? "Bullish" : "Bearish";
          const color = isUp ? C_UP : C_DOWN;

          return `<div style="padding:.28rem .55rem">
            <div style="margin-bottom:2px"><b>${timeStr}</b></div>
            <div>O: ${open.toFixed(4)}</div>
            <div>H: ${high.toFixed(4)}</div>
            <div>L: ${low.toFixed(4)}</div>
            <div>C: <span style="color:${color}">${close.toFixed(
              4
            )}</span></div>
            <div style="margin-top:2px;font-size:11px;opacity:.85;color:${color}">${dirLabel}</div>
          </div>`;
        },
      },
      legend: {
        show: true,
        labels: { colors: LABEL },
      },
      annotations: {
        // Paint PRE/POST blocks derived from gaps, then day lines on top
        xaxis: [...prePostBlocks, ...dayLines],
      },
      series: [
        {
          name: `${symbol} ${timeframeCode}`,
          type: "candlestick",
          data: candlestickSeries,
        },
        {
          name: "Close",
          type: "line",
          data: closeLineSeries,
        },
      ],
      noData: {
        text: loading
          ? "Loading…"
          : error ?? "No candles for this symbol / timeframe yet.",
        align: "center",
        verticalAlign: "middle",
      },
    }),
    [
      symbol,
      timeframeCode,
      candlestickSeries,
      closeLineSeries,
      loading,
      error,
      yRange,
      dayLines,
      prePostBlocks,
    ]
  );

  useEffect(() => {
    if (!elRef.current) return;

    if (!chartRef.current) {
      chartRef.current = new ApexCharts(elRef.current, options);
      chartRef.current.render().catch(() => {});
    } else {
      chartRef.current.updateOptions(options as ApexOptions, false, true);
    }
  }, [options]);

  useEffect(() => {
    return () => {
      try {
        chartRef.current?.destroy();
      } catch {
        // ignore
      }
      chartRef.current = null;
    };
  }, []);

  const handleCardClick = () => {
    onFocus();
  };

  return (
    <div
      className={`${styles.chartCard} ${
        isFocused ? styles.chartCardFocused : ""
      } ${isMax ? styles.chartCardMax : ""}`}
      onClick={handleCardClick}
    >
      <div className={styles.chartHead}>
        <div>
          <div className={styles.chartTitle}>{label}</div>
          <div className={styles.chartSub}>
            {symbol} · {timeframeCode} · candlesticks
          </div>
        </div>

        <div className={styles.chartHeadRight}>
          <div className={styles.chartLegendHint}>
            <span className={styles.pillUp}>Up</span>
            <span className={styles.pillDown}>Down</span>
            <span className={styles.pillPrePost}>PRE/POST shaded</span>
          </div>

          <button
            type="button"
            className={styles.maxBtn}
            onClick={(e) => {
              e.stopPropagation();
              setIsMax(true);
            }}
            aria-label="Maximize chart"
          >
            ⤢ Maximize
          </button>
        </div>
      </div>

      {isMax && (
        <button
          type="button"
          className={styles.closeMaxBtn}
          onClick={(e) => {
            e.stopPropagation();
            setIsMax(false);
          }}
          aria-label="Close maximized chart"
        >
          ×
        </button>
      )}

      <div ref={elRef} className={styles.chartBody} />
      {/* PRE/POST shaded blocks are computed from data gaps: 
          from (last candle open + interval) -> (next candle open). */}
    </div>
  );
}
