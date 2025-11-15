import { useEffect, useState, useCallback } from "react";
import {
  adminMarket,
  type EtlOverview,
  type KeyInventoryRow,
  type BlockedKeyRow,
  type FairnessRow,
  type JobsOverviewRow,
  type WorkerHealth,
  type PriceFreshnessRow,
  type AlertsPayload,
  type CleanerOverviewPayload,
  type CleanerCapacityPayload,
  type MiningStatsPayload,
  type TorStatusPayload,
  type CompletedCounterResult,
} from "@/controllers/adminMarket";

// ----- Core ETL overview -----
export function useEtlOverview() {
  const [data, setData] = useState<EtlOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        setLoading(true);
        const res = await adminMarket.overview();
        if (!dead) setData(res);
      } catch (e: any) {
        if (!dead) setErr(e?.message ?? "load failed");
      } finally {
        if (!dead) setLoading(false);
      }
    })();

    const t = setInterval(
      () =>
        adminMarket
          .overview()
          .then((r) => !dead && setData(r))
          .catch(() => {}),
      10000
    );

    return () => {
      dead = true;
      clearInterval(t);
    };
  }, []);

  return { data, loading, err };
}

// ----- Top article counts -----
export function useTopCounts() {
  const [rows, setRows] = useState<Array<{ symbol: string; total: number }>>(
    []
  );

  useEffect(() => {
    let dead = false;
    const run = () =>
      adminMarket
        .countsByCompany()
        .then((r) => !dead && setRows(r))
        .catch(() => {});
    run();

    const t = setInterval(run, 15000);

    return () => {
      dead = true;
      clearInterval(t);
    };
  }, []);

  return rows;
}

// ----- Key inventory -----
export function useKeyInventory() {
  const [rows, setRows] = useState<KeyInventoryRow[]>([]);

  useEffect(() => {
    let dead = false;
    const run = () =>
      adminMarket
        .keyInventory()
        .then((r) => !dead && setRows(r))
        .catch(() => {});
    run();

    const t = setInterval(run, 15000);

    return () => {
      dead = true;
      clearInterval(t);
    };
  }, []);

  return rows;
}

// ----- Blocked keys -----
export function useBlockedKeys() {
  const [rows, setRows] = useState<BlockedKeyRow[]>([]);

  useEffect(() => {
    let dead = false;
    const run = () =>
      adminMarket
        .keyBlocked()
        .then((r) => !dead && setRows(r))
        .catch(() => {});
    run();

    const t = setInterval(run, 10000);

    return () => {
      dead = true;
      clearInterval(t);
    };
  }, []);

  return rows;
}

// ----- Fairness -----
export function useFairness() {
  const [rows, setRows] = useState<FairnessRow[]>([]);

  useEffect(() => {
    let dead = false;
    const run = () =>
      adminMarket
        .keyFairness(24)
        .then((r) => !dead && setRows(r))
        .catch(() => {});
    run();

    const t = setInterval(run, 30000);

    return () => {
      dead = true;
      clearInterval(t);
    };
  }, []);

  return rows;
}

// ----- Jobs & worker heartbeats -----
export function useJobsWorkers() {
  const [jobs, setJobs] = useState<JobsOverviewRow[]>([]);
  const [workers, setWorkers] = useState<WorkerHealth | null>(null);

  useEffect(() => {
    let dead = false;
    const run = async () => {
      try {
        const [j, w] = await Promise.all([
          adminMarket.jobsOverview(),
          adminMarket.workers(),
        ]);
        if (!dead) {
          setJobs(j);
          setWorkers(w);
        }
      } catch {
        /* swallow */
      }
    };
    run();

    const t = setInterval(run, 15000);

    return () => {
      dead = true;
      clearInterval(t);
    };
  }, []);

  return { jobs, workers };
}

// ----- Price freshness -----
export function usePrices() {
  const [rows, setRows] = useState<PriceFreshnessRow[]>([]);

  useEffect(() => {
    let dead = false;
    const run = () =>
      adminMarket
        .prices()
        .then((r) => !dead && setRows(r))
        .catch(() => {});
    run();

    const t = setInterval(run, 60000);

    return () => {
      dead = true;
      clearInterval(t);
    };
  }, []);

  return rows;
}

