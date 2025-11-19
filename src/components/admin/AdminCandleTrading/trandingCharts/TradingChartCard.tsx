import React, { useEffect, useMemo, useRef } from "react";
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

const DAY_MS = 24 * 60 * 60 * 1000;

/** Start of UTC day (00:00) for a given timestamp. */
function startOfUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Nth weekday of a month (UTC). weekday: 0=Sun..6=Sat, month: 0=Jan..11=Dec. */
function nthWeekdayOfMonthUtc(
  year: number,
  month: number,
  weekday: number,
  n: number
): number {
  const first = new Date(Date.UTC(year, month, 1));
  const firstDow = first.getUTCDay();
  const offset = (weekday - firstDow + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  return Date.UTC(year, month, day);
}

/** Last weekday of a month (UTC). weekday: 0=Sun..6=Sat. */
function lastWeekdayOfMonthUtc(
  year: number,
  month: number,
  weekday: number
): number {
  const last = new Date(Date.UTC(year, month + 1, 0)); // last day
  const lastDow = last.getUTCDay();
  const offset = (lastDow - weekday + 7) % 7;
  const day = last.getUTCDate() - offset;
  return Date.UTC(year, month, day);
}

/** Holiday that is observed on Fri/Mon if it falls on weekend. */
function observedDateUtc(year: number, month: number, day: number): number {
  const d = new Date(Date.UTC(year, month, day));
  const dow = d.getUTCDay();
  if (dow === 6) {
    // Saturday -> Friday
    return Date.UTC(year, month, day - 1);
  }
  if (dow === 0) {
    // Sunday -> Monday
    return Date.UTC(year, month, day + 1);
  }
  return d.getTime();
}

/** Easter Sunday (UTC) using Meeus/Jones/Butcher algorithm. */
function easterSundayUtc(year: number): number {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(year, month - 1, day);
}

/** Good Friday (UTC) = 2 days before Easter Sunday. */
function goodFridayUtc(year: number): number {
  const easter = easterSundayUtc(year);
  const d = new Date(easter);
  d.setUTCDate(d.getUTCDate() - 2);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

type MarketHoliday = { dateMs: number; name: string };

/**
 * US equity market holidays (NYSE/Nasdaq-like) for a given year.
 * Returned as UTC midnight timestamps + human label.
 */
function getUsMarketHolidaysUtc(year: number): MarketHoliday[] {
  const holidays: MarketHoliday[] = [];

  const pushObserved = (month: number, day: number, name: string) => {
    holidays.push({ dateMs: observedDateUtc(year, month, day), name });
  };

  // New Year's Day (observed)
  pushObserved(0, 1, "New Year’s Day");

  // Martin Luther King Jr. Day — 3rd Monday in Jan
  holidays.push({
    dateMs: nthWeekdayOfMonthUtc(year, 0, 1, 3),
    name: "MLK Jr. Day",
  });

  // Presidents’ Day (Washington’s Birthday) — 3rd Monday in Feb
  holidays.push({
    dateMs: nthWeekdayOfMonthUtc(year, 1, 1, 3),
    name: "Presidents’ Day",
  });

  // Good Friday
  holidays.push({ dateMs: goodFridayUtc(year), name: "Good Friday" });

  // Memorial Day — last Monday in May
  holidays.push({
    dateMs: lastWeekdayOfMonthUtc(year, 4, 1),
    name: "Memorial Day",
  });

  // Juneteenth (observed)
  pushObserved(5, 19, "Juneteenth");

  // Independence Day (observed)
  pushObserved(6, 4, "Independence Day");

  // Labor Day — 1st Monday in Sep
  holidays.push({
    dateMs: nthWeekdayOfMonthUtc(year, 8, 1, 1),
    name: "Labor Day",
  });

  // Thanksgiving — 4th Thursday in Nov
  holidays.push({
    dateMs: nthWeekdayOfMonthUtc(year, 10, 4, 4),
    name: "Thanksgiving Day",
  });

  // Christmas Day (observed)
  pushObserved(11, 25, "Christmas Day");

  return holidays;
}

export default function TradingChartCard({ config, isFocused, onFocus }: Props) {
  const { symbol, label, timeframeCode } = config;

  const { candles, loading, error } = useCandles(symbol, timeframeCode, 300);

  const elRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ApexCharts | null>(null);

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
  // We use closes to set the viewport, using 2nd–98th percentiles.
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

  // --- 4) Day separators + closed-market shading (weekends + holidays) ---

  const { dayLines, closedBlocks } = useMemo(() => {
    if (!sortedCandles.length) {
      return { dayLines: [] as any[], closedBlocks: [] as any[] };
    }

    const firstTs = new Date(sortedCandles[0].openTimeUtc).getTime();
    const lastTs =
      new Date(
        sortedCandles[sortedCandles.length - 1].openTimeUtc
      ).getTime();

    const startDay = startOfUtcDay(firstTs);
    const endDay = startOfUtcDay(lastTs);

    const startYear = new Date(startDay).getUTCFullYear();
    const endYear = new Date(endDay).getUTCFullYear();

    // gather holidays for all years spanned by the chart
    const holidayMap = new Map<number, string>(); // dayStartMs -> name
    for (let y = startYear; y <= endYear; y++) {
      for (const h of getUsMarketHolidaysUtc(y)) {
        const dayStart = startOfUtcDay(h.dateMs);
        // If multiple labels collide, keep the first – they should not.
        if (!holidayMap.has(dayStart)) {
          holidayMap.set(dayStart, h.name);
        }
      }
    }

    const dayLinesLocal: any[] = [];
    const closedBlocksLocal: any[] = [];

    // iterate days from startDay to endDay+1 (so we have a boundary after last)
    for (
      let dayStart = startDay;
      dayStart <= endDay + DAY_MS;
      dayStart += DAY_MS
    ) {
      const date = new Date(dayStart);
      const dow = date.getUTCDay(); // 0=Sun..6=Sat
      const isWeekend = dow === 0 || dow === 6;
      const holidayName = holidayMap.get(dayStart) ?? null;

      // vertical dotted line for each day boundary + label
      const dayLabel = date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });

      dayLinesLocal.push({
        x: dayStart,
        borderColor: "rgba(148,163,184,0.5)",
        strokeDashArray: 3,
        label: {
          text: dayLabel,
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

      // closed-market shading for weekends + holidays
      if (isWeekend || holidayName) {
        closedBlocksLocal.push({
          x: dayStart,
          x2: dayStart + DAY_MS,
          fillColor: "rgba(148,163,184,0.18)", // grayish block
          opacity: 0.5,
          borderColor: "transparent",
          label: holidayName
            ? {
                text: holidayName,
                orientation: "horizontal",
                offsetY: 24,
                borderColor: "rgba(156,163,175,0.5)",
                style: {
                  color: "#e5e7eb",
                  background: "rgba(15,23,42,0.85)",
                  fontSize: "10px",
                },
              }
            : undefined,
        });
      }
    }

    return { dayLines: dayLinesLocal, closedBlocks: closedBlocksLocal };
  }, [sortedCandles]);

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
          const ts = ohlc.x;
          const timeStr = new Date(ts).toLocaleTimeString(undefined, {
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
        // closed-market blocks first, then day lines on top
        xaxis: [...closedBlocks, ...dayLines],
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
      closedBlocks,
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
      }`}
      onClick={handleCardClick}
    >
      <div className={styles.chartHead}>
        <div>
          <div className={styles.chartTitle}>{label}</div>
          <div className={styles.chartSub}>
            {symbol} · {timeframeCode} · candlesticks
          </div>
        </div>
        <div className={styles.chartLegendHint}>
          <span className={styles.pillUp}>Up</span>
          <span className={styles.pillDown}>Down</span>
        </div>
      </div>
      <div ref={elRef} className={styles.chartBody} />
      {/* All "no data" / errors are shown via Apex's noData + shaded weekends/holidays */}
    </div>
  );
}
