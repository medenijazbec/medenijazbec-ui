// path: src/components/admin/AdminCandleTrading/trandingCharts/TradingChartCard.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import ApexCharts, { type ApexOptions } from "apexcharts";
import styles from "./TradingChartsPanel.module.css";
import { useCandles, type SymbolConfig } from "./trandingCharts.logic";
import { http } from "@/api/api";

type Props = {
  config: SymbolConfig;
  isFocused: boolean;
  onFocus: () => void;
};

type NextInsertScheduleDto = {
  symbol: string;
  timeframeCode: string;
  provider: "twelvedata" | "alpha";
  lastInsertUtc?: string | null;
  nextInsertUtc: string;
  secondsUntilNext: number;
};

const C_UP = "#00ff66";
const C_DOWN = "#ff6b6b";
const GRID = "rgba(16,185,129,0.22)";
const LABEL = "#aef5d4";

const DAY_MS = 24 * 60 * 60 * 1000;
const REFRESH_MS = 15_000;

// ---- Timezone helpers ----
const TZ_NY = "America/New_York";
const TZ_LJU = "Europe/Ljubljana";

function fmtNY_hm(ts: number) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: TZ_NY,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(ts);
}
function fmtNY_hms(ts: number) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: TZ_NY,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(ts);
}
function fmtLJU_hms24(ts: number) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: TZ_LJU,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(ts);
}
function fmtLJU_hm24(ts: number) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: TZ_LJU,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(ts);
}

/** Start of UTC day (00:00) for a given timestamp. */
function startOfUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Nth weekday of a month (UTC). */
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

/** Last weekday of a month (UTC). */
function lastWeekdayOfMonthUtc(
  year: number,
  month: number,
  weekday: number
): number {
  const last = new Date(Date.UTC(year, month + 1, 0));
  const lastDow = last.getUTCDay();
  const offset = (lastDow - weekday + 7) % 7;
  const day = last.getUTCDate() - offset;
  return Date.UTC(year, month, day);
}

