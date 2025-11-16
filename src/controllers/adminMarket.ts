import { http } from "@/api/api";

// ---------- Types ----------

// /api/etl/overview
export type EtlOverview = {
  companies: number;
  articlesGdelt: number;
  articlesExt: number;
  requestsTotal: number;
  jobs: number;
  okRate24h: number; // 0..1
  perSource24h: {
    source: string;
    count: number;
    ok: number;
    bad: number;
    s429: number;
  }[];
};

// /api/etl/counts
export type CountsByCompanyRow = {
  symbol: string;
  total: number;
};

// /api/etl/keys/inventory
export type KeyInventoryRow = {
  source: string;
  total: number;
  active: number;
  free: number;
  blocked: number;
  inactive: number;
};

// /api/etl/keys/blocked
export type BlockedKeyRow = {
  id: number;
  source: string;
  accountLabel?: string | null;
  exhaustedUntil: string;
  minutesRemaining: number;
};

// /api/etl/keys/next
export type NextKeyRow = {
  source: string;
  next: {
    id: number;
    accountLabel?: string | null;
    lastUsedAt?: string | null;
    usageCount: number;
  } | null;
};

// /api/etl/keys/fairness
export type FairnessRow = {
  source: string;
  total: number;
  busiestAccountId: number;
  busiestLabel?: string | null;
  busiestShare: number; // 0..1
  busiestPct: number; // %
};

// /api/etl/keys/stale
export type StaleKeyRow = {
  id: number;
  source: string;
  accountLabel?: string | null;
  lastUsedAt?: string | null;
  usageCount: number;
};

// /api/etl/keys/usage
export type KeyUsageRow = {
  Source: string;
  AccountId: number;
  accountLabel?: string | null;
  C: number;
};

// /api/etl/traffic/rpm
export type RpmRow = {
  source: string;
  minute: string;
  count: number;
};

// /api/etl/traffic/success
export type SuccessRow = {
  bySource: {
    source: string;
    total: number;
    ok: number;
    bad: number;
    s429: number;
    e4xx: number;
    e5xx: number;
  }[];
  topReasons: { reason: string; c: number }[];
};

// /api/etl/traffic/endpoints
export type EndpointRow = {
  source: string;
  endpoint: string | null;
  c: number;
};

// /api/etl/rate/active-blocks
export type ActiveBlockRow = {
  id: number;
  source: string;
  accountId: number;
  keyword?: string | null;
  windowStart?: string | null;
  windowEnd?: string | null;
  seenAt: string;
  until: string;
  minutesRemaining: number;
};

// /api/etl/rate/stats
export type RateStatsRow = {
  source: string;
  count: number;
  avg: number;
  p95: number;
  p99: number;
};

// /api/etl/rate/hammering
export type HammeringRow = {
  source: string;
  accountId: number;
  seenAt: string;
  until: string;
  requestsDuringBlock: number;
};

// /api/etl/jobs/overview
export type JobsOverviewRow = {
  status: string;
  c: number;
};

// /api/etl/jobs/stuck
export type StuckJobRow = {
  id: number;
  keyword: string;
  startUtc?: string | null;
  endUtc?: string | null;
  status: string;
  assignedTo?: string | null;
  lastProgressAt?: string | null;
  leaseExpiresAt?: string | null;
  createdAt: string;
};

// /api/etl/workers/health
export type WorkerSnapshot = {
  workerId: string;
  hostname: string;
  pid: number;
  startedAt: string;
  heartbeatAt: string;
  currentJobId?: number | null;
  currentSource?: string | null;
  currentKeyword?: string | null;
  currentWindowStart?: string | null;
  currentWindowEnd?: string | null;
};

export type WorkerHealth = {
  active: WorkerSnapshot[];
  stale: WorkerSnapshot[];
  total: number;
};

// /api/etl/content/overview
export type ContentOverview = {
  totalGdelt: number;
  totalExt: number;
  latestGdelt?: string | null;
  latestExt?: string | null;
};

