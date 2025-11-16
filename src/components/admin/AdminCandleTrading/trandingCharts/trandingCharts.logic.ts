// path: src/components/admin/AdminCandleTrading/trandingCharts/trandingCharts.logic.ts
import { useEffect, useState } from "react";
import { nvdaTrading, type CandleWithFeaturesDto } from "@/controllers/nvdaTrading";

export type SymbolConfig = {
  symbol: string;
  label: string;
  timeframeCode: string;
};

export type CandlesState = {
  candles: CandleWithFeaturesDto[];
  loading: boolean;
  error: string | null; // null = either OK or "no data" placeholder
};

/**
 * Fetch candles for a given symbol + timeframe.
 * Backend will later use symbol/timeframeCode; for now it can ignore them.
 */
export function useCandles(
  symbol: string,
  timeframeCode: string,
  limit: number = 300
): CandlesState {
  const [candles, setCandles] = useState<CandleWithFeaturesDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setCandles([]);

        const res = await nvdaTrading.getCandles(symbol, timeframeCode, limit);

        if (!cancelled) {
          setCandles(res ?? []);
          // empty array = "no data yet", not a hard error
          setError(null);
        }
      } catch (e: any) {
        if (cancelled) return;

        const status = e?.response?.status as number | undefined;

        // If a symbol/timeframe isn't supported yet (e.g. 404),
        // treat it as "no data" instead of an error.
        if (status === 404) {
          setCandles([]);
          setError(null);
          return;
        }

        const msg =
          e?.response?.data?.detail ||
          e?.response?.data ||
          e?.message ||
          "Failed to load candles.";
        setError(msg);
        setCandles([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [symbol, timeframeCode, limit]);

  return { candles, loading, error };
}

// Default list of symbols user can add to their “profile”.
// We’ll hook this to backend/user prefs later.
export const DEFAULT_SYMBOLS: SymbolConfig[] = [
  { symbol: "NVDA", label: "NVIDIA", timeframeCode: "1m" },
  { symbol: "MSFT", label: "Microsoft", timeframeCode: "1m" },
  { symbol: "AAPL", label: "Apple", timeframeCode: "1m" },
  { symbol: "AMD", label: "AMD", timeframeCode: "1m" },
  { symbol: "TSLA", label: "Tesla", timeframeCode: "1m" },
];
