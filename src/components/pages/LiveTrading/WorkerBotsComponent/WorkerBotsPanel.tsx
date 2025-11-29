// src/components/pages/LiveTrading/WorkerBotsComponent/WorkerBotsPanel.tsx

import React, { useEffect, useState } from "react";
import styles from "./WorkerBotsPanel.module.css";

import type { WorkerSummaryDto, WorkerMode } from "./workerBots.logic";
import {
  fetchWorkers,
  resetWorkerDaily,
  setWorkerDailyCapital,
  updateWorkerActive,
  updateWorkerMode,
} from "./workerBots.logic";

interface WorkerBotsPanelProps {
  autoRefreshMs?: number | null;
}

type RowBusy = {
  [workerId: number]: boolean;
};

export const WorkerBotsPanel: React.FC<WorkerBotsPanelProps> = ({
  autoRefreshMs = 20_000,
}) => {
  const [workers, setWorkers] = useState<WorkerSummaryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<RowBusy>({});
  const [capitalInputs, setCapitalInputs] = useState<Record<number, string>>(
    {},
  );

  async function load() {
    try {
      setLoading(true);
      setError(null);
      // Only workers with isActive = 1 are returned.
      const data = await fetchWorkers();
      setWorkers(data);

      // keep existing capitalInputs where possible
      setCapitalInputs((prev) => {
        const next: Record<number, string> = {};
        for (const w of data) {
          next[w.id] =
            prev[w.id] ??
            (Number.isFinite(w.initialCapital)
              ? String(w.initialCapital)
              : "");
        }
        return next;
      });
    } catch (err) {
      console.error(err);
      setError((err as Error).message ?? "Failed to load workers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!autoRefreshMs || autoRefreshMs <= 0) return;
    const id = window.setInterval(() => {
      void load();
    }, autoRefreshMs);
    return () => window.clearInterval(id);
  }, [autoRefreshMs]);

  function setBusy(workerId: number, busy: boolean) {
    setRowBusy((prev) => ({ ...prev, [workerId]: busy }));
  }

  async function handleModeChange(worker: WorkerSummaryDto, mode: WorkerMode) {
    try {
      setBusy(worker.id, true);
      await updateWorkerMode(worker.id, mode);
      await load();
    } catch (err) {
      console.error(err);
      setError(
        (err as Error).message ?? "Failed to update worker mode.",
      );
    } finally {
      setBusy(worker.id, false);
    }
  }

  async function handleToggleActive(worker: WorkerSummaryDto) {
    // isTradingPaused = true → trading is paused
    const tradingActive =
      worker.isTradingPaused === undefined ? true : !worker.isTradingPaused;

    try {
      setBusy(worker.id, true);
      // Backend interprets isActive=true as "trading active".
      await updateWorkerActive(worker.id, !tradingActive);
      await load();
    } catch (err) {
      console.error(err);
      setError(
        (err as Error).message ??
          "Failed to update worker active flag.",
      );
    } finally {
      setBusy(worker.id, false);
    }
  }

  async function handleSetCapital(worker: WorkerSummaryDto) {
    const raw = capitalInputs[worker.id];
    const val = parseFloat(raw);
    if (!Number.isFinite(val) || val <= 0) {
      setError("Daily capital must be a positive number.");
      return;
    }
    try {
      setBusy(worker.id, true);
      await setWorkerDailyCapital(worker.id, val);
      await load();
    } catch (err) {
      console.error(err);
      setError(
        (err as Error).message ?? "Failed to set daily capital.",
      );
    } finally {
      setBusy(worker.id, false);
    }
  }

  async function handleResetDaily(worker: WorkerSummaryDto) {
    const raw = capitalInputs[worker.id];
    const val = parseFloat(raw);
    const payload =
      Number.isFinite(val) && val > 0
        ? {
            newDailyCapital: val,
            resetNote: "Daily reset via UI",
          }
        : {
            resetNote: "Daily reset via UI (capital unchanged)",
          };

    try {
      setBusy(worker.id, true);
      await resetWorkerDaily(worker.id, payload);
      await load();
    } catch (err) {
      console.error(err);
      setError(
        (err as Error).message ?? "Failed to reset worker daily.",
      );
    } finally {
      setBusy(worker.id, false);
    }
  }

  function formatPnL(worker: WorkerSummaryDto): string {
    if (
      worker.latestEquity == null ||
      worker.latestEquity === 0 ||
      worker.initialCapital == null
    ) {
      return "—";
    }
    const pnl = worker.latestEquity - worker.initialCapital;
    return pnl.toFixed(2);
  }

  function pnlClass(worker: WorkerSummaryDto): string {
    const pnlStr = formatPnL(worker);
    const pnl = parseFloat(pnlStr);
    if (!Number.isFinite(pnl) || pnl === 0) return "";
    return pnl > 0 ? styles.pos : styles.neg;
  }

  const visibleWorkers = workers.filter((w) => w.isActive);

  return (
    <section className={styles.card}>
      <header className={styles.cardHeader}>
        <div>
          <h2 className={styles.title}>Worker Bots</h2>
          <p className={styles.subtitle}>
            Configure LIVE / PAPER, pause bots, and assign daily trading
            capital.
          </p>
        </div>
        <div className={styles.controlsRow}>
          <button
            className={`${styles.btn} ${styles.btnSm}`}
            disabled={loading}
            onClick={() => void load()}
          >
            🔄 Refresh
          </button>
        </div>
      </header>

      {loading && <p className={styles.small}>Loading workers…</p>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Worker</th>
              <th>Mode</th>
              <th>Status</th>
              <th>Daily capital</th>
              <th>Latest equity / cash</th>
              <th>PnL vs daily</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleWorkers.map((w) => {
              const busy = !!rowBusy[w.id];
              const capitalVal = capitalInputs[w.id] ?? "";
              const isLive = w.mode === "LIVE";
              const tradingActive =
                w.isTradingPaused === undefined ? true : !w.isTradingPaused;

              return (
                <tr key={w.id}>
<td>
  <div className={styles.small}>
    <span className={styles.mono}>{w.name}</span>
  </div>
  <div className={styles.small}>
    Strategy:{" "}
    <span className={styles.mono}>{w.strategyName}</span>
  </div>

  {w.successRatePct != null &&
    w.tradesSampleCount != null &&
    w.tradesSampleCount > 0 && (
      <div className={styles.small}>
        Win rate (virtual):{" "}
        <span className={styles.mono}>
          {w.successRatePct.toFixed(1)}% ({w.tradesSampleCount} trades)
        </span>
      </div>
    )}
</td>

                  <td>
                    <div className={styles.small}>
                      <span
                        className={`${styles.badgeSoft} ${
                          isLive ? styles.modeLive : styles.modePaper
                        }`}
                      >
                        {w.mode}
                      </span>
                    </div>
                    <div className={styles.controlsRow}>
                      <button
                        className={`${styles.btn} ${styles.btnSm}`}
                        disabled={busy || isLive}
                        onClick={() => void handleModeChange(w, "LIVE")}
                      >
                        Go LIVE
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnSm}`}
                        disabled={busy || !isLive}
                        onClick={() => void handleModeChange(w, "PAPER")}
                      >
                        Paper
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className={styles.small}>
                      <span
                        className={`${styles.statusDot} ${
                          tradingActive
                            ? styles.statusActive
                            : styles.statusInactive
                        }`}
                      />
                      {tradingActive ? "Active" : "Paused"}
                    </div>
                    <div className={styles.controlsRow}>
                      <button
                        className={`${styles.btn} ${styles.btnSm}`}
                        disabled={busy}
                        onClick={() => void handleToggleActive(w)}
                      >
                        {tradingActive ? "Pause" : "Unpause"}
                      </button>
                    </div>
                  </td>
                  <td>
                    <input
                      className={styles.inputSm}
                      type="number"
                      value={capitalVal}
                      onChange={(e) =>
                        setCapitalInputs((prev) => ({
                          ...prev,
                          [w.id]: e.target.value,
                        }))
                      }
                      placeholder={String(w.initialCapital ?? "")}
                    />
                    <div className={styles.controlsRow}>
                      <button
                        className={`${styles.btn} ${styles.btnSm}`}
                        disabled={busy}
                        onClick={() => void handleSetCapital(w)}
                      >
                        Set
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className={styles.small}>
                      Equity:{" "}
                      {w.latestEquity != null ? (
                        <span className={styles.mono}>
                          {w.latestEquity.toFixed(2)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </div>
                    <div className={styles.small}>
                      Cash:{" "}
                      {w.latestCash != null ? (
                        <span className={styles.mono}>
                          {w.latestCash.toFixed(2)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </div>
                  </td>
                  <td className={pnlClass(w)}>
                    <span className={styles.mono}>{formatPnL(w)}</span>
                  </td>
                  <td>
                    <div className={styles.controlsRow}>
                      <button
                        className={`${styles.btn} ${styles.btnSm}`}
                        disabled={busy}
                        onClick={() => void handleResetDaily(w)}
                      >
                        Reset day
                      </button>
                    </div>
                    <div className={styles.small}>
                      Latest stats:{" "}
                      {w.latestStatsAtUtc
                        ? new Date(
                            w.latestStatsAtUtc,
                          ).toLocaleTimeString()
                        : "—"}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && visibleWorkers.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <span className={styles.small}>
                    No active workers configured yet. Once your Python
                    engine creates rows in <code>workers</code> with{" "}
                    <code>is_active = 1</code>, they’ll show up here.
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}
    </section>
  );
};

export default WorkerBotsPanel;
