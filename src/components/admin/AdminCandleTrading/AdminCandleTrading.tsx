// path: src/components/admin/AdminCandleTrading/AdminCandleTrading.tsx
import React, { useMemo, useState, useEffect } from "react";
import Navbar from "@/components/navbar/Navbar";
import { useAuth } from "@/components/auth/AuthContext";
import styles from "./AdminCandleTrading.module.css";
import {
  useTradingSettings,
  useWorkersOverview,
  useWorkerEquity,
  useMarketClock,
} from "./adminCandleTrading.logic";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

const HOURS_OPTIONS = [6, 12, 24, 72];

const AdminCandleTrading: React.FC = () => {
  const { isAuthed, isAdmin, email } = useAuth();

  const {
    settings,
    form,
    loading: settingsLoading,
    saving: settingsSaving,
    error: settingsError,
    lastSavedIso,
    updateField,
    save,
    reload: reloadSettings,
  } = useTradingSettings();

  const {
    workers,
    loading: workersLoading,
    error: workersError,
    bestWorker,
  } = useWorkersOverview(10000);

  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [hoursBack, setHoursBack] = useState<number>(24);

  // Prefer the explicitly-selected worker, otherwise fall back to the first worker
  const workerIdForEquity =
    selectedWorkerId ?? (workers.length ? workers[0].id : null);

  const {
    points,
    loading: equityLoading,
    error: equityError,
  } = useWorkerEquity(workerIdForEquity, hoursBack);

  const {
    clock,
    loading: clockLoading,
    error: clockError,
    countdown,
  } = useMarketClock("NYSE", 30000);

  // Set default selected worker when list loads
  useEffect(() => {
    if (!workers.length) return;
    setSelectedWorkerId((prev) => prev ?? workers[0].id);
  }, [workers]);

  const selectedWorker = useMemo(
    () => workers.find((w) => w.id === selectedWorkerId) ?? workers[0],
    [workers, selectedWorkerId]
  );

  // Equity sparkline path (simple inline SVG like AdminShowcase Sparkline)
  const equitySparkPath = useMemo(() => {
    if (!points.length) return "";
    const w = 280;
    const h = 60;
    const maxEq = Math.max(...points.map((p) => p.equity));
    const minEq = Math.min(...points.map((p) => p.equity));
    const span = maxEq - minEq || 1;

    return points
      .map((p, idx) => {
        const x = (idx / Math.max(1, points.length - 1)) * (w - 4) + 2;
        const y =
          h - 2 - ((p.equity - minEq) / span) * (h - 6); // top is max equity
        return `${idx === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [points]);

  if (!isAuthed) {
    return (
      <div className={styles.root}>
        <Navbar overlay brand="medenijazbec.pro" />
        <main className={styles.main}>
          <div className={styles.wrap}>
            <div className={styles.card}>Not logged in.</div>
          </div>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={styles.root}>
        <Navbar overlay brand="medenijazbec.pro" />
        <main className={styles.main}>
          <div className={styles.wrap}>
            <div className={styles.card}>
              You&apos;re logged in, but not an admin.
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Navbar overlay brand="medenijazbec.pro" />
      <main className={styles.main}>
        <div className={styles.wrap}>
          <header className={styles.headerRow}>
            <div>
              <h1 className={styles.h1}>Candle trading lab</h1>
              <p className={styles.meta}>
                Tune the global switches for symbol / timeframe / data provider
                and watch your 5 worker bots compete on live candles. Python
                inserts raw candles + features into the <code>trading_candles</code>{" "}
                schema; this page just reads via <code>NvdaTradingDbContext</code>.
              </p>
            </div>
            <div className={styles.small}>
              Logged in as <b>{email}</b>
            </div>
          </header>

          {/* Top: Settings + clock */}
          <section className={styles.grid}>
            {/* Settings card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.h2}>Global trading settings</h2>
                {settings && (
                  <span className={styles.badgeSoft}>
                    Updated:{" "}
                    {lastSavedIso
                      ? new Date(lastSavedIso).toISOString()
                      : "—"}
                  </span>
                )}
              </div>
              <p className={styles.meta}>
                These map directly to the <code>trading_settings</code> row
                (Id=1). The Python engine reads this before running simulations.
                You can switch symbol (e.g. NVDA → MSFT, AMD), timeframe, data
                provider and per-worker starting capital.
              </p>

              {settingsLoading && (
                <div className={styles.small}>Loading settings…</div>
              )}
              {settingsError && (
                <div className={styles.errorBox}>{settingsError}</div>
              )}

              {form && (
                <>
                  <div className={styles.row}>
                    <label htmlFor="symbol">Symbol</label>
                    <input
                      id="symbol"
                      className={styles.input}
                      value={form.symbol}
                      onChange={(e) => updateField("symbol", e.target.value)}
                      placeholder="e.g. NVDA, MSFT, AMD"
                    />
                  </div>

                  <div className={styles.row}>
                    <label htmlFor="timeframe">Timeframe</label>
                    <input
                      id="timeframe"
                      className={styles.input}
                      value={form.timeframeCode}
                      onChange={(e) =>
                        updateField("timeframeCode", e.target.value)
                      }
                      placeholder="1m / 5m / 15m / 60m"
                    />
                    <input
                      className={styles.input}
                      type="number"
                      min={1}
                      value={form.timeframeMinutes}
                      onChange={(e) =>
                        updateField("timeframeMinutes", e.target.value)
                      }
                      placeholder="Minutes (e.g. 1)"
                    />
                  </div>

                  <div className={styles.row}>
                    <label htmlFor="provider">Data provider</label>
                    <select
                      id="provider"
                      className={styles.select}
                      value={form.dataProvider}
                      onChange={(e) =>
                        updateField("dataProvider", e.target.value)
                      }
                    >
                      <option value="alpha">Alpha Vantage</option>
                      <option value="finnhub">Finnhub</option>
                    </select>
                  </div>

                  <div className={styles.row}>
                    <label htmlFor="capital">Initial capital per worker</label>
                    <input
                      id="capital"
                      type="number"
                      min={1}
                      step="1"
                      className={styles.input}
                      value={form.initialCapitalPerWorker}
                      onChange={(e) =>
                        updateField(
                          "initialCapitalPerWorker",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className={styles.row}>
                    <label htmlFor="history">Historical candles</label>
                    <input
                      id="history"
                      type="number"
                      min={10}
                      step={10}
                      className={styles.input}
                      value={form.historicalCandles}
                      onChange={(e) =>
                        updateField("historicalCandles", e.target.value)
                      }
                    />
                    <span className={styles.small}>
                      How many recent candles to pull per run (e.g. 200).
                    </span>
                  </div>

                  <div className={styles.row}>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      onClick={save}
                      disabled={settingsSaving}
                    >
                      {settingsSaving ? "Saving…" : "Save settings"}
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnSm}`}
                      onClick={reloadSettings}
                      disabled={settingsSaving || settingsLoading}
                    >
                      Reload
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Market clock card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.h2}>Market clock (NYSE → Ljubljana)</h2>
                {clock && (
                  <span
                    className={`${styles.badge} ${
                      clock.isOpenNow ? "" : styles.badgeDanger
                    }`}
                  >
                    {clock.exchange}: {clock.isOpenNow ? "OPEN" : "CLOSED"}
                  </span>
                )}
              </div>

              {clockLoading && (
                <div className={styles.small}>Loading market clock…</div>
              )}
              {clockError && (
                <div className={styles.errorBox}>{clockError}</div>
              )}
              {clock && (
                <>
                  <div className={styles.row}>
                    <label>Now (Ljubljana)</label>
                    <div className={styles.kbd}>
                      {new Date(clock.nowLjubljana).toLocaleString()}
                    </div>
                  </div>
                  <div className={styles.row}>
                    <label>Current session</label>
                    <div className={styles.small}>
                      <div>
                        <span className={styles.kbd}>
                          {new Date(
                            clock.currentSessionOpenLjubljana
                          ).toLocaleTimeString()}
                        </span>{" "}
                        →{" "}
                        <span className={styles.kbd}>
                          {new Date(
                            clock.currentSessionCloseLjubljana
                          ).toLocaleTimeString()}
                        </span>{" "}
                        (Ljubljana)
                      </div>
                      <div>
                        UTC:{" "}
                        <span className={styles.kbd}>
                          {new Date(
                            clock.currentSessionOpenUtc
                          ).toISOString()}
                        </span>{" "}
                        →{" "}
                        <span className={styles.kbd}>
                          {new Date(
                            clock.currentSessionCloseUtc
                          ).toISOString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.row}>
                    <label>Next open</label>
                    <div className={styles.small}>
                      <div>
                        <span className={styles.kbd}>
                          {new Date(
                            clock.nextSessionOpenLjubljana
                          ).toLocaleString()}
                        </span>{" "}
                        (Ljubljana)
                      </div>
                      <div>
                        UTC:{" "}
                        <span className={styles.kbd}>
                          {new Date(
                            clock.nextSessionOpenUtc
                          ).toISOString()}
                        </span>
                      </div>
                      {countdown && (
                        <div style={{ marginTop: 4 }}>
                          <span className={styles.badgeSoft}>
                            Next open in {countdown}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Workers overview */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.h2}>Worker bots (5 strategies)</h2>
              {bestWorker && (
                <span className={styles.badge}>
                  Leader: {bestWorker.name} · Eq{" "}
                  {bestWorker.equity?.toFixed(2) ??
                    bestWorker.initialCapital.toFixed(2)}
                </span>
              )}
            </div>
            <p className={styles.meta}>
              Each worker represents a separate strategy (trend follower, mean
              reversion, breakout, wick reversal, volatility scalper). Equity
              and PnL are snapshots written by the Python engine into{" "}
              <code>worker_stats</code>.
            </p>

            {workersLoading && (
              <div className={styles.small}>Loading workers…</div>
            )}
            {workersError && (
              <div className={styles.errorBox}>{workersError}</div>
            )}

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Strategy</th>
                    <th>Equity</th>
                    <th>Cash</th>
                    <th>Realized</th>
                    <th>Unrealized</th>
                    <th>Open pos</th>
                    <th>Trades</th>
                    <th>Snapshot</th>
                  </tr>
                </thead>
                <tbody>
                  {!workers.length && !workersLoading && (
                    <tr>
                      <td colSpan={9} className={styles.small}>
                        No workers found yet.
                      </td>
                    </tr>
                  )}
                  {workers.map((w) => {
                    const eq = w.equity ?? w.initialCapital;
                    const real = w.realizedPnl ?? 0;
                    const unreal = w.unrealizedPnl ?? 0;
                    const isSelected = selectedWorker?.id === w.id;
                    const pnlTotal = real + unreal;
                    const pnlClass =
                      pnlTotal > 0
                        ? styles.pillGood
                        : pnlTotal < 0
                        ? styles.pillBad
                        : styles.pillNeutral;

                    return (
                      <tr
                        key={w.id}
                        className={`${styles.workerRow} ${
                          isSelected ? styles.workerRowSelected : ""
                        }`}
                        onClick={() => setSelectedWorkerId(w.id)}
                      >
                        <td className={styles.kbd}>{w.name}</td>
                        <td>{w.strategyName}</td>
                        <td>{eq.toFixed(2)}</td>
                        <td>{(w.cash ?? 0).toFixed(2)}</td>
                        <td>
                          <span className={`${styles.pill} ${pnlClass}`}>
                            {real.toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.pill} ${pnlClass}`}>
                            {unreal.toFixed(2)}
                          </span>
                        </td>
                        <td>{w.openPositions ?? 0}</td>
                        <td>{w.totalTrades ?? 0}</td>
                        <td className={styles.kbd}>
                          {w.snapshotUtc
                            ? new Date(w.snapshotUtc).toISOString()
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Equity timeseries for selected worker */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.h2}>
                Equity history{" "}
                {selectedWorker ? `· ${selectedWorker.name}` : ""}
              </h2>
              <div className={styles.row}>
                <label htmlFor="hours-back">Window</label>
                <select
                  id="hours-back"
                  className={styles.select}
                  value={hoursBack}
                  onChange={(e) =>
                    setHoursBack(parseInt(e.target.value, 10) || 24)
                  }
                >
                  {HOURS_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      Last {h}h
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className={styles.meta}>
              Minimal inline sparkline based on <code>worker_stats</code>{" "}
              snapshots. You&apos;ll render full charts later on the public
              metrics pages.
            </p>

            {equityLoading && (
              <div className={styles.small}>Loading equity history…</div>
            )}
            {equityError && (
              <div className={styles.errorBox}>{equityError}</div>
            )}

            {!equityLoading && !points.length && (
              <div className={styles.small}>
                No equity snapshots yet for this worker / window.
              </div>
            )}

            {!!points.length && (
              <div className={styles.sparkline}>
                <svg width={280} height={60} viewBox="0 0 280 60">
                  <path
                    d={equitySparkPath}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  />
                </svg>
                <div className={styles.small}>
                  {points.length} points from{" "}
                  {new Date(points[0].snapshotUtc).toISOString()} →{" "}
                  {new Date(
                    points[points.length - 1].snapshotUtc
                  ).toISOString()}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminCandleTrading;
