import React from "react";
import styles from "./WatchdogPanel.module.css";
import { useWatchdogOverview, useWatchdogCleanup } from "./watchdog.logic";
import type {
  DbHealth,
  WatchdogCleanupStats,
} from "@/controllers/adminMarket";

function DbCard({ label, health }: { label: string; health: DbHealth }) {
  const statusClass = health.ok ? styles.statusBadgeOk : styles.statusBadgeBad;
  const statusText = health.ok ? "OK" : "FAIL";

  const dbTime =
    health.dbUtcNow != null ? new Date(health.dbUtcNow).toISOString() : "—";

  return (
    <div className={styles.dbCard}>
      <div className={styles.dbName}>{label}</div>
      <div className={styles.statusRow}>
        <span className={styles.smallLabel}>Status</span>
        <span className={statusClass}>{statusText}</span>
      </div>
      <div className={styles.statusRow}>
        <span className={styles.smallLabel}>Latency</span>
        <span className={styles.smallValue}>{health.latencyMs} ms</span>
      </div>
      <div className={styles.statusRow}>
        <span className={styles.smallLabel}>DB UTC</span>
        <span className={styles.smallValue}>{dbTime}</span>
      </div>
      {health.error && (
        <div className={styles.errorText}>{health.error}</div>
      )}
    </div>
  );
}

function formatIsoOrDash(value?: string | null) {
  return value ? new Date(value).toISOString() : "—";
}

function CleanupTable({ stats }: { stats: WatchdogCleanupStats }) {
  const rows = [
    {
      label: "HTTP articles",
      total: stats.httpArticlesDeletedSum,
      last: stats.lastHttpArticlesDeleted ?? 0,
    },
    {
      label: "HTTPS articles",
      total: stats.httpsArticlesDeletedSum,
      last: stats.lastHttpsArticlesDeleted ?? 0,
    },
    {
      label: "Status 404",
      total: stats.status404DeletedSum,
      last: stats.lastStatus404Deleted ?? 0,
    },
    {
      label: "Status 410",
      total: stats.status410DeletedSum,
      last: stats.lastStatus410Deleted ?? 0,
    },
    {
      label: "Bad link articles",
      total: stats.badLinkArticlesDeletedSum,
      last: stats.lastBadLinkArticlesDeleted ?? 0,
    },
    {
      label: "ml_articles rows",
      total: stats.mlArticlesDeletedSum,
      last: stats.lastMlArticlesDeleted ?? 0,
    },
    {
      label: "news_articles rows",
      total: stats.newsArticlesDeletedSum,
      last: stats.lastNewsArticlesDeleted ?? 0,
    },
    {
      label: "ml_page_cache rows",
      total: stats.pageCacheDeletedSum,
      last: stats.lastPageCacheDeleted ?? 0,
    },
    {
      label: "TOTAL rows (all tables)",
      total: stats.totalRowsDeletedSum,
      last: stats.lastTotalRowsDeleted ?? 0,
    },
  ];

  return (
    <table className={styles.cleanupTable}>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Total</th>
          <th>Last run</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <td>{r.label}</td>
            <td>{r.total}</td>
            <td>{r.last}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function WatchdogPanel() {
  const { data, loading, err } = useWatchdogOverview();
  const {
    data: cleanup,
    loading: cleanupLoading,
    err: cleanupErr,
  } = useWatchdogCleanup();

  return (
    <section className={styles.card}>
      <div className={styles.headerRow}>
        <h3>Watchdog – DB Health</h3>
        {data && (
          <div className={styles.meta}>
            <div>
              Server UTC:{" "}
              <span className={styles.mono}>
                {new Date(data.serverUtc).toISOString()}
              </span>
            </div>
            <div>
              Uptime: <span className={styles.mono}>{data.uptimeHuman}</span>
            </div>
          </div>
        )}
      </div>

      {loading && !data && <div>Loading…</div>}

      {err && (
        <div className={styles.errorBox}>
          <b>Error:</b> {err}
        </div>
      )}

      {data && (
        <div className={styles.dbGrid}>
          <DbCard label="App DB" health={data.appDb} />
          <DbCard label="NvdaAlpha DB" health={data.alphaDb} />
          <DbCard label="Trading DB (3313)" health={data.tradingDb} />
        </div>
      )}

      {/* Divider */}
      <div className={styles.divider} />

      {/* Cleanup stats from watchdog_cleanup_log */}
      <div className={styles.headerRow}>
        <div>
          <div className={styles.subhead}>Cleanup – watchdog_cleanup_log</div>
          {cleanup && (
            <div className={styles.meta}>
              <div>
                Runs total:{" "}
                <span className={styles.mono}>{cleanup.totalRuns}</span>
              </div>
              <div>
                First run:{" "}
                <span className={styles.mono}>
                  {formatIsoOrDash(cleanup.firstRunStartedAt)}
                </span>
              </div>
              <div>
                Last run finished:{" "}
                <span className={styles.mono}>
                  {formatIsoOrDash(cleanup.lastRunFinishedAt)}
                </span>
              </div>
            </div>
          )}
        </div>
        {cleanupLoading && !cleanup && (
          <div className={styles.smallLabel}>Loading…</div>
        )}
      </div>

      {cleanupErr && (
        <div className={styles.errorBox}>
          <b>Cleanup error:</b> {cleanupErr}
        </div>
      )}

      {cleanup && (
        <div className={styles.cleanupGrid}>
          <div className={styles.summaryBox}>
            <div className={styles.smallLabel}>Last run window</div>
            <div className={styles.meta}>
              Start:{" "}
              <span className={styles.mono}>
                {formatIsoOrDash(cleanup.lastRunStartedAt)}
              </span>
              <br />
              Finish:{" "}
              <span className={styles.mono}>
                {formatIsoOrDash(cleanup.lastRunFinishedAt)}
              </span>
            </div>
          </div>

          <CleanupTable stats={cleanup} />
        </div>
      )}
    </section>
  );
}
