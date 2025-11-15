// path: src/components/admin/AdminCandleTrading/adminCandleTrading.logic.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  nvdaTrading,
  type TradingSettingsDto,
  type UpdateTradingSettingsRequest,
  type WorkerOverviewDto,
  type WorkerEquityPointDto,
  type MarketClockDto,
} from "@/controllers/nvdaTrading";

// ---------- Settings ----------

export type TradingSettingsForm = {
  symbol: string;
  timeframeCode: string;
  timeframeMinutes: string;
  dataProvider: string;
  initialCapitalPerWorker: string;
  historicalCandles: string;
};

export function useTradingSettings() {
  const [settings, setSettings] = useState<TradingSettingsDto | null>(null);
  const [form, setForm] = useState<TradingSettingsForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedIso, setLastSavedIso] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await nvdaTrading.getSettings();
      setSettings(res);
      setForm({
        symbol: res.symbol,
        timeframeCode: res.timeframeCode,
        timeframeMinutes: String(res.timeframeMinutes),
        dataProvider: res.dataProvider,
        initialCapitalPerWorker: String(res.initialCapitalPerWorker),
        historicalCandles: String(res.historicalCandles),
      });
      setLastSavedIso(res.updatedUtc);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data ||
        e?.message ||
        "Failed to load trading settings.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateField = useCallback(
    (key: keyof TradingSettingsForm, value: string) => {
      setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    []
  );

  const save = useCallback(async () => {
    if (!form) return;
    try {
      setSaving(true);
      setError(null);

      const body: UpdateTradingSettingsRequest = {
        symbol: form.symbol.trim().toUpperCase(),
        timeframeCode: form.timeframeCode.trim(),
        timeframeMinutes: parseInt(form.timeframeMinutes || "1", 10),
        dataProvider: form.dataProvider.trim().toLowerCase(), // "alpha" | "finnhub"
        initialCapitalPerWorker: parseFloat(
          form.initialCapitalPerWorker || "50"
        ),
        historicalCandles: parseInt(form.historicalCandles || "200", 10),
      };

      const res = await nvdaTrading.updateSettings(body);
      setSettings(res);
      setForm({
        symbol: res.symbol,
        timeframeCode: res.timeframeCode,
        timeframeMinutes: String(res.timeframeMinutes),
        dataProvider: res.dataProvider,
        initialCapitalPerWorker: String(res.initialCapitalPerWorker),
        historicalCandles: String(res.historicalCandles),
      });
      setLastSavedIso(res.updatedUtc);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data ||
        e?.message ||
        "Failed to save trading settings.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [form]);

  return {
    settings,
    form,
    loading,
    saving,
    error,
    lastSavedIso,
    updateField,
    reload: load,
    save,
  };
}

// ---------- Workers overview ----------

export function useWorkersOverview(pollMs: number = 10000) {
  const [workers, setWorkers] = useState<WorkerOverviewDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await nvdaTrading.getWorkers();
      setWorkers(res);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data ||
        e?.message ||
        "Failed to load workers.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!pollMs) return;
    const id = window.setInterval(load, pollMs);
    return () => window.clearInterval(id);
  }, [load, pollMs]);

  const bestWorker = useMemo(() => {
    if (!workers.length) return null;
    return workers.reduce((best, w) => {
      const eq = w.equity ?? w.initialCapital;
      const bestEq = best ? best.equity ?? best.initialCapital : -Infinity;
      return eq > bestEq ? w : best;
    }, workers[0]);
  }, [workers]);

  return { workers, loading, error, reload: load, bestWorker };
}

// ---------- Worker equity timeseries ----------

export function useWorkerEquity(workerId: number | null, hoursBack: number) {
  const [points, setPoints] = useState<WorkerEquityPointDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workerId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await nvdaTrading.getWorkerEquity(workerId, hoursBack);
      setPoints(res);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data ||
        e?.message ||
        "Failed to load equity history.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [workerId, hoursBack]);

  useEffect(() => {
    load();
  }, [load]);

  return { points, loading, error, reload: load };
}

// ---------- Market clock ----------

export function useMarketClock(
  exchange: string = "NYSE",
  pollMs: number = 30000
) {
  const [clock, setClock] = useState<MarketClockDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await nvdaTrading.getMarketClock(exchange);
      setClock(res);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data ||
        e?.message ||
        "Failed to load market clock.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [exchange]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!pollMs) return;
    const id = window.setInterval(load, pollMs);
    return () => window.clearInterval(id);
  }, [load, pollMs]);

  // Local ticking clock so the countdown updates every second
  useEffect(() => {
    const id = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Basic “time until next open” helper (client-side)
  const countdown = useMemo(() => {
    if (!clock) return null;
    const next = new Date(clock.nextSessionOpenLjubljana).getTime();
    const diffMs = next - nowTs;
    if (diffMs <= 0) return "now";

    const sec = Math.floor(diffMs / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [clock, nowTs]);

  return { clock, loading, error, countdown, reload: load };
}
