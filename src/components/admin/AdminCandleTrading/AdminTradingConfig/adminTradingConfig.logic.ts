// path: src/components/admin/AdminTradingConfig/adminTradingConfig.logic.ts
import { useCallback, useEffect, useState } from "react";
import { http } from "@/api/api";

// --------- Types aligned to DB/DTOs ----------

// trading_settings row
export type TradingSettingRow = {
  id: number;
  symbol: string;
  timeframeCode: string;
  timeframeMinutes: number;
  dataProvider: string;
  initialCapitalPerWorker: number;
  historicalCandles: number;
  updatedUtc: string | null;
};

// api_providers row
export type ApiProviderRow = {
  id: number;
  code: string;
  name: string;
  baseUrl?: string | null;
  timezone?: string | null;
  dailyQuotaDefault?: number | null;
  perMinuteQuotaDefault?: number | null;
  createdAt: string;
};

// api_keys row (joined with provider code for convenience)
export type ApiKeyRow = {
  id: number;
  providerId: number;
  providerCode?: string | null;
  apiKey: string;
  label?: string | null;
  isActive: boolean;
  dailyQuota?: number | null;
  perMinuteQuota?: number | null;
  callsToday: number;
  quotaDate?: string | null;
  windowStartedAt?: string | null;
  windowCalls: number;
  rateLimitedAt?: string | null;
  nextAvailableAt?: string | null;
  ipAddress?: string | null;
  ipBurned: boolean;
  ipRateLimitedAt?: string | null;
  ipNextAvailableAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

// IP ↔ key history row from /api/trading/api-key-ip-history
export type ApiKeyIpHistoryRow = {
  historyId: number;
  apiKeyId: number;
  providerCode: string;
  keyLabel: string | null;
  apiKey: string;
  isActive: boolean;
  ipAddress: string;
  firstSeenAt: string;
  lastSeenAt: string;
  ipBurned: boolean;
  ipRateLimitedAt: string | null;
  ipNextAvailableAt: string | null;
  dailyQuota: number | null;
  perMinuteQuota: number | null;
  callsToday: number;
};

// ---------- Trading settings hook ----------

export type TradingSettingsForm = {
  symbol: string;
  timeframeCode: string;
  timeframeMinutes: string;
  dataProvider: string;
  initialCapitalPerWorker: string;
  historicalCandles: string;
};

export async function fetchApiKeyIpHistory(): Promise<ApiKeyIpHistoryRow[]> {
  const res = await http.get<ApiKeyIpHistoryRow[]>(
    "/api/trading/api-key-ip-history"
  );
  return res ?? [];
}

export function useTradingSettingsAdmin() {
  const [rows, setRows] = useState<TradingSettingRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<TradingSettingsForm>({
    symbol: "NVDA",
    timeframeCode: "1m",
    timeframeMinutes: "1",
    dataProvider: "twelvedata",
    initialCapitalPerWorker: "0",
    historicalCandles: "200",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http.get<TradingSettingRow[]>("/api/trading/settings");
      setRows(res ?? []);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data ||
        e?.message ||
        "Failed to load trading settings.";
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateField = useCallback(
    (key: keyof TradingSettingsForm, value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const create = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      const body = {
        symbol: form.symbol.trim().toUpperCase(),
        timeframeCode: form.timeframeCode.trim(),
        timeframeMinutes: parseInt(form.timeframeMinutes || "1", 10),
        dataProvider: form.dataProvider.trim().toLowerCase(),
        initialCapitalPerWorker: parseFloat(
          form.initialCapitalPerWorker || "0"
        ),
        historicalCandles: parseInt(form.historicalCandles || "200", 10),
      };

      await http.post<TradingSettingRow>("/api/trading/settings", body);
      await load();
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data ||
        e?.message ||
        "Failed to add trading setting.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [form, load]);

  const remove = useCallback(
    async (id: number) => {
      if (!id) return;
      try {
        setSaving(true);
        setError(null);
        await http.del<void>(`/api/trading/settings/${id}`);
        await load();
      } catch (e: any) {
        const msg =
          e?.response?.data?.detail ||
          e?.response?.data ||
          e?.message ||
          "Failed to delete trading setting.";
        setError(msg);
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  return {
    rows,
    form,
    loading,
    saving,
    error,
    reload: load,
    create,
    remove,
    updateField,
  };
}

// ---------- Providers hook ----------

export type ApiProviderForm = {
  code: string;
  name: string;
  baseUrl: string;
  timezone: string;
  dailyQuotaDefault: string;
  perMinuteQuotaDefault: string;
};

export function useApiProvidersAdmin() {
  const [providers, setProviders] = useState<ApiProviderRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ApiProviderForm>({
    code: "twelvedata",
    name: "Twelve Data",
    baseUrl: "https://api.twelvedata.com",
    timezone: "America/New_York",
    dailyQuotaDefault: "800",
    perMinuteQuotaDefault: "8",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http.get<ApiProviderRow[]>(
        "/api/trading/api-providers"
      );
      setProviders(res ?? []);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data ||
        e?.message ||
        "Failed to load API providers.";
      setError(msg);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateField = useCallback(
    (key: keyof ApiProviderForm, value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const create = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      const body = {
        code: form.code.trim(),
        name: form.name.trim(),
        baseUrl: form.baseUrl.trim() || null,
        timezone: form.timezone.trim() || "UTC",
        dailyQuotaDefault: form.dailyQuotaDefault
          ? parseInt(form.dailyQuotaDefault, 10)
          : null,
        perMinuteQuotaDefault: form.perMinuteQuotaDefault
          ? parseInt(form.perMinuteQuotaDefault, 10)
          : null,
      };

      await http.post<ApiProviderRow>("/api/trading/api-providers", body);
      await load();
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data ||
        e?.message ||
        "Failed to add API provider.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [form, load]);

  return {
    providers,
    loading,
    saving,
    error,
    form,
    updateField,
    create,
    reload: load,
  };
}

// ---------- API keys hook ----------

export type ApiKeyForm = {
  providerId: string;
  apiKey: string;
  label: string;
  isActive: string; // "1" | "0"
  dailyQuota: string;
  perMinuteQuota: string;
};

export function useApiKeysAdmin() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ApiKeyForm>({
    providerId: "",
    apiKey: "",
    label: "",
    isActive: "1",
    dailyQuota: "800",
    perMinuteQuota: "8",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http.get<ApiKeyRow[]>("/api/trading/api-keys");
      setKeys(res ?? []);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data ||
        e?.message ||
        "Failed to load API keys.";
      setError(msg);
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateField = useCallback(
    (key: keyof ApiKeyForm, value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const create = useCallback(async () => {
    if (!form.providerId) {
      setError("Select a provider for this key first.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const body = {
        providerId: parseInt(form.providerId, 10),
        apiKey: form.apiKey.trim(),
        label: form.label.trim() || null,
        isActive: form.isActive === "1",
        dailyQuota: form.dailyQuota
          ? parseInt(form.dailyQuota, 10)
          : null,
        perMinuteQuota: form.perMinuteQuota
          ? parseInt(form.perMinuteQuota, 10)
          : null,
      };

      await http.post<ApiKeyRow>("/api/trading/api-keys", body);
      await load();
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data ||
        e?.message ||
        "Failed to add API key.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }, [form, load]);

  return {
    keys,
    loading,
    saving,
    error,
    form,
    updateField,
    create,
    reload: load,
  };
}