// ----- Alerts -----
export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertsPayload | null>(null);

  useEffect(() => {
    let dead = false;
    const run = () =>
      adminMarket
        .alerts()
        .then((a) => !dead && setAlerts(a))
        .catch(() => {});
    run();

    const t = setInterval(run, 20000);

    return () => {
      dead = true;
      clearInterval(t);
    };
  }, []);

  return alerts;
}

// ----- Cleaner Overview -----
export function useCleanerOverview() {
  const [data, setData] = useState<CleanerOverviewPayload | null>(null);

  useEffect(() => {
    let dead = false;
    const run = () =>
      adminMarket
        .cleanerOverview()
        .then((r) => {
          if (!dead) setData(r);
        })
        .catch(() => {});
    run();

    const t = setInterval(run, 10000);

    return () => {
      dead = true;
      clearInterval(t);
    };
  }, []);

  return data;
}

// ----- Cleaner Capacity -----
export function useCleanerCapacity() {
  const [data, setData] = useState<CleanerCapacityPayload | null>(null);

  useEffect(() => {
    let dead = false;
    const run = () =>
      adminMarket
        .cleanerCapacity()
        .then((r) => {
          if (!dead) setData(r);
        })
        .catch(() => {});
    run();

    const t = setInterval(run, 30000);

    return () => {
      dead = true;
      clearInterval(t);
    };
  }, []);

  return data;
}

// ----- Mining Stats -----
// adds manual refetch() + loading
export function useMiningStats() {
  const [data, setData] = useState<MiningStatsPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminMarket.miningStats();
      setData(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let dead = false;

    // initial load with spinner
    (async () => {
      setLoading(true);
      try {
        const r = await adminMarket.miningStats();
        if (!dead) setData(r);
      } finally {
        if (!dead) setLoading(false);
      }
    })();

    // silent background poll every 30s
    const t = setInterval(() => {
      adminMarket
        .miningStats()
        .then((r) => {
          if (!dead) setData(r);
        })
        .catch(() => {});
    }, 30000);

    return () => {
      dead = true;
      clearInterval(t);
    };
  }, [refetch]);

  return { data, loading, refetch };
}

// ----- TOR Status (derived totals + manual refetch) -----
export function useTorStatus() {
  // torWorkerTotal = sum(worker_count)
  // limitedIpTotal = totalBlocked
  type TorEnriched = TorStatusPayload & {
    torWorkerTotal: number;
    limitedIpTotal: number;
  };

  const [data, setData] = useState<TorEnriched | null>(null);
  const [loading, setLoading] = useState(false);

  const hydrate = useCallback((raw: TorStatusPayload): TorEnriched => {
    const torWorkerTotal =
      raw.workersPerIp?.reduce((acc, row) => {
        const n = typeof row.worker_count === "number" ? row.worker_count : 0;
        return acc + n;
      }, 0) ?? 0;

    const limitedIpTotal = raw.totalBlocked ?? 0;

    return {
      ...raw,
      torWorkerTotal,
      limitedIpTotal,
    };
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await adminMarket.torStatus();
      setData(hydrate(raw));
    } finally {
      setLoading(false);
    }
  }, [hydrate]);

  useEffect(() => {
    let dead = false;

    // initial load with spinner
    (async () => {
      setLoading(true);
      try {
        const raw = await adminMarket.torStatus();
        if (!dead) {
          setData(hydrate(raw));
        }
      } finally {
        if (!dead) setLoading(false);
      }
    })();

    // silent background poll every 30s
    const t = setInterval(() => {
      adminMarket
        .torStatus()
        .then((raw) => {
          if (!dead) setData(hydrate(raw));
        })
        .catch(() => {});
    }, 30000);

    return () => {
      dead = true;
      clearInterval(t);
    };
  }, [hydrate, refetch]);

  return { data, loading, refetch };
}

// ----- Completed Counter -----
export function useCompletedCounter() {
  const [data, setData] = useState<CompletedCounterResult | null>(null);

  useEffect(() => {
    let dead = false;
    const run = () =>
      adminMarket
        .completedCounter()
        .then((r) => {
          if (!dead) setData(r);
        })
        .catch(() => {});
    run();

    const t = setInterval(run, 30000);

    return () => {
      dead = true;
      clearInterval(t);
    };
  }, []);

  return data;
}
