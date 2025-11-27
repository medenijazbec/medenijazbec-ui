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
  provider: "twelvedata" | "alpha" | "yahoo";
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

/**
 * How many candles the *auto* view should try to show at once.
 * You can still zoom out to see all history, but by default the chart
 * focuses on the most recent N candles.
 *
 * For 1m timeframe we want ~8h = 480 candles visible on initial load.
 */
const INITIAL_VIEW_HOURS = 8;

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
// NY date like "Nov 25, 09:30 ET"
function fmtNY_mmmdd_hm(ts: number) {
  const d = new Intl.DateTimeFormat(undefined, {
    timeZone: TZ_NY,
    month: "short",
    day: "numeric",
  }).format(ts);
  const hm = new Intl.DateTimeFormat(undefined, {
    timeZone: TZ_NY,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(ts);
  return `${d}, ${hm} ET`;
}

// NY date + time with seconds, e.g. "Nov 25, 07:00:00 PM"
function fmtNY_mmmdd_hms(ts: number) {
  const d = new Intl.DateTimeFormat(undefined, {
    timeZone: TZ_NY,
    month: "short",
    day: "numeric",
  }).format(ts);
  const hms = fmtNY_hms(ts);
  return `${d}, ${hms}`;
}

// Ljubljana date + time with seconds, 24h, e.g. "Nov 26, 01:00:00"
function fmtLJU_mmmdd_hms24(ts: number) {
  const d = new Intl.DateTimeFormat(undefined, {
    timeZone: TZ_LJU,
    month: "short",
    day: "numeric",
  }).format(ts);
  const hms = fmtLJU_hms24(ts);
  return `${d}, ${hms}`;
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

/**
 * Convert a candle open time to a real UTC timestamp (ms).
 *
 * Backend semantics:
 * - Historically, `openTimeUtc` was actually **New York local time** stored as
 *   a naive DateTime. Newer versions may send a proper ISO-8601 UTC string.
 *
 * Rules:
 * - If a timezone offset or "Z" is present → trust it and parse directly.
 * - Otherwise, interpret the string as New York local time and convert to UTC.
 */
function parseCandleOpenTimeToUtcMs(
  raw: string | number | Date | null | undefined
): number {
  if (raw == null) return NaN;

  if (raw instanceof Date) {
    return raw.getTime();
  }
  if (typeof raw === "number") {
    return raw;
  }

  const s = String(raw).trim();
  if (!s) return NaN;

  // If the string clearly includes timezone information (Z or +HH:mm / -HH:mm),
  // assume backend already sends correct ISO and just parse it directly.
  if (/[zZ]|[+\-]\d\d:?\d\d$/.test(s)) {
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : NaN;
  }

  // Otherwise, interpret as "YYYY-MM-DD HH:mm:ss" in New York local time.
  const [datePart, timePartRaw] = s.replace("T", " ").split(" ");
  const [yearStr, monthStr, dayStr] = (datePart || "").split("-");
  const [hourStr, minuteStr, secondStr] = (timePartRaw || "00:00:00").split(
    ":"
  );

  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minuteStr || "0");
  const second = Number(secondStr || "0");

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second)
  ) {
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : NaN;
  }

  // Approximate DST using same helper as the market calendar.
  const dayStartUtc = Date.UTC(year, month - 1, day);
  const isDst = isNewYorkDstForUtcDay(dayStartUtc);
  // New York offset from UTC, in HOURS.
  // DST: UTC-4, Standard: UTC-5.
  const offsetHours = isDst ? -4 : -5;

  // "Local" NY time treated as if it were UTC.
  const localAsUtcMs = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second
  );

  // If local = UTC + offsetHours, then UTC = local - offsetHours.
  const utcMs = localAsUtcMs - offsetHours * 3600_000;
  return utcMs;
}

