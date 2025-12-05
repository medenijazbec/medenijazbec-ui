// path: src/components/admin/AdminCandleTrading/trandingCharts/trandingCharts.logic.ts
import { useEffect, useRef, useState } from "react";
import { http } from "@/api/api";
// Legacy helper (kept for optional fallback during rollout)
// import { nvdaTrading } from "@/controllers/nvdaTrading";

export type SymbolConfig = {
  symbol: string;
  label: string;
};

export type TimeframeDto = { id: number; code: string; minutes: number };

// Provider-agnostic shape (DB-merged rows). Provider field is optional;
// the new API doesn’t include it by default.
export type CandleWithFeaturesDto = {
  openTimeUtc: string; // ISO string (UTC)
  closeTimeUtc?: string | null;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number | null;

  // Optional, if your API ever includes them:
  provider?: string | null;
  timeframeMinutes?: number | null;

  // Optional feature fields (server currently returns nulls for these)
  range?: number | null;
  body?: number | null;
  upperWick?: number | null;
  lowerWick?: number | null;
  bodyRatio?: number | null;
  bodyPos?: number | null;
  pos20?: number | null;
  pos50?: number | null;
  bullish?: boolean;
  doji?: boolean;
  hammer?: boolean;
  shootingStar?: boolean;
};

export type CandlesState = {
  candles: CandleWithFeaturesDto[];
  loading: boolean;
  error: string | null;
  lastFetchedAt: string | null; // client timestamp (ISO) of the last successful fetch
};

/**
 * Fetch candles for a given symbol + timeframe from the new controller:
 *   GET /api/nvda-trading/candles?symbol=NVDA&timeframeCode=1m&limit=300
 *
 * Adds gentle polling and avoids resetting user zoom by only updating series.
 * NOTE: default refresh is 15s as requested.
 */
export function useCandles(
  symbol: string,
  timeframeCode: string,
  limit: number = 300,
  refreshMs: number = 15_000
): CandlesState {
  const [candles, setCandles] = useState<CandleWithFeaturesDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  const inFlight = useRef<Promise<void> | null>(null);

  async function fetchOnce() {
    if (inFlight.current) return;
    inFlight.current = (async () => {
      try {
        setLoading((prev) => prev && candles.length === 0);
        setError(null);

        // NEW: nvda-trading controller
        const url = `/api/nvda-trading/candles?symbol=${encodeURIComponent(
          symbol
        )}&timeframeCode=${encodeURIComponent(timeframeCode)}&limit=${limit}`;

        let res: CandleWithFeaturesDto[] | null = null;

        try {
          res = await http.get<CandleWithFeaturesDto[]>(url);
        } catch (err) {
          // Optional, temporary legacy fallback (uncomment if you need it during rollout)
          // try {
          //   res = await nvdaTrading.getCandles(symbol, timeframeCode, limit);
          // } catch {
          //   res = null;
          // }
          res = null;
          throw err;
        }

        const list = Array.isArray(res) ? res : [];

        // De-dup + sort ascending
        const map = new Map<string, CandleWithFeaturesDto>();
        for (const c of list) {
          if (!c?.openTimeUtc) continue;
          map.set(c.openTimeUtc, c);
        }
        const ordered = [...map.values()].sort(
          (a, b) =>
            new Date(a.openTimeUtc).getTime() -
            new Date(b.openTimeUtc).getTime()
        );

        setCandles(ordered);
        setError(null);
        setLastFetchedAt(new Date().toISOString()); // mark success
      } catch (e: any) {
        const status = e?.response?.status as number | undefined;
        if (status === 404) {
          setCandles([]);
          setError(null);
        } else if (status === 401) {
          setError("You must be signed in to load candles.");
          if (!candles.length) setCandles([]);
        } else {
          const msg =
            e?.response?.data?.detail ||
            e?.response?.data ||
            e?.message ||
            "Failed to load candles.";
          setError(msg);
          if (!candles.length) setCandles([]);
        }
      } finally {
        setLoading(false);
        inFlight.current = null;
      }
    })();
    await inFlight.current;
  }

  useEffect(() => {
    let alive = true;
    fetchOnce();
    const id = window.setInterval(() => {
      if (!alive) return;
      if (document.visibilityState !== "visible") return;
      fetchOnce();
    }, Math.max(5_000, refreshMs));
    return () => {
      alive = false;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframeCode, limit, refreshMs]);

  return { candles, loading, error, lastFetchedAt };
}

// Default list of symbols user can add to their “profile”.
export const DEFAULT_SYMBOLS: SymbolConfig[] = [
  { symbol: "NVDA", label: "NVIDIA" },
  { symbol: "MSFT", label: "Microsoft" },
  { symbol: "AAPL", label: "Apple" },
  { symbol: "AMD", label: "AMD" },
  { symbol: "TSLA", label: "Tesla" },
];

export async function fetchTimeframes(): Promise<TimeframeDto[]> {
  const list = await http.get<TimeframeDto[]>("/api/nvda-trading/timeframes");
  return Array.isArray(list) ? list : [];
}