/** Holiday observed Fri/Mon if weekend. */
function observedDateUtc(year: number, month: number, day: number): number {
  const d = new Date(Date.UTC(year, month, day));
  const dow = d.getUTCDay();
  if (dow === 6) return Date.UTC(year, month, day - 1);
  if (dow === 0) return Date.UTC(year, month, day + 1);
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
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=Mar, 4=Apr
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

/** US equity market holidays for a given year (UTC-midnight stamps). */
function getUsMarketHolidaysUtc(year: number): MarketHoliday[] {
  const holidays: MarketHoliday[] = [];

  const pushObserved = (month: number, day: number, name: string) => {
    holidays.push({ dateMs: observedDateUtc(year, month, day), name });
  };

  pushObserved(0, 1, "New Year’s Day");
  holidays.push({
    dateMs: nthWeekdayOfMonthUtc(year, 0, 1, 3),
    name: "MLK Jr. Day",
  });
  holidays.push({
    dateMs: nthWeekdayOfMonthUtc(year, 1, 1, 3),
    name: "Presidents’ Day",
  });
  holidays.push({ dateMs: goodFridayUtc(year), name: "Good Friday" });
  holidays.push({
    dateMs: lastWeekdayOfMonthUtc(year, 4, 1),
    name: "Memorial Day",
  });
  pushObserved(5, 19, "Juneteenth");
  pushObserved(6, 4, "Independence Day");
  holidays.push({
    dateMs: nthWeekdayOfMonthUtc(year, 8, 1, 1),
    name: "Labor Day",
  });
  holidays.push({
    dateMs: nthWeekdayOfMonthUtc(year, 10, 4, 4),
    name: "Thanksgiving Day",
  });
  pushObserved(11, 25, "Christmas Day");

  return holidays;
}

/** US DST check for New York for a given UTC date (approx, day-level). */
function isNewYorkDstForUtcDay(dayStartUtcMs: number): boolean {
  const d = new Date(dayStartUtcMs);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();

  const dstStartDay = new Date(nthWeekdayOfMonthUtc(y, 2, 0, 2)).getUTCDate(); // 2nd Sun in Mar
  const dstEndDay = new Date(nthWeekdayOfMonthUtc(y, 10, 0, 1)).getUTCDate(); // 1st Sun in Nov

  if (m > 2 && m < 10) return true; // Apr..Oct
  if (m < 2 || m > 10) return false; // Jan..Feb, Dec
  if (m === 2) return day >= dstStartDay; // March
  if (m === 10) return day < dstEndDay; // November
  return false;
}

/** Market calendar helpers */
const NEAR_OPEN_SLOTS: Array<{ h: number; m: number }> = [
  { h: 9, m: 0 },
  { h: 9, m: 10 },
  { h: 9, m: 20 },
  { h: 9, m: 29 },
];

function getSessionBoundsUtc(dayStartUtc: number): {
  openUtc: number;
  closeUtc: number;
} {
  const isDst = isNewYorkDstForUtcDay(dayStartUtc);
  const openUtc = dayStartUtc + (isDst ? 13.5 * 3600_000 : 14.5 * 3600_000); // 09:30 ET
  const closeUtc = dayStartUtc + (isDst ? 20 * 3600_000 : 21 * 3600_000); // 16:00 ET
  return { openUtc, closeUtc };
}

export default function TradingChartCard({
  config,
  isFocused,
  onFocus,
}: Props) {
  const { symbol, label, timeframeCode } = config;

  // Poll the chart data every 15s so the chart refreshes; server fetch cadence is separate.
  const { candles, loading, error, lastFetchedAt } = useCandles(
    symbol,
    timeframeCode,
    300,
    REFRESH_MS
  );

  // --- Backend authoritative provider + next insert (created_at anchored)
  const [sched, setSched] = useState<NextInsertScheduleDto | null>(null);
  const [schedFetchedAtMs, setSchedFetchedAtMs] = useState<number | null>(null);

  async function fetchSchedule() {
    try {
      // This already matches the new controller method: [HttpGet("~/api/trading/next-insert")]
      const q = `/api/trading/next-insert?symbol=${encodeURIComponent(
        symbol
      )}&timeframeCode=${encodeURIComponent(timeframeCode)}`;
      const data = await http.get<NextInsertScheduleDto>(q);
      setSched(data);
      setSchedFetchedAtMs(Date.now());
    } catch {
      // ignore; keep prior display
    }
  }

  useEffect(() => {
    // initial + periodic updates
    fetchSchedule();
    const id = window.setInterval(fetchSchedule, 15_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframeCode]);

  useEffect(() => {
    // whenever candles were fetched successfully, refresh schedule soon
    if (lastFetchedAt) fetchSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastFetchedAt]);

  const elRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ApexCharts | null>(null);

  const [isMax, setIsMax] = useState(false);

  // Persist current zoom range to avoid resets on updates.
  const [xRange, setXRange] = useState<{ min: number; max: number } | null>(
    null
  );

  // Right-click panning state
  const panState = useRef<{
    active: boolean;
    startX: number;
    startRange: { min: number; max: number } | null;
  }>({ active: false, startX: 0, startRange: null });

  // Tick every second to refresh dynamic labels & countdown
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  // --- 1) Sort candles by time (ascending) ---
  const sortedCandles = useMemo(
    () =>
      [...candles].sort(
        (a, b) =>
          new Date(a.openTimeUtc).getTime() - new Date(b.openTimeUtc).getTime()
      ),
    [candles]
  );

  // Which providers are present in the latest payload (for display only)
  const providersPresent = useMemo(() => {
    const set = new Set<string>();
    for (const c of sortedCandles) {
      const p = (c.provider || "").trim();
      if (p) set.add(p);
    }
    return Array.from(set);
  }, [sortedCandles]);

  // --- 2) Build series from sorted candles ---
  const seriesData = useMemo(
    () => [
      {
        name: `${symbol} ${timeframeCode}`,
        type: "candlestick" as const,
        data: sortedCandles.map((c) => ({
          x: new Date(c.openTimeUtc).getTime(),
          y: [c.open, c.high, c.low, c.close] as [
            number,
            number,
            number,
            number
          ],
        })),
      },
      {
        name: "Close",
        type: "line" as const,
        data: sortedCandles.map((c) => ({
          x: new Date(c.openTimeUtc).getTime(),
          y: c.close,
        })),
      },
    ],
    [sortedCandles, symbol, timeframeCode]
  );

  // --- 3) Compute y-range that ignores outliers ---
  const yRange = useMemo(() => {
    if (!sortedCandles.length) return null;

    const closes = sortedCandles.map((c) => c.close).sort((a, b) => a - b);
    const n = closes.length;
    const idxLow = Math.floor(n * 0.02);
    const idxHigh = Math.floor(n * 0.98);
    const baseMin = closes[idxLow];
    const baseMax = closes[idxHigh];

    if (!Number.isFinite(baseMin) || !Number.isFinite(baseMax)) {
      return null;
    }

    const span = baseMax - baseMin || 1;
    const pad = span * 0.1;

    return { min: baseMin - pad, max: baseMax + pad };
  }, [sortedCandles]);

  // --- 4) Day separators + closed-market shading (weekends + holidays) ---
  const { dayLines, closedBlocks, sessionBoundaryLines } = useMemo(() => {
    if (!sortedCandles.length) {
      return {
        dayLines: [] as any[],
        closedBlocks: [] as any[],
        sessionBoundaryLines: [] as any[],
      };
    }

    const firstTs = new Date(sortedCandles[0].openTimeUtc).getTime();
    const lastTs = new Date(
      sortedCandles[sortedCandles.length - 1].openTimeUtc
    ).getTime();

    const startDay = startOfUtcDay(firstTs);
    const endDay = startOfUtcDay(lastTs);

    const startYear = new Date(startDay).getUTCFullYear();
    const endYear = new Date(endDay).getUTCFullYear();

    const holidayMap = new Map<number, string>();
    for (let y = startYear; y <= endYear; y++) {
      for (const h of getUsMarketHolidaysUtc(y)) {
        const dayStart = startOfUtcDay(h.dateMs);
        if (!holidayMap.has(dayStart)) holidayMap.set(dayStart, h.name);
      }
    }

    const dayLinesLocal: any[] = [];
    const closedBlocksLocal: any[] = [];
    const sessionLinesLocal: any[] = [];

    for (
      let dayStart = startDay;
      dayStart <= endDay + DAY_MS;
      dayStart += DAY_MS
    ) {
      const date = new Date(dayStart);
      const dow = date.getUTCDay();
      const isWeekend = dow === 0 || dow === 6;
      const holidayName = holidayMap.get(dayStart) ?? null;

      const dayLabel = date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });

      // Day boundary line (dotted, with date label)
      dayLinesLocal.push({
        x: dayStart,
        borderColor: "rgba(148,163,184,0.45)",
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

      // Closed blocks for weekends & holidays
      if (isWeekend || holidayName) {
        const labelText = holidayName
          ? `CLOSED • ${holidayName}`
          : "CLOSED • Weekend";
        closedBlocksLocal.push({
          x: dayStart,
          x2: dayStart + DAY_MS,
          fillColor: "rgba(0,255,102,0.08)",
          opacity: 0.5,
          borderColor: "transparent",
          label: {
            text: labelText,
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

      // Vertical lines for open/close of regular session (Mon-Fri)
      if (!isWeekend && !holidayName) {
        const { openUtc, closeUtc } = getSessionBoundsUtc(dayStart);

        sessionLinesLocal.push(
          {
            x: openUtc,
            borderColor: "rgba(16,185,129,0.75)",
            strokeDashArray: 6,
            label: {
              text: "Market Open (09:30 ET)",
              orientation: "horizontal",
              offsetY: -16,
              borderColor: "transparent",
              style: {
                color: "#16a34a",
                background: "rgba(7,26,20,0.6)",
                fontSize: "10px",
              },
            },
          },
          {
            x: closeUtc,
            borderColor: "rgba(16,185,129,0.75)",
            strokeDashArray: 6,
            label: {
              text: "Market Close (16:00 ET)",
              orientation: "horizontal",
              offsetY: -16,
              borderColor: "transparent",
              style: {
                color: "#16a34a",
                background: "rgba(7,26,20,0.6)",
                fontSize: "10px",
              },
            },
          }
        );
      }

      // Weekend start/end lines (UTC midnight boundaries)
      if (dow === 6) {
        // Saturday 00:00 UTC
        sessionLinesLocal.push({
          x: dayStart,
          borderColor: "rgba(148,163,184,0.75)",
          strokeDashArray: 6,
          label: {
            text: "Weekend start",
            orientation: "horizontal",
            offsetY: -16,
            borderColor: "transparent",
            style: {
              color: "#94a3b8",
              background: "rgba(7,26,20,0.6)",
              fontSize: "10px",
            },
          },
        });
      }
      if (dow === 1) {
        // Monday 00:00 UTC
        sessionLinesLocal.push({
          x: dayStart,
          borderColor: "rgba(148,163,184,0.75)",
          strokeDashArray: 6,
          label: {
            text: "Weekend end",
            orientation: "horizontal",
            offsetY: -16,
            borderColor: "transparent",
            style: {
              color: "#94a3b8",
              background: "rgba(7,26,20,0.6)",
              fontSize: "10px",
            },
          },
        });
      }
    }

    return {
      dayLines: dayLinesLocal,
      closedBlocks: closedBlocksLocal,
      sessionBoundaryLines: sessionLinesLocal,
    };
  }, [sortedCandles]);

  // --- 5) Pre/Post-market shading (outside 09:30–16:00 ET) ---
  const prePostBlocks = useMemo(() => {
    if (!sortedCandles.length) return [] as any[];

    const firstTs = new Date(sortedCandles[0].openTimeUtc).getTime();
    const lastTs = new Date(
      sortedCandles[sortedCandles.length - 1].openTimeUtc
    ).getTime();

    const startDay = startOfUtcDay(firstTs);
    const endDay = startOfUtcDay(lastTs);

    const blocks: any[] = [];

    for (let dayStart = startDay; dayStart <= endDay; dayStart += DAY_MS) {
      const d = new Date(dayStart);
      const dow = d.getUTCDay();
      const isWeekend = dow === 0 || dow === 6;
      if (isWeekend) continue; // already fully shaded

      const { openUtc, closeUtc } = getSessionBoundsUtc(dayStart);

      blocks.push({
        x: dayStart,
        x2: openUtc,
        fillColor: "rgba(0,255,102,0.10)",
        opacity: 0.5,
        borderColor: "transparent",
        label: {
          text: "PRE-MARKET",
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

      blocks.push({
        x: closeUtc,
        x2: dayStart + DAY_MS,
        fillColor: "rgba(0,255,102,0.10)",
        opacity: 0.5,
        borderColor: "transparent",
        label: {
          text: "POST-MARKET",
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

    return blocks;
  }, [sortedCandles]);

  // ---- Transport-level: when the hook fetched last ----
  const lastFetchedMs = useMemo(
    () => (lastFetchedAt ? new Date(lastFetchedAt).getTime() : null),
    [lastFetchedAt]
  );

  // ---- Frontend refresh schedule labels (for the polling loop) ----
  const lastRefreshLju = useMemo(() => {
    if (!lastFetchedMs) return "—";
    return fmtLJU_hms24(lastFetchedMs);
  }, [lastFetchedMs]);

  const lastRefreshAgo = useMemo(() => {
    if (!lastFetchedMs) return "";
    const diffMs = Date.now() - lastFetchedMs;
    const sec = Math.max(0, Math.floor(diffMs / 1000));
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${s}s ago`;
    if (mins > 0) return `${mins}m ${s}s ago`;
    return `${s}s ago`;
  }, [lastFetchedMs, tick]);

  const nextRefreshAtMs = useMemo(() => {
    const now = Date.now();
    const anchor = lastFetchedMs ?? now;
    const k = Math.max(1, Math.ceil((now - anchor) / REFRESH_MS));
    return anchor + k * REFRESH_MS;
  }, [lastFetchedMs, tick]);

  const nextRefreshCountdown = useMemo(() => {
    const leftMs = Math.max(0, nextRefreshAtMs - Date.now());
    const sec = Math.floor(leftMs / 1000);
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${s}s`;
    if (mins > 0) return `${mins}m ${s}s`;
    return `${s}s`;
  }, [nextRefreshAtMs, tick]);

  // ---- Provider + insert schedule from backend ----
  const providerActive: "twelvedata" | "alpha" | null = sched?.provider ?? null;

  const providerLabel = useMemo(() => {
    if (!sched) return "—";
    if (sched.provider === "twelvedata") {
      return "Twelve Data (30s)";
    }
    // Cadence hint by known intervals (from controller)
    return "Alpha Vantage";
  }, [sched]);

  const lastInsertedMs = useMemo(() => {
    if (!sched?.lastInsertUtc) return null;
    const t = new Date(sched.lastInsertUtc).getTime();
    return Number.isFinite(t) ? t : null;
  }, [sched]);

  const nextInsertAtMs = useMemo(() => {
    if (!sched?.nextInsertUtc) return Date.now();
    const t = new Date(sched.nextInsertUtc).getTime();
    return Number.isFinite(t) ? t : Date.now();
  }, [sched, tick]);

  const lastInsertedLju = useMemo(() => {
    if (!lastInsertedMs) return "—";
    return fmtLJU_hms24(lastInsertedMs);
  }, [lastInsertedMs]);

  const lastInsertedAgo = useMemo(() => {
    if (!lastInsertedMs) return "";
    const diffMs = Date.now() - lastInsertedMs;
    const sec = Math.max(0, Math.floor(diffMs / 1000));
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${s}s ago`;
    if (mins > 0) return `${mins}m ${s}s ago`;
    return `${s}s ago`;
  }, [lastInsertedMs, tick]);

  const nextInsertCountdown = useMemo(() => {
    const leftMs = Math.max(0, nextInsertAtMs - Date.now());
    const sec = Math.floor(leftMs / 1000);
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${s}s`;
    if (mins > 0) return `${mins}m ${s}s`;
    return `${s}s`;
  }, [nextInsertAtMs, tick]);

  // ---- Base chart options (created once then updated incrementally) ----
  const baseOptions = useMemo<ApexOptions>(
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
        zoom: { enabled: true, type: "x", autoScaleYaxis: true },
        animations: { enabled: false },
        foreColor: LABEL,
        events: {
          beforeZoom: (_chart, { xaxis }) => {
            setXRange({ min: xaxis.min, max: xaxis.max });
          },
          zoomed: (_chart, { xaxis }) => {
            setXRange({ min: xaxis.min, max: xaxis.max });
          },
          selection: (_chart, { xaxis }) => {
            if (xaxis) setXRange({ min: xaxis.min, max: xaxis.max });
          },
        },
      },
      grid: {
        borderColor: GRID,
        strokeDashArray: 4,
        padding: { left: 8, right: 8, top: 8, bottom: 4 },
      },
      plotOptions: {
        candlestick: {
          colors: { upward: C_UP, downward: C_DOWN },
          wick: { useFillColor: true },
        },
      },
      xaxis: {
        type: "datetime",
        labels: {
          datetimeUTC: true,
          style: { colors: LABEL },
          formatter: (value: string | number) => {
            const n = typeof value === "string" ? Number(value) : value;
            if (!Number.isFinite(n)) return "";
            return fmtNY_hm(Number(n));
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tickAmount: 8,
      },
      yaxis: {
        labels: {
          style: { colors: LABEL },
          formatter: (v: number) => v.toFixed(2),
        },
        tooltip: { enabled: true },
      },
      tooltip: {
        shared: false,
        theme: "dark",
        x: { show: false },
        custom: (cfg) => {
          const { dataPointIndex, w } = cfg;
          const ohlc =
            w?.config?.series?.[0]?.data?.[dataPointIndex] as
              | { x: number; y: [number, number, number, number] }
              | undefined;

          if (!ohlc) return "";

          const [open, high, low, close] = ohlc.y;
          const ts = ohlc.x;

          const ny = fmtNY_hms(ts);
          const lju = fmtLJU_hms24(ts);
          const isUp = close >= open;
          const dirLabel = isUp ? "Bullish" : "Bearish";
          const color = isUp ? C_UP : C_DOWN;

          return `<div style="padding:.28rem .55rem">
            <div style="margin-bottom:4px">
              <div><b>${ny} <span style="opacity:.65">(New York)</span></b></div>
              <div style="color:${C_DOWN};margin-top:2px"><b>${lju}</b> <span style="opacity:.65;color:#ffd2d2">(Ljubljana)</span></div>
            </div>
            <div>O: ${open.toFixed(4)}</div>
            <div>H: ${high.toFixed(4)}</div>
            <div>L: ${low.toFixed(4)}</div>
            <div>C: <span style="color:${color}">${close.toFixed(4)}</span></div>
            <div style="margin-top:2px;font-size:11px;opacity:.85;color:${color}">${dirLabel}</div>
          </div>`;
        },
      },
      legend: { show: true, labels: { colors: LABEL } },
      noData: {
        text: loading
          ? "Loading…"
          : error ?? "No candles for this symbol / timeframe yet.",
        align: "center",
        verticalAlign: "middle",
      },
    }),
    [loading, error]
  );

  // ---- Create chart once ----
  useEffect(() => {
    if (!elRef.current || chartRef.current) return;
    const chart = new ApexCharts(elRef.current, {
      ...baseOptions,
      series: seriesData,
      yaxis: {
        ...(baseOptions.yaxis as any),
        min: yRange?.min,
        max: yRange?.max,
      },
      annotations: {
        xaxis: [
          ...closedBlocks,
          ...prePostBlocks,
          ...sessionBoundaryLines,
          ...dayLines,
        ],
      },
    });
    chartRef.current = chart;
    chart.render().catch(() => {});
    // prevent native context menu over the chart (for right-click pan)
    const el = elRef.current;
    const onCtx = (e: MouseEvent) => {
      e.preventDefault();
    };
    el.addEventListener("contextmenu", onCtx);
    return () => {
      el.removeEventListener("contextmenu", onCtx);
    };
  }, [
    baseOptions,
    seriesData,
    yRange,
    closedBlocks,
    prePostBlocks,
    dayLines,
    sessionBoundaryLines,
  ]);

  // ---- Incremental updates: series only (preserve zoom) ----
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.updateSeries(seriesData, false);
  }, [seriesData]);

  // ---- Update annotations & y-range without resetting zoom ----
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.updateOptions(
      {
        yaxis: {
          ...(baseOptions.yaxis as any),
          min: yRange?.min,
          max: yRange?.max,
        },
        annotations: {
          xaxis: [
            ...closedBlocks,
            ...prePostBlocks,
            ...sessionBoundaryLines,
            ...dayLines,
          ],
        },
      },
      false,
      false
    );

    // Re-apply saved x-range (keeps the user's current position)
    if (xRange) {
      chartRef.current.updateOptions(
        { xaxis: { min: xRange.min, max: xRange.max } },
        false,
        false
      );
    }
  }, [
    yRange,
    closedBlocks,
    prePostBlocks,
    dayLines,
    sessionBoundaryLines,
    baseOptions.yaxis,
    xRange,
  ]);

  // ---- Right-click drag to pan (approximate using container width) ----
  useEffect(() => {
    const root = elRef.current;
    if (!root) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 2) return; // right-click only
      e.preventDefault();
      // if we don't have a range yet, derive from visible series
      const current =
        xRange ||
        (seriesData[0]?.data.length
          ? {
              min: (seriesData[0].data[0] as any).x,
              max: (seriesData[0].data[seriesData[0].data.length - 1] as any)
                .x,
            }
          : null);

      panState.current = {
        active: true,
        startX: e.clientX,
        startRange: current,
      };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!panState.current.active || !panState.current.startRange) return;
      const width = root.clientWidth || 1;
      const dxPx = e.clientX - panState.current.startX;
      const range =
        panState.current.startRange.max - panState.current.startRange.min;
      const dt = (-dxPx / width) * range; // drag right -> move left
      const min = panState.current.startRange.min + dt;
      const max = panState.current.startRange.max + dt;
      setXRange({ min, max });
      chartRef.current?.updateOptions({ xaxis: { min, max } }, false, false);
    };

    const endPan = () => {
      panState.current.active = false;
      panState.current.startRange = null;
    };

    root.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", endPan);
    return () => {
      root.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", endPan);
    };
  }, [seriesData, xRange]);

  // ---- Destroy on unmount ----
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

  const handleCardClick = () => onFocus();

  const providersSuffix =
    providersPresent.length > 0
      ? ` (latest bars from: ${providersPresent.join(", ")})`
      : "";

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
          <div className={styles.fetchMeta} aria-live="polite">
            <span className={styles.dim}>Provider:</span>{" "}
            <b>{providerLabel}</b>
            {providersSuffix && (
              <span className={styles.dim}>{providersSuffix}</span>
            )}
            <span className={styles.dotSep}>•</span>
            <span className={styles.dim}>Last insert:</span>{" "}
            <b>{lastInsertedLju}</b>{" "}
            <span className={styles.dim}>
              (Ljubljana, {lastInsertedAgo || "—"})
            </span>
            <span className={styles.dotSep}>•</span>
            <span className={styles.dim}>Next insert:</span>{" "}
            <b>{fmtLJU_hms24(nextInsertAtMs)}</b>{" "}
            <span className={styles.dim}>(in {nextInsertCountdown})</span>
            <span className={styles.dotSep}>•</span>
            <span className={styles.dim}>Last refresh:</span>{" "}
            <b>{lastRefreshLju}</b>{" "}
            <span className={styles.dim}>
              (Ljubljana, {lastRefreshAgo || "—"})
            </span>
            <span className={styles.dotSep}>•</span>
            <span className={styles.dim}>Next refresh:</span>{" "}
            <b>{fmtLJU_hms24(nextRefreshAtMs)}</b>{" "}
            <span className={styles.dim}>(in {nextRefreshCountdown})</span>
          </div>

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
    </div>
  );
}