/** Parse timeframe code like "1m", "5m", "1h" into minutes (fallback 1). */
function parseTimeframeMinutes(timeframeCode: string): number {
  const m = timeframeCode.trim().match(/^(\d+)\s*([mhd])$/i);
  if (!m) return 1;
  const value = Number(m[1]) || 1;
  const unit = m[2].toLowerCase();
  if (unit === "m") return value;
  if (unit === "h") return value * 60;
  if (unit === "d") return value * 60 * 24;
  return 1;
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

  // How many candles to keep in memory.
  // We want enough history so zooming out reveals more than the ~8h initial view.
  const tfMinutesForLimit = parseTimeframeMinutes(timeframeCode);
  const barsFor8h = Math.max(
    Math.ceil(
      (INITIAL_VIEW_HOURS * 60) / Math.max(tfMinutesForLimit || 1, 1)
    ),
    1
  );
  const limitForHook = Math.max(barsFor8h * 2, 300);

  // Poll the chart data every 15s so the chart refreshes; server fetch cadence is separate.
  const { candles, loading, error, lastFetchedAt } = useCandles(
    symbol,
    timeframeCode,
    limitForHook,
    REFRESH_MS
  );

  // --- Backend authoritative provider + next insert (created_at anchored)
  const [sched, setSched] = useState<NextInsertScheduleDto | null>(null);

  async function fetchSchedule() {
    try {
      // This matches [HttpGet("~/api/trading/next-insert")]
      const q = `/api/trading/next-insert?symbol=${encodeURIComponent(
        symbol
      )}&timeframeCode=${encodeURIComponent(timeframeCode)}`;
      const data = await http.get<NextInsertScheduleDto>(q);
      setSched(data);
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
  // NOTE: this is now in *index space* (category x-axis) rather than raw timestamps.
  const [xRange, setXRange] = useState<{ min: number; max: number } | null>(
    null
  );

  // Auto-follow latest candles unless the user manually zooms/pans.
  const [isAutoFollow, setIsAutoFollow] = useState(true);

  // Right-click panning state (horizontal)
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

  // --- 1) Normalize + sort candles by true UTC time (ascending) ---
  // Also: drop malformed timestamps and *future* candles so we never plot into the future.
  // Attach a stable idx so that each candle is exactly one equally spaced slot on the x-axis.
  const sortedCandles = useMemo(() => {
    const tfMinutes = parseTimeframeMinutes(timeframeCode);
    const nowMs = Date.now();
    // Allow a tiny bit of "look-ahead" for edge delays (e.g., up to ~3 bars).
    const maxAheadMs = Math.max(2 * 60_000, tfMinutes * 60_000 * 3);
    const cutoff = nowMs + maxAheadMs;

    const normalized = [...candles]
      .map((c: any) => ({
        ...c,
        // Attach real UTC ms based on NY-local open_time semantics.
        tsUtc: parseCandleOpenTimeToUtcMs(c.openTimeUtc as any),
      }))
      .filter(
        (c) =>
          Number.isFinite(c.tsUtc) &&
          typeof c.tsUtc === "number" &&
          c.tsUtc <= cutoff
      )
      .sort((a, b) => (a.tsUtc as number) - (b.tsUtc as number));

    return normalized.map((c, idx) => ({ ...c, idx }));
  }, [candles, timeframeCode]);

  // --- 1b) Full domain and default auto-follow window in *index* space ---
  const fullXDomain = useMemo(() => {
    const sc = sortedCandles as any[];
    if (!sc.length) return null;
    const firstIdx = (sc[0].idx ?? 0) as number;
    const lastIdx = (sc[sc.length - 1].idx ?? sc.length - 1) as number;
    return { min: firstIdx, max: lastIdx };
  }, [sortedCandles]);

  const defaultXRange = useMemo(() => {
    const sc = sortedCandles as any[];
    if (!sc.length) return null;

    const tfMinutes = parseTimeframeMinutes(timeframeCode);
    const desiredBarsRaw = Math.floor(
      (INITIAL_VIEW_HOURS * 60) / Math.max(tfMinutes || 1, 1)
    );
    const desiredBars = Math.max(1, desiredBarsRaw);

    const total = sc.length;
    const startIndex = total > desiredBars ? total - desiredBars : 0;

    const firstIdx = (sc[startIndex].idx ?? startIndex) as number;
    const lastIdx = (sc[total - 1].idx ?? total - 1) as number;

    const span = Math.max(1, lastIdx - firstIdx);
    const pad = Math.max(1, Math.floor(span * 0.02)); // a tiny bit of breathing room

    return {
      min: Math.max(firstIdx - pad, 0),
      max: lastIdx + pad,
    };
  }, [sortedCandles, timeframeCode]);

  // When auto-follow is on, keep xRange tracking the default window.
  useEffect(() => {
    if (!defaultXRange) return;
    setXRange((prev) =>
      isAutoFollow ? defaultXRange : prev ?? defaultXRange
    );
  }, [defaultXRange, isAutoFollow]);

  // Active X-range the chart is using right now (index-based).
  const activeXRange = useMemo(
    () => xRange ?? defaultXRange ?? fullXDomain ?? null,
    [xRange, defaultXRange, fullXDomain]
  );

  // Which providers are present in the latest payload (for display only)
  const providersPresent = useMemo(() => {
    const set = new Set<string>();
    for (const c of sortedCandles as any[]) {
      const p = (c.provider || "").trim();
      if (p) set.add(p);
    }
    return Array.from(set);
  }, [sortedCandles]);

  // Categories: one per candle; stores the true UTC timestamp
  // so labels + tooltips can still show NY / LJ wall-clock time
  // even though the x-axis is index-based.
  const xCategories = useMemo(
    () => (sortedCandles as any[]).map((c) => c.tsUtc as number),
    [sortedCandles]
  );

  // --- 2) Build series from ALL sorted candles (so you can zoom out to history) ---
  const seriesData = useMemo(
    () => [
      {
        name: `${symbol} ${timeframeCode}`,
        type: "candlestick" as const,
        data: (sortedCandles as any[]).map((c) => ({
          x: c.idx as number,
          y: [c.open, c.high, c.low, c.close] as [
            number,
            number,
            number,
            number
          ],
          // carry the true UTC timestamp for tooltips
          ts: c.tsUtc as number,
        })),
      },
      {
        name: "Close",
        type: "line" as const,
        data: (sortedCandles as any[]).map((c) => ({
          x: c.idx as number,
          y: c.close,
          ts: c.tsUtc as number,
        })),
      },
    ],
    [sortedCandles, symbol, timeframeCode]
  );

  // --- 3) Candles currently visible in the active X-range (index-based) ---
  const viewCandles = useMemo(() => {
    const sc = sortedCandles as any[];
    if (!sc.length) return [];
    if (!activeXRange) return sc;
    const { min, max } = activeXRange;
    const minIdx = Math.floor(min);
    const maxIdx = Math.ceil(max);
    const filtered = sc.filter((c) => {
      const idx = (c.idx ?? 0) as number;
      return idx >= minIdx && idx <= maxIdx;
    }) as any[];
    return filtered.length ? filtered : sc;
  }, [sortedCandles, activeXRange]);

  // --- 4) Compute y-range that ignores outliers, based on *visible* candles ---
  const yRange = useMemo(() => {
    const sc = viewCandles as any[];
    if (!sc.length) return null;

    const closes = sc.map((c) => c.close).sort((a: number, b: number) => a - b);
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
  }, [viewCandles]);

  // --- 5) Day separators + closed-market shading (weekends + holidays + off-session)
  // Compute in real UTC time, then map into the *index* axis via linear interpolation
  // so candles stay packed but open/close & closed periods are annotated correctly.
  const { dayLines, closedBlocks, sessionBoundaryLines } = useMemo(() => {
    const scView = viewCandles as any[];
    const scAll = sortedCandles as any[];

    if (!scView.length || !scAll.length) {
      return {
        dayLines: [] as any[],
        closedBlocks: [] as any[],
        sessionBoundaryLines: [] as any[],
      };
    }

    const n = scAll.length;
    const times = scAll.map((c) => c.tsUtc as number);
    const idxs = scAll.map((c) => (c.idx ?? 0) as number);

    const firstTsData = times[0];
    const lastTsData = times[n - 1];

    const firstVisibleTs = scView[0].tsUtc as number;
    const lastVisibleTs = scView[scView.length - 1].tsUtc as number;

    const visibleMinTs = Math.max(firstVisibleTs, firstTsData);
    const visibleMaxTs = Math.min(lastVisibleTs, lastTsData);

    // Map a real UTC timestamp into the index-based x-axis,
    // using linear interpolation between neighboring candles.
    const mapTsToIdx = (ts: number): number => {
      if (!Number.isFinite(ts)) return idxs[0];

      if (ts <= firstTsData) return idxs[0];
      if (ts >= lastTsData) return idxs[n - 1];

      // Find lo/hi such that times[lo] <= ts <= times[hi]
      let lo = 0;
      let hi = n - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (ts < times[mid]) {
          hi = mid;
        } else {
          lo = mid;
        }
      }

      const tLo = times[lo];
      const tHi = times[hi];
      const iLo = idxs[lo];
      const iHi = idxs[hi];

      if (tHi === tLo) return iLo;
      const ratio = (ts - tLo) / (tHi - tLo);
      return iLo + ratio * (iHi - iLo);
    };

    const dayLinesLocal: any[] = [];
    const closedBlocksLocal: any[] = [];
    const sessionLinesLocal: any[] = [];

    const startDay = startOfUtcDay(visibleMinTs);
    const endDay = startOfUtcDay(visibleMaxTs);

    const startYear = new Date(startDay).getUTCFullYear();
    const endYear = new Date(endDay).getUTCFullYear();

    const holidayMap = new Map<number, string>();
    for (let y = startYear; y <= endYear; y++) {
      for (const h of getUsMarketHolidaysUtc(y)) {
        const dayStart = startOfUtcDay(h.dateMs);
        if (!holidayMap.has(dayStart)) holidayMap.set(dayStart, h.name);
      }
    }

    const pushClosedWindow = (
      windowStartTs: number,
      windowEndTs: number,
      labelText: string
    ) => {
      const t1 = Math.max(windowStartTs, visibleMinTs);
      const t2 = Math.min(windowEndTs, visibleMaxTs);
      if (t2 <= t1) return;

      const x1 = mapTsToIdx(t1);
      const x2 = mapTsToIdx(t2);

      if (!Number.isFinite(x1) || !Number.isFinite(x2) || x2 <= x1) return;

      closedBlocksLocal.push({
        x: x1,
        x2: x2,
        fillColor: "rgba(0,255,102,0.10)",
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
    };

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

      // Day boundary line (dotted, with date label) if it falls into visible range
      if (dayStart >= visibleMinTs && dayStart <= visibleMaxTs) {
        const dayIdx = mapTsToIdx(dayStart);
        dayLinesLocal.push({
          x: dayIdx,
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
      }

      // FULL-DAY MARKET CLOSED (weekends + US holidays)
      if (isWeekend || holidayName) {
        const labelText = holidayName
          ? `MARKET CLOSED • ${holidayName}`
          : "MARKET CLOSED • Weekend";
        pushClosedWindow(dayStart, dayStart + DAY_MS, labelText);
      }

      // Regular session open/close (Mon–Fri on non-holidays)
      if (!isWeekend && !holidayName) {
        const { openUtc, closeUtc } = getSessionBoundsUtc(dayStart);

        // Vertical lines for market OPEN and CLOSE (only if they fall into visible range)
        if (openUtc >= visibleMinTs && openUtc <= visibleMaxTs) {
          const openIdx = mapTsToIdx(openUtc);
          sessionLinesLocal.push({
            x: openIdx,
            borderColor: "rgba(16,185,129,0.75)",
            strokeDashArray: 6,
            label: {
              text: `Market Open: ${fmtNY_mmmdd_hm(openUtc)}`,
              orientation: "horizontal",
              offsetY: -16,
              borderColor: "transparent",
              style: {
                color: "#16a34a",
                background: "rgba(7,26,20,0.6)",
                fontSize: "10px",
              },
            },
          });
        }

        if (closeUtc >= visibleMinTs && closeUtc <= visibleMaxTs) {
          const closeIdx = mapTsToIdx(closeUtc);
          sessionLinesLocal.push({
            x: closeIdx,
            borderColor: "rgba(16,185,129,0.75)",
            strokeDashArray: 6,
            label: {
              text: `Market Close: ${fmtNY_mmmdd_hm(closeUtc)}`,
              orientation: "horizontal",
              offsetY: -16,
              borderColor: "transparent",
              style: {
                color: "#16a34a",
                background: "rgba(7,26,20,0.6)",
                fontSize: "10px",
              },
            },
          });
        }

        // CLOSED shading for the parts of the day when market is NOT open.
        // We no longer care about "before open" vs "after close" labels,
        // only whether the market is CLOSED or OPEN.
        pushClosedWindow(dayStart, openUtc, "MARKET CLOSED");
        pushClosedWindow(closeUtc, dayStart + DAY_MS, "MARKET CLOSED");
      }

      // Weekend start/end helper lines (optional visual hint)
      if (dow === 6 && dayStart >= visibleMinTs && dayStart <= visibleMaxTs) {
        // Saturday 00:00 UTC
        const idx = mapTsToIdx(dayStart);
        sessionLinesLocal.push({
          x: idx,
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
      if (dow === 1 && dayStart >= visibleMinTs && dayStart <= visibleMaxTs) {
        // Monday 00:00 UTC
        const idx = mapTsToIdx(dayStart);
        sessionLinesLocal.push({
          x: idx,
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
  }, [viewCandles, sortedCandles]);

  // --- 6) Pre/Post-market shading (legacy separate blocks) — still unused,
  // kept for future tweaks.
  const prePostBlocks = useMemo(() => {
    return [] as any[];
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
  const providerLabel = useMemo(() => {
    if (!sched) return "—";
    switch (sched.provider) {
      case "twelvedata":
        return "Twelve Data (30s)";
      case "yahoo":
        return "Yahoo Finance (off-hours)";
      case "alpha":
      default:
        return "Alpha Vantage";
    }
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
        zoom: {
          enabled: true,
          type: "x",
          autoScaleYaxis: false, // we manage Y ourselves based on visible candles
        },
        animations: { enabled: false },
        foreColor: LABEL,
        events: {
          zoomed: (_chart, { xaxis }) => {
            if (
              typeof xaxis?.min === "number" &&
              typeof xaxis?.max === "number"
            ) {
              setIsAutoFollow(false);
              setXRange({ min: xaxis.min, max: xaxis.max });
            } else if (defaultXRange) {
              // resetZoom clicked
              setIsAutoFollow(true);
              setXRange(defaultXRange);
            }
          },
          selection: (_chart, { xaxis }) => {
            if (!xaxis) return;
            if (
              typeof xaxis.min === "number" &&
              typeof xaxis.max === "number"
            ) {
              setIsAutoFollow(false);
              setXRange({ min: xaxis.min, max: xaxis.max });
            }
          },
        },
      },
      grid: {
        borderColor: GRID,
        strokeDashArray: 4,
        // extra bottom padding so horizontal labels don't get clipped
        padding: { left: 8, right: 8, top: 8, bottom: 22 },
      },
      plotOptions: {
        // Candlestick visual tuning:
        candlestick: {
          colors: { upward: C_UP, downward: C_DOWN },
          wick: { useFillColor: true },
        },
        // Column width affects candlestick body width.
        bar: {
          columnWidth: "70%", // keep candles fat enough even with many bars
        },
      },
      stroke: {
        width: 1, // thin outline so bodies look like blocks, not blobs
      },
      dataLabels: {
        enabled: false,
      },
      xaxis: {
        // IMPORTANT: category axis so each candle is one evenly spaced slot.
        type: "category",
        labels: {
          style: { colors: LABEL },

          // keep labels horizontal and inside the chart
          rotate: 0,
          rotateAlways: false,
          hideOverlappingLabels: true,
          trim: true,
          offsetY: 4,

          // Show both NY and Ljubljana time on the x-axis,
          // stacked vertically to save space.
          formatter: (value: string | number) => {
            const n =
              typeof value === "string" ? Number(value) : (value as number);
            if (!Number.isFinite(n)) return "";
            const ts = Number(n);
            const ny = fmtNY_hm(ts);
            const lju = fmtLJU_hm24(ts);
            // two lines: NY on top, LJ below
            return `${ny}<br/>${lju}`;
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
        // Keep hover behavior: NY + Ljubljana times, with bullish/bearish label.
        // Now the timestamp comes from the data point's `ts` field so it
        // updates correctly as you move across candles.
        custom: (cfg) => {
          const { dataPointIndex, w } = cfg;
          const seriesIndex = cfg.seriesIndex ?? 0;

          const point =
            w?.config?.series?.[seriesIndex]?.data?.[dataPointIndex] ??
            w?.config?.series?.[0]?.data?.[dataPointIndex];

          if (!point) return "";

          const ohlc = point as {
            x: number;
            y: [number, number, number, number];
            ts?: number;
          };

          const [open, high, low, close] = ohlc.y;

          // Prefer the real UTC timestamp carried on the point
          // and fall back to `x` if needed.
          const ts =
            typeof ohlc.ts === "number" && Number.isFinite(ohlc.ts)
              ? ohlc.ts
              : ohlc.x;

          const nyWithDate = fmtNY_mmmdd_hms(ts);
          const ljuWithDate = fmtLJU_mmmdd_hms24(ts);
          const isUp = close >= open;
          const dirLabel = isUp ? "Bullish" : "Bearish";
          const color = isUp ? C_UP : C_DOWN;

          return `<div style="padding:.28rem .55rem">
            <div style="margin-bottom:4px">
              <div><b>${nyWithDate} <span style="opacity:.65">(New York)</span></b></div>
              <div style="color:${C_DOWN};margin-top:2px">
                <b>${ljuWithDate}</b>
                <span style="opacity:.65;color:#ffd2d2"> (Ljubljana)</span>
              </div>
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
    [loading, error, defaultXRange]
  );

  // ---- Create chart once ----
  useEffect(() => {
    if (!elRef.current || chartRef.current) return;

    const chart = new ApexCharts(elRef.current, {
      ...baseOptions,
      series: seriesData,
      xaxis: {
        ...(baseOptions.xaxis as any),
        categories: xCategories,
        min: activeXRange?.min,
        max: activeXRange?.max,
      },
      yaxis: {
        ...(baseOptions.yaxis as any),
        min: yRange?.min,
        max: yRange?.max,
      },
      annotations: {
        xaxis: [
          ...closedBlocks, // MARKET CLOSED periods (weekends, holidays, off-session)
          // ...prePostBlocks, // intentionally NOT included separately
          ...sessionBoundaryLines,
          ...dayLines,
        ],
      },
    });

    chartRef.current = chart;
    chart
      .render()
      .catch(() => {
        /* ignore */
      });

    // prevent native context menu over the chart (for right-click pan)
    const el = elRef.current;
    const onCtx = (e: MouseEvent) => {
      e.preventDefault();
    };
    el.addEventListener("contextmenu", onCtx);

    // Double-click to reset zoom & re-enable auto-follow
    const onDbl = (e: MouseEvent) => {
      e.stopPropagation();
      setIsAutoFollow(true);
      const targetRange = defaultXRange ?? fullXDomain ?? null;
      if (targetRange) {
        setXRange(targetRange);
        try {
          chart.updateOptions(
            {
              xaxis: {
                ...(baseOptions.xaxis as any),
                categories: xCategories,
                min: targetRange.min,
                max: targetRange.max,
              },
            },
            false,
            false
          );
        } catch {
          /* ignore */
        }
      }
    };
    el.addEventListener("dblclick", onDbl);

    return () => {
      el.removeEventListener("contextmenu", onCtx);
      el.removeEventListener("dblclick", onDbl);
    };
  }, [
    baseOptions,
    seriesData,
    xCategories,
    yRange,
    closedBlocks,
    prePostBlocks,
    dayLines,
    sessionBoundaryLines,
    activeXRange,
    defaultXRange,
    fullXDomain,
  ]);

  // ---- Incremental updates: series only (preserve zoom) ----
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.updateSeries(seriesData, false);
  }, [seriesData]);

  // ---- Update annotations, y-range & x-range/domain without resetting zoom ----
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.updateOptions(
      {
        xaxis: {
          ...(baseOptions.xaxis as any),
          categories: xCategories,
          min: activeXRange?.min,
          max: activeXRange?.max,
        },
        yaxis: {
          ...(baseOptions.yaxis as any),
          min: yRange?.min,
          max: yRange?.max,
        },
        annotations: {
          xaxis: [
            ...closedBlocks,
            // ...prePostBlocks,
            ...sessionBoundaryLines,
            ...dayLines,
          ],
        },
      },
      false,
      false
    );
  }, [
    yRange,
    closedBlocks,
    prePostBlocks,
    dayLines,
    sessionBoundaryLines,
    baseOptions.xaxis,
    baseOptions.yaxis,
    activeXRange,
    xCategories,
  ]);

  // ---- Right-click drag to pan horizontally (index-based) ----
  useEffect(() => {
    const root = elRef.current;
    if (!root) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 2) return; // right-click only
      e.preventDefault();
      setIsAutoFollow(false);
      // if we don't have a range yet, derive from current active range
      const current = activeXRange ?? fullXDomain;
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
      let min = panState.current.startRange.min + dt;
      let max = panState.current.startRange.max + dt;

      // Clamp to full domain if we have it
      if (fullXDomain) {
        const span = max - min;
        if (min < fullXDomain.min) {
          min = fullXDomain.min;
          max = fullXDomain.min + span;
        } else if (max > fullXDomain.max) {
          max = fullXDomain.max;
          min = fullXDomain.max - span;
        }
      }

      setXRange({ min, max });
      chartRef.current?.updateOptions(
        { xaxis: { min, max } },
        false,
        false
      );
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
  }, [activeXRange, fullXDomain]);

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
            <span className={styles.pillPrePost}>
              Market CLOSED periods shaded
            </span>
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

      {/* Time axis legend with RED splitter and LJ indicator */}
      <div className={styles.timeAxisLegend} aria-hidden="true">
        NY time <span className={styles.splitter}>|</span> LJ time
      </div>
    </div>
  );
}