// /api/etl/content/coverage
export type CoverageRow = {
  symbol: string;
  gdelt: number;
  ext: number;
};

// /api/etl/prices/freshness
export type PriceFreshnessRow = {
  symbol: string;
  latest?: string | null;
  daysSince?: number | null;
};

// /api/etl/control
export type EtlControlPayload = {
  checkpoints: any[];
  gdeltProbeBadDays: any[];
};

// /api/etl/alerts
export type AlertsPayload = {
  noFreeSources: string[];
  hot429: {
    source: string;
    total: number;
    s429: number;
    pct: number;
  }[];
  hammering: {
    source: string;
    accountId: number;
    seenAt: string;
    until: string;
    requestsDuringBlock: number;
  }[];
  stuckJobs: StuckJobRow[] | any;
};

// /api/etl/maintenance/dead-worker-cleanse (POST)
export type DeadWorkerCleanseResult = {
  deadWorkers: {
    count: number;
    ids: string[];
  };
  jobCounts: {
    unsearched: number;
    searching_undone: number;
    currently_claimed: number;
    completed: number;
  };
  claimableSample: Array<{
    id: number;
    keyword: string;
    status: string;
    priority: number;
    assignedTo?: string | null;
    lastProgressAt?: string | null;
    leaseExpiresAt?: string | null;
  }>;
  gdeltProgressSample: Array<{
    id: number;
    keyword: string;
    status: string;
    gdelt_progress?: string | null;
    assignedTo?: string | null;
    lastProgressAt?: string | null;
  }>;
};

// /api/etl/jobs/completed-counter
export type CompletedCounterResult = {
  completed_count: number;
};

// /api/etl/network/tor-status
export type TorStatusPayload = {
  // number of rows in tor_rate_limited_ips (a.k.a. "rate-limited IPs")
  totalBlocked: number;

  // SELECT * FROM tor_rate_limited_ips
  blockedIps: Array<{
    ip?: string | null;
    source?: string | null;
    until?: string | null;
    reason?: string | null;
    hits: number;
    created_at?: string | null;
  }>;

  // exit_ip -> worker_count summary
  // We'll sum worker_count client-side to show "total tor workers"
  workersPerIp: Array<{
    exit_ip?: string | null;
    worker_count: number;
    workers?: string | null;
  }>;
};

// /api/etl/network/tor-clear-rate-limited
export type TorClearResult = {
  cleared: number;
};

// /api/etl/content/mining-stats
export type MiningStatsPayload = {
  total_articles: number;
  mined_articles: number;
  clean_articles: number;
  mined_pct: number;
  clean_pct: number;
};

// /api/etl/cleaner/overview
export type CleanerOverviewPayload = {
  queueDepth: {
    queued: number;
    cleaning: number;
    error: number;
    done: number;
  };
  throughput: {
    jobsDoneLastHour: number;
    jobsDoneLast24h: number;
  };
  successRate: {
    ok: number;
    bad: number;
    total: number;
    successRatePct: number;
    errorRatePct: number;
  };
  attempts: {
    avgAttempts: number;
    maxAttempts: number;
    totalJobs: number;
  };
};

// /api/etl/cleaner/workers
export type CleanerWorkerInfo = {
  worker_id: string;
  last_activity?: string | null;
  last_event_meta?: string | null;
  success_10m: number;
  total_10m: number;
  error_rate_10m: number;
  health: string; // "green" | "yellow" | "red"
};
export type CleanerWorkersPayload = {
  workers: CleanerWorkerInfo[];
  summary: {
    totalWorkersObserved: number;
    activeRecently: number;
    idleOrDead: number;
  };
  capacity: {
    workersPerContainerDefault: number;
    containersObserved: number;
    expectedWorkers: number;
    activeRecently: number;
  };
};

