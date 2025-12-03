// path: src/components/pages/LiveTrading/liveTrading.logic.ts
import { useCallback, useEffect, useState } from "react";
import {
  nvdaTrading,
  type TradingSettingsDto,
  type WorkerOverviewDto,
  type MarketClockDto,
  type CandleWithFeaturesDto,
} from "@/controllers/nvdaTrading";

const LJU_TZ = "Europe/Ljubljana";

// ---- Small helpers for formatting times ----

export function formatLjubljana(
  iso: string | null | undefined,
  opts?: Intl.DateTimeFormatOptions
): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, {
    timeZone: LJU_TZ,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    ...opts,
  }).format(d);
}

export function formatUtc(
  iso: string | null | undefined,
  opts?: Intl.DateTimeFormatOptions
): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    ...opts,
  }).format(d);
}

export type LiveTradingState = {
  settings: TradingSettingsDto | null;
  workers: WorkerOverviewDto[];
  marketClock: MarketClockDto | null;

  lastPrice: number | null;
  lastCandleTimeUtc: string | null;

  loading: boolean;
  error: string | null;
  lastUpdatedAt: string | null;

  reload: () => Promise<void>;
};

function readErrorMessage(e: any, fallback: string): string {
  return (
    e?.response?.data?.detail ||
    e?.response?.data ||
    e?.message ||
    fallback
  );
}

async function fetchLastCandle(
  symbol: string,
  timeframeCode: string
): Promise<CandleWithFeaturesDto | null> {
  try {
    const rows = await nvdaTrading.getCandles(symbol, timeframeCode, 1);
    if (!rows || !rows.length) return null;
    return rows[rows.length - 1];
  } catch {
    return null;
  }
}

export function useLiveTradingDashboard(): LiveTradingState {
  const [settings, setSettings] = useState<TradingSettingsDto | null>(null);
  const [workers, setWorkers] = useState<WorkerOverviewDto[]>([]);
  const [marketClock, setMarketClock] = useState<MarketClockDto | null>(null);

  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [lastCandleTimeUtc, setLastCandleTimeUtc] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [settingsRes, workersRes, clockRes] = await Promise.all([
        nvdaTrading.getSettings(),
        nvdaTrading.getWorkers(),
        nvdaTrading.getMarketClock("NYSE"),
      ]);

      setSettings(settingsRes ?? null);
      setWorkers(workersRes ?? []);
      setMarketClock(clockRes ?? null);

      // Last price from latest candle, if settings exist
      if (settingsRes?.symbol && settingsRes.timeframeCode) {
        const candle = await fetchLastCandle(
          settingsRes.symbol,
          settingsRes.timeframeCode
        );
        if (candle) {
          setLastPrice(candle.close);
          setLastCandleTimeUtc(candle.openTimeUtc);
        } else {
          setLastPrice(null);
          setLastCandleTimeUtc(null);
        }
      } else {
        setLastPrice(null);
        setLastCandleTimeUtc(null);
      }

      setLastUpdatedAt(new Date().toISOString());
    } catch (e: any) {
      const msg = readErrorMessage(
        e,
        "Failed to load live trading data."
      );
      setError(msg);
      setSettings(null);
      setWorkers([]);
      setMarketClock(null);
      setLastPrice(null);
      setLastCandleTimeUtc(null);
      setLastUpdatedAt(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + periodic refresh every 30s
  useEffect(() => {
    load();
    const id = window.setInterval(load, 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  const reload = useCallback(async () => {
    await load();
  }, [load]);

  return {
    settings,
    workers,
    marketClock,
    lastPrice,
    lastCandleTimeUtc,
    loading,
    error,
    lastUpdatedAt,
    reload,
  };
}
