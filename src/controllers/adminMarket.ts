import { http } from "@/api/api";

// ---------- Types ----------
export type EtlOverview = {
  companies: number;
  articlesGdelt: number;
  articlesExt: number;
  requestsTotal: number;
  jobs: number;
  okRate24h: number; // 0..1
  perSource24h: { source: string; count: number; ok: number; bad: number; s429: number }[];
};

export type KeyInventoryRow = {
  source: string;
  total: number;
  active: number;
  free: number;
  blocked: number;
  inactive: number;
};

export type BlockedKeyRow = {
  id: number;
  source: string;
  accountLabel?: string | null;
  exhaustedUntil: string;
  minutesRemaining: number;
};

export type NextKeyRow = { source: string; next: { id: number; accountLabel?: string | null; lastUsedAt?: string | null; usageCount: number } | null };

export type FairnessRow = {
  source: string; total: number;
  busiestAccountId: number; busiestLabel?: string | null;
  busiestShare: number; busiestPct: number;
};

export type RpmRow = { source: string; minute: string; count: number };

export type SuccessRow = {
  bySource: { source: string; total: number; ok: number; bad: number; s429: number; e4xx: number; e5xx: number }[];
  topReasons: { reason: string; c: number }[];
};

export type JobsOverviewRow = { status: string; c: number };

export type WorkerHealth = {
  active: any[];
  stale: any[];
  total: number;
};

export type ContentOverview = {
  totalGdelt: number; totalExt: number;
  latestGdelt?: string | null; latestExt?: string | null;
};

export type CoverageRow = { Symbol: string; gdelt: number; ext: number };

export type PriceFreshnessRow = { symbol: string; latest?: string | null; daysSince?: number | null };

export type AlertsPayload = {
  noFreeSources: string[];
  hot429: { source: string; total: number; s429: number; pct: number }[];
  hammering: { source: string; accountId: number; seenAt: string; until: string; requestsDuringBlock: number }[];
  stuckJobs: any;
};

// ---------- API ----------
export const adminMarket = {
  overview: () => http.get<EtlOverview>("/api/etl/overview"),
  countsByCompany: () => http.get<Array<{ symbol: string; total: number }>>("/api/etl/counts"),

  keyInventory: () => http.get<KeyInventoryRow[]>("/api/etl/keys/inventory"),
  keyBlocked: () => http.get<BlockedKeyRow[]>("/api/etl/keys/blocked"),
  keyNext: () => http.get<NextKeyRow[]>("/api/etl/keys/next"),
  keyFairness: (hours = 24) => http.get<FairnessRow[]>(`/api/etl/keys/fairness?hours=${hours}`),
  keyUsage: (hours = 24) => http.get<Array<{ Source: string; AccountId: number; accountLabel?: string | null; C: number }>>(`/api/etl/keys/usage?hours=${hours}`),

  rpm: (minutes = 120) => http.get<RpmRow[]>(`/api/etl/traffic/rpm?minutes=${minutes}`),
  success: (hours = 24) => http.get<SuccessRow>(`/api/etl/traffic/success?hours=${hours}`),
  endpoints: (hours = 24) => http.get<Array<{ source: string; endpoint: string | null; c: number }>>(`/api/etl/traffic/endpoints?hours=${hours}`),

  activeBlocks: () => http.get<Array<{ id: number; source: string; accountId: number; minutesRemaining: number }>>("/api/etl/rate/active-blocks"),
  rateStats: (days = 7) => http.get<Array<{ source: string; count: number; avg: number; p95: number; p99: number }>>(`/api/etl/rate/stats?days=${days}`),
  hammering: (hours = 24) => http.get<Array<{ source: string; accountId: number; requestsDuringBlock: number }>>(`/api/etl/rate/hammering?hours=${hours}`),

  jobsOverview: () => http.get<JobsOverviewRow[]>("/api/etl/jobs/overview"),
  jobsStuck: (mins = 10) => http.get<any[]>(`/api/etl/jobs/stuck?staleMinutes=${mins}`),
  workers: () => http.get<WorkerHealth>("/api/etl/workers/health"),

  contentOverview: () => http.get<ContentOverview>("/api/etl/content/overview"),
  coverage: () => http.get<CoverageRow[]>("/api/etl/content/coverage"),
  dupes: (days = 1) => http.get<{ gdelt: any[]; ext: any[] }>(`/api/etl/content/dupes?days=${days}`),
  langmix: (days = 7) => http.get<any[]>(`/api/etl/content/langmix?days=${days}`),

  prices: () => http.get<PriceFreshnessRow[]>("/api/etl/prices/freshness"),

  control: () => http.get<{ checkpoints: any[]; gdeltProbeBadDays: any[] }>("/api/etl/control"),
  alerts: () => http.get<AlertsPayload>("/api/etl/alerts"),
};