// /api/etl/cleaner/queue-inspector
export type CleanerQueueInspectorPayload = {
  stuckCleaning: Array<{
    id?: number | null;
    article_id?: number | null;
    status?: string | null;
    attempt?: number | null;
    claimed_by?: string | null;
    claimed_at?: string | null;
    lease_expires_at?: string | null;
    last_error?: string | null;
  }>;
  maxedRetries: Array<{
    id?: number | null;
    article_id?: number | null;
    status?: string | null;
    attempt?: number | null;
    claimed_by?: string | null;
    claimed_at?: string | null;
    lease_expires_at?: string | null;
    last_error?: string | null;
  }>;
  maxAttemptsDefault: number;
};

// /api/etl/cleaner/recent-cleaned
export type CleanerRecentCleanedRow = {
  article_id?: number | null;
  title?: string | null;
  clean_text_len?: number | null;
  headline_norm_len?: number | null;
  claimed_at?: string | null;
  clean_text_preview?: string | null;
  headline_norm_preview?: string | null;
  raw_article_text_preview?: string | null;
  cached_text_preview?: string | null;
  body_source?: string | null;
};

// /api/etl/cleaner/error-intel
export type CleanerErrorIntelRow = {
  reason: string;
  total_errors: number;
  unique_articles: number;
  avg_attempt: number;
  samples: Array<{
    article_id?: number | null;
    last_error?: string | null;
  }>;
};

// /api/etl/cleaner/capacity
export type CleanerCapacityPayload = {
  config: {
    leaseSecondsDefault: number;
    maxAttemptsDefault: number;
    sleepIdleSecondsDefault: number;
    workersPerContainerDefault: number;
  };
  capacity: {
    containersObserved: number;
    expectedWorkers: number;
    activeRecently: number;
    totalWorkersObserved: number;
  };
};

// ----- Watchdog types -----
export type DbHealth = {
  name: string;
  ok: boolean;
  latencyMs: number;
  dbUtcNow?: string | null;
  error?: string | null;
};

export type WatchdogOverview = {
  serverUtc: string;
  uptimeSeconds: number;
  uptimeHuman: string;
  appDb: DbHealth;
  alphaDb: DbHealth;
  tradingDb: DbHealth;
};

// watchdog_cleanup_log stats
export type WatchdogCleanupStats = {
  totalRuns: number;
  firstRunStartedAt?: string | null;


  httpArticlesDeletedSum: number;
  httpsArticlesDeletedSum: number;
  status404DeletedSum: number;
  status410DeletedSum: number;
  badLinkArticlesDeletedSum: number;
  mlArticlesDeletedSum: number;
  newsArticlesDeletedSum: number;
  pageCacheDeletedSum: number;
  totalRowsDeletedSum: number;

  lastRunStartedAt?: string | null;
  lastRunFinishedAt?: string | null;
  lastHttpArticlesDeleted?: number | null;
  lastHttpsArticlesDeleted?: number | null;
  lastStatus404Deleted?: number | null;
  lastStatus410Deleted?: number | null;
  lastBadLinkArticlesDeleted?: number | null;
  lastMlArticlesDeleted?: number | null;
  lastNewsArticlesDeleted?: number | null;
  lastPageCacheDeleted?: number | null;
  lastTotalRowsDeleted?: number | null;
};

// ---------- API CLIENT ----------

