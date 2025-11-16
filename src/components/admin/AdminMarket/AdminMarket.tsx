import React, { useState } from "react";
import styles from "./AdminMarket.module.css";
import Navbar from "@/components/navbar/Navbar";
import { adminMarket } from "@/controllers/adminMarket";

import {
  useEtlOverview,
  useTopCounts,
  useKeyInventory,
  useBlockedKeys,
  useFairness,
  useJobsWorkers,
  usePrices,
  useAlerts,
  useCleanerOverview,
  useCleanerCapacity,
  useMiningStats,
  useTorStatus,
  useCompletedCounter,
} from "./adminMarket.logic";
import WatchdogPanel from "./WatchdogPanel";

export default function AdminMarket() {
  // Core ETL / infra hooks
  const { data, loading, err } = useEtlOverview();
  const counts = useTopCounts();
  const inventory = useKeyInventory();
  const blocked = useBlockedKeys();
  const fairness = useFairness();
  const { jobs, workers } = useJobsWorkers();
  const priceFresh = usePrices();
  const alerts = useAlerts();

  // Cleaner / pipeline / infra hooks
  const cleaner = useCleanerOverview(); // {queueDepth, throughput, successRate, attempts}
  const cleanerCap = useCleanerCapacity(); // {config, capacity}
  const {
    data: mining,
    loading: miningLoading,
    refetch: refetchMining,
  } = useMiningStats(); // mined %, clean %
  const {
    data: tor,
    loading: torLoading,
    refetch: refetchTor,
  } = useTorStatus(); // tor exit/ip and block info (+ derived totals)
  const completed = useCompletedCounter(); // completed_count

  // Pin and highlight NVDA
  const nvda = counts.find((c) => c.symbol === "NVDA");

  // --- Maintenance actions UI state ---
  const [cleanseBusy, setCleanseBusy] = useState(false);
  const [cleanseErr, setCleanseErr] = useState<string | null>(null);
  const [cleanseResult, setCleanseResult] = useState<any | null>(null);

  const [showOpsSql, setShowOpsSql] = useState(false);

  async function runDeadWorkerCleanse() {
    setCleanseBusy(true);
    setCleanseErr(null);
    try {
      const res = await adminMarket.deadWorkerCleanse();
      setCleanseResult(res);
    } catch (e: any) {
      setCleanseErr(e?.message ?? "cleanse failed");
    } finally {
      setCleanseBusy(false);
    }
  }

  // --- TOR clear list (delete from tor_rate_limited_ips) ---
  const [torClearBusy, setTorClearBusy] = useState(false);
  const [torClearErr, setTorClearErr] = useState<string | null>(null);
  const [torClearOk, setTorClearOk] = useState(false);

  async function runTorClear() {
    setTorClearBusy(true);
    setTorClearErr(null);
    setTorClearOk(false);
    try {
      await adminMarket.torClearRateLimited();
      setTorClearOk(true);
      // after nuking, immediately refetch fresh TOR status snapshot
      await refetchTor();
    } catch (e: any) {
      setTorClearErr(e?.message ?? "clear failed");
    } finally {
      setTorClearBusy(false);
    }
  }

  // preformatted SQL ops text (for transparency / debugging)
  const opsSqlText = `
-- ---- Tunables ----
SET @grace_minutes := 1;   -- heartbeat staleness window (minutes)
SET @now := UTC_TIMESTAMP();
SET @clear_tor   := 1;      -- 1=also clear Tor claims for dead workers
SET @clear_proxy := 1;      -- 1=also clear proxy claims for dead workers
SET @clear_gdelt_hold := 0; -- 1=also clear global GDELT ratelimit holds

-- Fresh live workers (recent heartbeat within grace window)
DROP TEMPORARY TABLE IF EXISTS live_workers;
CREATE TEMPORARY TABLE live_workers AS
SELECT w.worker_id
FROM worker_heartbeats w
WHERE w.heartbeat_at >= @now - INTERVAL @grace_minutes MINUTE;

-- Any worker IDs that look stale in heartbeats
DROP TEMPORARY TABLE IF EXISTS stale_heartbeat_workers;
CREATE TEMPORARY TABLE stale_heartbeat_workers AS
SELECT w.worker_id
FROM worker_heartbeats w
WHERE w.heartbeat_at IS NULL
   OR w.heartbeat_at < @now - INTERVAL @grace_minutes MINUTE;

-- Workers seen in tor_workers but stale
DROP TEMPORARY TABLE IF EXISTS stale_tor_workers;
CREATE TEMPORARY TABLE stale_tor_workers AS
SELECT t.worker_id
FROM tor_workers t
WHERE t.updated_at < @now - INTERVAL @grace_minutes MINUTE;

-- Workers currently referenced by jobs but NOT live
DROP TEMPORARY TABLE IF EXISTS orphan_job_assignees;
CREATE TEMPORARY TABLE orphan_job_assignees AS
SELECT DISTINCT kj.assigned_to AS worker_id
FROM keyword_jobs kj
LEFT JOIN live_workers lw ON lw.worker_id = kj.assigned_to
WHERE kj.assigned_to IS NOT NULL
  AND lw.worker_id IS NULL;

-- Union set = dead/orphaned worker IDs
DROP TEMPORARY TABLE IF EXISTS dead_workers;
CREATE TEMPORARY TABLE dead_workers AS
SELECT worker_id FROM stale_heartbeat_workers
UNION
SELECT worker_id FROM stale_tor_workers
UNION
SELECT worker_id FROM orphan_job_assignees;

-- For safety: inspect what will be treated as dead
SELECT 'DEAD_WORKERS' AS what, COUNT(*) AS cnt FROM dead_workers;

START TRANSACTION;

-- 1) Release 'currently-claimed' held by dead workers OR where lease expired/stale
UPDATE keyword_jobs kj
JOIN (
  SELECT id
  FROM keyword_jobs
  WHERE status='currently-claimed'
    AND (
         assigned_to IN (SELECT worker_id FROM dead_workers)
      OR lease_expires_at IS NULL
      OR lease_expires_at <= @now
      OR last_progress_at IS NULL
      OR last_progress_at < @now - INTERVAL @grace_minutes MINUTE
    )
) x ON x.id = kj.id
SET kj.status='searching-undone',
    kj.assigned_to=NULL,
    kj.lease_expires_at=NULL
WHERE kj.status='currently-claimed'
  AND kj.status <> 'completed';

-- 2) Free 'searching-undone' that are pinned to dead workers (so anyone can reclaim)
UPDATE keyword_jobs
SET assigned_to=NULL
WHERE status='searching-undone'
  AND assigned_to IN (SELECT worker_id FROM dead_workers);

-- 3) (Sanity) Clear any leftover assignees on non-completed rows with ancient progress
UPDATE keyword_jobs
SET assigned_to=NULL
WHERE status <> 'completed'
  AND assigned_to IS NOT NULL
  AND (last_progress_at IS NULL OR last_progress_at < @now - INTERVAL @grace_minutes MINUTE);

-- 4) job_progress: clear leases/owners for dead workers or expired leases
UPDATE job_progress
SET assigned_to=NULL,
    lease_expires_at=NULL,
    status = CASE WHEN status='running' THEN 'pending' ELSE status END
WHERE (assigned_to IN (SELECT worker_id FROM dead_workers))
   OR (lease_expires_at IS NOT NULL AND lease_expires_at <= @now);

COMMIT;

-- 5) Optional: clean Tor claims for dead workers or expired claims
SET @dummy := IF(@clear_tor=1, 1, 0);
DELETE FROM tor_ip_claims
WHERE (@clear_tor=1) AND (worker_id IN (SELECT worker_id FROM dead_workers) OR expires_at <= @now);

DELETE FROM tor_workers
WHERE (@clear_tor=1) AND updated_at < @now - INTERVAL @grace_minutes MINUTE;

-- 6) Optional: clean proxy claims
SET @dummy := IF(@clear_proxy=1, 1, 0);
DELETE FROM proxy_claims
WHERE (@clear_proxy=1) AND (worker_id IN (SELECT worker_id FROM dead_workers) OR expires_at <= @now);

UPDATE workers
SET proxy_id=NULL, updated_at=@now
WHERE (@clear_proxy=1) AND worker_id IN (SELECT worker_id FROM dead_workers);

-- 7) Optional: clear global GDELT hold
DELETE FROM etl_checkpoints
WHERE (@clear_gdelt_hold=1) AND etl_key LIKE 'ratelimit:gdelt:%';

-- 8) Cleanup old heartbeats
DELETE FROM worker_heartbeats
WHERE heartbeat_at < @now - INTERVAL (2 * @grace_minutes) MINUTE;

-- 9) Snapshot after
SELECT
  SUM(status='unsearched') AS unsearched,
  SUM(status='searching-undone') AS searching_undone,
  SUM(status='currently-claimed') AS currently_claimed,
  SUM(status='completed') AS completed
FROM keyword_jobs;

SELECT id, keyword, status, priority, assigned_to, last_progress_at, lease_expires_at
FROM keyword_jobs
WHERE status='unsearched'
   OR (status='searching-undone' AND assigned_to IS NULL)
ORDER BY priority DESC, COALESCE(last_progress_at, created_at) ASC, id ASC
LIMIT 50;

SELECT kj.id, kj.keyword, kj.status, jp.message AS gdelt_progress, kj.assigned_to, kj.last_progress_at
FROM keyword_jobs kj
LEFT JOIN job_progress jp
  ON jp.job_id = kj.id AND jp.source = 'gdelt'
ORDER BY kj.priority DESC, kj.created_at DESC
LIMIT 50;

-- Full TOR reset (run with all workers stopped)
DELETE FROM tor_workers;
DELETE FROM tor_ip_claims;
DELETE FROM tor_rate_limited_ips;
DELETE FROM etl_checkpoints
WHERE etl_key LIKE 'tor:exit_ip:%';
DELETE FROM tor_rate_limited_ips;

-- TOR observability
SELECT COUNT(*) FROM tor_rate_limited_ips;
SELECT * FROM tor_rate_limited_ips;
SELECT
    tw.exit_ip,
    COUNT(*) AS worker_count,
    GROUP_CONCAT(tw.worker_id ORDER BY tw.worker_id) AS workers
FROM tor_workers tw
WHERE tw.exit_ip IS NOT NULL
GROUP BY tw.exit_ip
ORDER BY worker_count DESC, tw.exit_ip;
`.trim();

  return (
    <div className={styles.root}>
      <Navbar overlay brand="medenijazbec.pro" />
      <main className={styles.main}>
        {/* Top KPIs */}
        <div
          className={styles.card}
          style={{ gridColumn: "1 / -1", marginBottom: 12 }}
        >
          <h3>ETL Overview</h3>
          {loading && <div>Loading…</div>}
          {err && <div style={{ color: "#ff9a9a" }}>Error: {err}</div>}
          {data && (
            <div className={styles.kpi}>
              <span className={styles.pill}>
                Companies: <b>{data.companies}</b>
              </span>
              <span className={styles.pill}>
                Articles (GDELT): <b>{data.articlesGdelt}</b>
              </span>
              <span className={styles.pill}>
                Articles (Ext): <b>{data.articlesExt}</b>
              </span>
              <span className={styles.pill}>
                Requests total: <b>{data.requestsTotal}</b>
              </span>
              <span className={styles.pill}>
                Jobs: <b>{data.jobs}</b>
              </span>
              <span className={styles.pill}>
                OK rate 24h:{" "}
                <b>{Math.round((data.okRate24h ?? 0) * 100)}%</b>
              </span>

              {/* NVDA KPI */}
              <span
                className={styles.pill}
                title="Total articles mapped to NVDA"
              >
                NVDA Articles: <b>{nvda?.total ?? 0}</b>
              </span>

              {/* Completed counter */}
              <span
                className={styles.pill}
                title="Completed or done keyword jobs"
              >
                Completed jobs:{" "}
                <b>{completed ? completed.completed_count : "—"}</b>
              </span>
            </div>
          )}
        </div>

        {/* Alerts */}
        <section className={styles.card} style={{ gridColumn: "1 / -1" }}>
          <h3>Alerts</h3>
          {!alerts ? (
            <div>—</div>
          ) : (
            <div className={styles.alerts}>
              <div>
                <b>No free keys:</b>{" "}
                {alerts.noFreeSources.length
                  ? alerts.noFreeSources.join(", ")
                  : "—"}
              </div>

              <div>
                <b>Rising 429 (1h):</b>{" "}
                {alerts.hot429.length ? (
                  <ul className={styles.ul}>
                    {alerts.hot429.map((a) => (
                      <li key={a.source}>
                        {a.source}: {a.s429}/{a.total} ({a.pct}%)
                      </li>
                    ))}
                  </ul>
                ) : (
                  "—"
                )}
              </div>

              <div>
                <b>Hammering during cooldown:</b>{" "}
                {alerts.hammering.length ? alerts.hammering.length : "—"}
              </div>
            </div>
          )}
        </section>

        <section style={{ marginBottom: 12 }} />

 {/* Watchdog – DB health (App / NvdaAlpha / Trading 3313) */}
        <WatchdogPanel />

        <section style={{ marginBottom: 12 }} />


        {/* Maintenance / Recovery panel */}
        <section
          className={styles.card}
          style={{
            gridColumn: "1 / -1",
            marginBottom: 12,
            background:
              "linear-gradient(to right, rgba(7,26,20,0.85), rgba(25,41,35,0.6))",
          }}
        >
          <h3>Maintenance / Recovery</h3>

          <div className={styles.maintRow}>
            <button
              className={styles.btn}
              disabled={cleanseBusy}
              onClick={runDeadWorkerCleanse}
              title="Run the DB-side cleanup that releases stuck jobs, clears leases, frees tor/proxy claims, etc."
            >
              {cleanseBusy ? "Running…" : "Run Dead Worker Cleanse"}
            </button>

            <button
              className={styles.btnGhost}
              onClick={() => setShowOpsSql((v) => !v)}
              title="Show the raw SQL / operational recipe used for full recovery & tor/proxy reset"
            >
              {showOpsSql ? "Hide Ops SQL" : "Show Ops SQL"}
            </button>
          </div>

          {cleanseErr && (
            <div className={styles.errorBox}>
              <b>Cleanse error:</b> {cleanseErr}
            </div>
          )}

          {cleanseResult && (
            <div className={styles.resultBox}>
              <div className={styles.subhead}>Dead Worker Cleanse Result</div>
              <pre className={styles.pre}>
                {JSON.stringify(cleanseResult, null, 2)}
              </pre>
            </div>
          )}

          {showOpsSql && (
            <details open className={styles.sqlBox}>
              <summary className={styles.subhead}>
                Full ops SQL / tor-reset recipe
              </summary>
              <pre className={styles.pre}>{opsSqlText}</pre>
            </details>
          )}
        </section>

        {/* GRID #1: Keys / Articles / Jobs / Prices */}
        <div className={styles.grid}>
          {/* Inventory by source */}
          <section className={styles.card} style={{ gridColumn: "span 6" }}>
            <div className={styles.cardHeaderRow}>
              <h3>Key Inventory (by source)</h3>
            </div>
            {!inventory.length ? (
              <div>—</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Total</th>
                    <th>Active</th>
                    <th>Free</th>
                    <th>Blocked</th>
                    <th>Inactive</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((r) => (
                    <tr key={r.source}>
                      <td>{r.source}</td>
                      <td>{r.total}</td>
                      <td>{r.active}</td>
                      <td>{r.free}</td>
                      <td>{r.blocked}</td>
                      <td>{r.inactive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Blocked keys with ETA */}
          <section className={styles.card} style={{ gridColumn: "span 6" }}>
            <div className={styles.cardHeaderRow}>
              <h3>Blocked Keys (ETA)</h3>
            </div>
            {!blocked.length ? (
              <div>—</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Label</th>
                    <th>Minutes left</th>
                    <th>Until (UTC)</th>
                  </tr>
                </thead>
                <tbody>
                  {blocked.map((b) => (
                    <tr key={b.id}>
                      <td>{b.source}</td>
                      <td>{b.accountLabel || "—"}</td>
                      <td>{b.minutesRemaining}</td>
                      <td className={styles.meta}>
                        {new Date(b.exhaustedUntil).toISOString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Fairness */}
          <section className={styles.card} style={{ gridColumn: "span 6" }}>
            <div className={styles.cardHeaderRow}>
              <h3>Rotation Fairness (24h)</h3>
            </div>
            {!fairness.length ? (
              <div>—</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Busiest Key</th>
                    <th>Share</th>
                    <th>Total Reqs</th>
                  </tr>
                </thead>
                <tbody>
                  {fairness.map((f) => (
                    <tr key={f.source}>
                      <td>{f.source}</td>
                      <td>{f.busiestLabel || `#${f.busiestAccountId}`}</td>
                      <td>{f.busiestPct}%</td>
                      <td>{f.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Article counts by symbol */}
          <section className={styles.card} style={{ gridColumn: "span 6" }}>
            <div className={styles.cardHeaderRow}>
              <h3>Article counts by symbol</h3>
            </div>
            {!counts.length ? (
              <div>—</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Total Articles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {counts.map((r) => (
                      <tr
                        key={r.symbol}
                        className={
                          r.symbol === "NVDA" ? styles.highlightRow : undefined
                        }
                      >
                        <td>{r.symbol}</td>
                        <td>{r.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Jobs & Workers */}
          <section className={styles.card} style={{ gridColumn: "span 6" }}>
            <div className={styles.cardHeaderRow}>
              <h3>Jobs & Workers</h3>
            </div>
            <div className={styles.split}>
              <div>
                <div className={styles.subhead}>Jobs by status</div>
                {!jobs.length ? (
                  <div>—</div>
                ) : (
                  <table className={styles.tableSm}>
                    <tbody>
                      {jobs.map((j) => (
                        <tr key={j.status}>
                          <td>{j.status}</td>
                          <td>{j.c}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div>
                <div className={styles.subhead}>Workers</div>
                {!workers ? (
                  <div>—</div>
                ) : (
                  <div className={styles.meta}>
                    Active: <b>{workers.active.length}</b> • Stale:{" "}
                    <b>{workers.stale.length}</b> • Total:{" "}
                    <b>{workers.total}</b>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Price freshness */}
          <section className={styles.card} style={{ gridColumn: "span 6" }}>
            <div className={styles.cardHeaderRow}>
              <h3>Prices – Latest Close</h3>
            </div>
            {!priceFresh.length ? (
              <div>—</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Latest date</th>
                    <th>Days since</th>
                  </tr>
                </thead>
                <tbody>
                  {priceFresh.map((p) => (
                    <tr key={p.symbol}>
                      <td>{p.symbol}</td>
                      <td className={styles.meta}>
                        {p.latest
                          ? new Date(p.latest).toISOString().slice(0, 10)
                          : "—"}
                      </td>
                      <td>{p.daysSince ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Cleaner – Queue / Throughput */}
          <section className={styles.card} style={{ gridColumn: "span 6" }}>
            <div className={styles.cardHeaderRow}>
              <h3>Cleaner – Queue / Throughput</h3>
            </div>
            {!cleaner ? (
              <div>—</div>
            ) : (
              <div className={styles.split}>
                <div>
                  <div className={styles.subhead}>Queue Depth</div>
                  <table className={styles.tableSm}>
                    <tbody>
                      <tr>
                        <td>queued</td>
                        <td>{cleaner.queueDepth.queued}</td>
                      </tr>
                      <tr>
                        <td>cleaning</td>
                        <td>{cleaner.queueDepth.cleaning}</td>
                      </tr>
                      <tr>
                        <td>error</td>
                        <td>{cleaner.queueDepth.error}</td>
                      </tr>
                      <tr>
                        <td>done</td>
                        <td>{cleaner.queueDepth.done}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <div className={styles.subhead}>Throughput</div>
                  <div className={styles.meta}>
                    1h: <b>{cleaner.throughput.jobsDoneLastHour}</b> • 24h:{" "}
                    <b>{cleaner.throughput.jobsDoneLast24h}</b>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Cleaner – Quality */}
          <section className={styles.card} style={{ gridColumn: "span 6" }}>
            <div className={styles.cardHeaderRow}>
              <h3>Cleaner – Quality</h3>
            </div>
            {!cleaner ? (
              <div>—</div>
            ) : (
              <div className={styles.split}>
                <div>
                  <div className={styles.subhead}>Success Rate (1h)</div>
                  <table className={styles.tableSm}>
                    <tbody>
                      <tr>
                        <td>OK</td>
                        <td>{cleaner.successRate.ok}</td>
                      </tr>
                      <tr>
                        <td>BAD</td>
                        <td>{cleaner.successRate.bad}</td>
                      </tr>
                      <tr>
                        <td>Success %</td>
                        <td>{cleaner.successRate.successRatePct}%</td>
                      </tr>
                      <tr>
                        <td>Error %</td>
                        <td>{cleaner.successRate.errorRatePct}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <div className={styles.subhead}>Attempts</div>
                  <table className={styles.tableSm}>
                    <tbody>
                      <tr>
                        <td>Avg attempts</td>
                        <td>{cleaner.attempts.avgAttempts}</td>
                      </tr>
                      <tr>
                        <td>Max attempts</td>
                        <td>{cleaner.attempts.maxAttempts}</td>
                      </tr>
                      <tr>
                        <td>Total jobs</td>
                        <td>{cleaner.attempts.totalJobs}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Cleaner – Capacity */}
          <section className={styles.card} style={{ gridColumn: "span 6" }}>
            <div className={styles.cardHeaderRow}>
              <h3>Cleaner – Capacity</h3>
            </div>
            {!cleanerCap ? (
              <div>—</div>
            ) : (
              <>
                <div className={styles.subhead}>Containers / Workers</div>
                <div className={styles.meta}>
                  Containers observed:{" "}
                  <b>{cleanerCap.capacity.containersObserved}</b> • Expected
                  workers: <b>{cleanerCap.capacity.expectedWorkers}</b>
                  <br />
                  Active workers (10m):{" "}
                  <b>{cleanerCap.capacity.activeRecently}</b> /{" "}
                  {cleanerCap.capacity.totalWorkersObserved}
                </div>

                <div className={styles.subhead} style={{ marginTop: 8 }}>
                  Defaults
                </div>
                <table className={styles.tableSm}>
                  <tbody>
                    <tr>
                      <td>workers/container</td>
                      <td>
                        {cleanerCap.config.workersPerContainerDefault}
                      </td>
                    </tr>
                    <tr>
                      <td>leaseSeconds</td>
                      <td>{cleanerCap.config.leaseSecondsDefault}</td>
                    </tr>
                    <tr>
                      <td>maxAttempts</td>
                      <td>{cleanerCap.config.maxAttemptsDefault}</td>
                    </tr>
                    <tr>
                      <td>sleepIdleSec</td>
                      <td>
                        {cleanerCap.config.sleepIdleSecondsDefault}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}
          </section>

          {/* Pipeline Health (Mining + TOR) */}
          <section className={styles.card} style={{ gridColumn: "span 6" }}>
            <div className={styles.cardHeaderRow}>
              <h3>Pipeline Health</h3>
              <button
                className={styles.btnSmall}
                onClick={() => {
                  // fire both, don't await
                  refetchMining();
                  refetchTor();
                }}
                title="Force refresh mining+TOR stats from backend"
              >
                Refresh
              </button>

            </div>
            {!mining || !tor ? (
              <div>—</div>
            ) : (
              <div className={styles.statGrid}>
                {/* Mining stats */}
                {mining ? (
                  <>
                    <div className={styles.statBlock}>
                      <div className={styles.statLabel}>Articles total</div>
                      <div className={styles.mono}>
                        <b>{mining.total_articles}</b>
                      </div>
                    </div>

                    <div className={styles.statBlock}>
                      <div className={styles.statLabel}>Mined bodies</div>
                      <div className={styles.mono}>
                        <b>{mining.mined_articles}</b> ({mining.mined_pct}%)
                      </div>
                    </div>

                    <div className={styles.statBlock}>
                      <div className={styles.statLabel}>Clean text</div>
                      <div className={styles.mono}>
                        <b>{mining.clean_articles}</b> ({mining.clean_pct}%)
                      </div>
                    </div>
                  </>
                ) : (
                  <div className={styles.statBlock}>
                    <div className={styles.statLabel}>Mining stats</div>
                    <div className={styles.mono}>
                      <b>— loading —</b>
                    </div>
                  </div>
                )}

                {/* TOR stats */}
                {tor ? (
                  <>
                    <div className={styles.statBlock}>
                      <div className={styles.statLabel}>TOR workers</div>
                      <div className={styles.mono}>
                        <b>{tor.torWorkerTotal}</b>
                      </div>
                    </div>

                    <div className={styles.statBlock}>
                      <div className={styles.statLabel}>Rate-limited IPs</div>
                      <div className={styles.mono}>
                        <b>{tor.limitedIpTotal}</b>
                      </div>
                    </div>

                    {tor.workersPerIp && tor.workersPerIp.length > 0 && (
                      <div className={styles.statBlock}>
                        <div className={styles.statLabel}>Most loaded exit IP</div>
                        <div className={styles.mono}>
                          <b>{tor.workersPerIp[0].exit_ip}</b> •{" "}
                          {tor.workersPerIp[0].worker_count} workers
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className={styles.statBlock}>
                    <div className={styles.statLabel}>TOR stats</div>
                    <div className={styles.mono}>
                      <b>— loading —</b>
                    </div>
                  </div>
                )}
              </div>

            )}
          </section>

          {/* TOR – Rate Limited IPs */}
          <section className={styles.card} style={{ gridColumn: "span 6" }}>
            <div className={styles.cardHeaderRow}>
              <h3>TOR – Rate Limited IPs</h3>
              <div style={{ display: "flex", gap: 8 }}>
              <button
                className={styles.btnSmall}
                onClick={refetchTor}
                title="Force refresh TOR status"
              >
                Refresh
              </button>

                <button
                  className={styles.btnSmall}
                  disabled={torClearBusy}
                  onClick={runTorClear}
                  title="DELETE FROM tor_rate_limited_ips"
                >
                  {torClearBusy ? "Clearing…" : "Clear list"}
                </button>
              </div>
            </div>

            {!tor ? (
              <div>—</div>
            ) : (
              <>
                {torClearErr && (
                  <div className={styles.errorBox}>
                    <b>TOR clear error:</b> {torClearErr}
                  </div>
                )}
                {torClearOk && (
                  <div className={styles.resultBox}>
                    <div className={styles.subhead}>
                      Cleared tor_rate_limited_ips
                    </div>
                    <div className={styles.meta}>
                      List cleared. Snapshot below is fresh.
                    </div>
                  </div>
                )}

                {!tor.blockedIps.length ? (
                  <div className={styles.meta}>No rows</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>IP</th>
                          <th>Hits</th>
                          <th>Until (UTC)</th>
                          <th>Reason</th>
                          <th>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tor.blockedIps.map((row, idx) => (
                          <tr key={row.ip ?? idx}>
                            <td>{row.ip ?? "—"}</td>
                            <td>{row.hits}</td>
                            <td className={styles.meta}>
                              {row.until
                                ? new Date(row.until).toISOString()
                                : "—"}
                            </td>
                            <td>{row.reason ?? "—"}</td>
                            <td>{row.source ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