export const adminMarket = {
  // Overview / high-level
  overview: () => http.get<EtlOverview>("/api/etl/overview"),
  countsByCompany: () => http.get<CountsByCompanyRow[]>("/api/etl/counts"),

  // Keys
  keyInventory: () => http.get<KeyInventoryRow[]>("/api/etl/keys/inventory"),
  keyBlocked: () => http.get<BlockedKeyRow[]>("/api/etl/keys/blocked"),
  keyNext: () => http.get<NextKeyRow[]>("/api/etl/keys/next"),
  keyFairness: (hours = 24) =>
    http.get<FairnessRow[]>(`/api/etl/keys/fairness?hours=${hours}`),
  keyUsage: (hours = 24) =>
    http.get<KeyUsageRow[]>(`/api/etl/keys/usage?hours=${hours}`),
  keyStale: (hours = 24) =>
    http.get<StaleKeyRow[]>(`/api/etl/keys/stale?hours=${hours}`),

  // Traffic / quality
  rpm: (minutes = 120) =>
    http.get<RpmRow[]>(`/api/etl/traffic/rpm?minutes=${minutes}`),
  success: (hours = 24) =>
    http.get<SuccessRow>(`/api/etl/traffic/success?hours=${hours}`),
  endpoints: (hours = 24) =>
    http.get<EndpointRow[]>(`/api/etl/traffic/endpoints?hours=${hours}`),

  // Rate limiting
  activeBlocks: () => http.get<ActiveBlockRow[]>("/api/etl/rate/active-blocks"),
  rateStats: (days = 7) =>
    http.get<RateStatsRow[]>(`/api/etl/rate/stats?days=${days}`),
  hammering: (hours = 24) =>
    http.get<HammeringRow[]>(`/api/etl/rate/hammering?hours=${hours}`),

  // Jobs & workers
  jobsOverview: () => http.get<JobsOverviewRow[]>("/api/etl/jobs/overview"),
  jobsStuck: (mins = 10) =>
    http.get<StuckJobRow[]>(`/api/etl/jobs/stuck?staleMinutes=${mins}`),
  workers: () => http.get<WorkerHealth>("/api/etl/workers/health"),

  // Content / articles / pricing
  contentOverview: () => http.get<ContentOverview>("/api/etl/content/overview"),
  coverage: () => http.get<CoverageRow[]>("/api/etl/content/coverage"),
  dupes: (days = 1) =>
    http.get<{ gdelt: any[]; ext: any[] }>(
      `/api/etl/content/dupes?days=${days}`
    ),
  langmix: (days = 7) =>
    http.get<any[]>(`/api/etl/content/langmix?days=${days}`),
  prices: () => http.get<PriceFreshnessRow[]>("/api/etl/prices/freshness"),

  // Control / alerts
  control: () => http.get<EtlControlPayload>("/api/etl/control"),
  alerts: () => http.get<AlertsPayload>("/api/etl/alerts"),

  // Maintenance / recovery ops
  deadWorkerCleanse: () =>
    http.post<DeadWorkerCleanseResult>(
      "/api/etl/maintenance/dead-worker-cleanse"
    ),

  // Misc health
  completedCounter: () =>
    http.get<CompletedCounterResult>("/api/etl/jobs/completed-counter"),

  // TOR / pipeline
  torStatus: () => http.get<TorStatusPayload>("/api/etl/network/tor-status"),
  torClearRateLimited: () =>
    http.post<TorClearResult>("/api/etl/network/tor-clear-rate-limited"),

  miningStats: () =>
    http.get<MiningStatsPayload>("/api/etl/content/mining-stats"),

  // Cleaner dashboard
  cleanerOverview: () =>
    http.get<CleanerOverviewPayload>("/api/etl/cleaner/overview"),
  cleanerWorkers: () =>
    http.get<CleanerWorkersPayload>("/api/etl/cleaner/workers"),
  cleanerQueueInspector: () =>
    http.get<CleanerQueueInspectorPayload>("/api/etl/cleaner/queue-inspector"),
  cleanerRecentCleaned: () =>
    http.get<CleanerRecentCleanedRow[]>("/api/etl/cleaner/recent-cleaned"),
  cleanerErrorIntel: () =>
    http.get<CleanerErrorIntelRow[]>("/api/etl/cleaner/error-intel"),
  cleanerCapacity: () =>
    http.get<CleanerCapacityPayload>("/api/etl/cleaner/capacity"),

  // Watchdog – DB + cleanup stats
  watchdogOverview: () =>
    http.get<WatchdogOverview>("/api/watchdog/overview"),
  watchdogCleanup: () =>
    http.get<WatchdogCleanupStats>("/api/watchdog/cleanup"),
};
