import React, { useMemo } from "react";
import Navbar from "@/components/navbar/Navbar";
import FooterMatrix from "@/components/Footer/FooterMatrix";

import styles from "./LiveTradingPage.module.css";
import {
  useLiveTradingDashboard,
  formatLjubljana,
  formatUtc,
} from "./liveTrading.logic";

// LiveTradingPage.tsx

import TradingChartCard from "../../admin/AdminCandleTrading/trandingCharts/TradingChartCard";
import TradingChartsPanel from "../../admin/AdminCandleTrading/trandingCharts/TradingChartsPanel";
import { CouncilPanel } from "./CouncilComponent/CouncilPanel";
import { WorkerBotsPanel } from "./WorkerBotsComponent/WorkerBotsPanel";



export default function LiveTradingPage() {
  const {
    settings,
    workers,
    marketClock,
    lastPrice,
    lastCandleTimeUtc,
    loading,
    error,
    lastUpdatedAt,
    reload,
  } = useLiveTradingDashboard();

  const marketStatusLabel = useMemo(() => {
    if (!marketClock) return "Unknown";
    return marketClock.isOpenNow ? "Open" : "Closed";
  }, [marketClock]);

  const marketStatusClass = useMemo(() => {
    if (!marketClock) return styles.badgeUnknown;
    return marketClock.isOpenNow ? styles.badgeOpen : styles.badgeClosed;
  }, [marketClock]);

  const workerSummary = useMemo(() => {
    if (!workers.length) return null;

    let totalEquity = 0;
    let totalRealized = 0;
    let totalUnrealized = 0;
    let openPositions = 0;

    for (const w of workers) {
      totalEquity += w.equity ?? 0;
      totalRealized += w.realizedPnl ?? 0;
      totalUnrealized += w.unrealizedPnl ?? 0;
      openPositions += w.openPositions ?? 0;
    }

    return {
      totalEquity,
      totalRealized,
      totalUnrealized,
      openPositions,
      workersCount: workers.length,
    };
  }, [workers]);

  return (
    <div className={`${styles.page} ${styles.pageWide}`}>
      {/* NAVBAR VISIBLE (same pattern as Fitness page) */}
      <Navbar overlay brand="medenijazbec.pro" />

      {/* Background nebula */}
      <div className={styles.nebulaField} aria-hidden="true">
        <span className={`${styles.nebula} ${styles.n1}`}>
          <i className={styles.blob} />
        </span>
        <span className={`${styles.nebula} ${styles.n2}`}>
          <i className={styles.blob} />
        </span>
        <span className={`${styles.nebula} ${styles.n3}`}>
          <i className={styles.blob} />
        </span>
        <span className={`${styles.nebula} ${styles.n4}`}>
          <i className={styles.blob} />
        </span>
        <span className={`${styles.nebula} ${styles.n5}`}>
          <i className={styles.blob} />
        </span>
        <span className={`${styles.nebula} ${styles.n6}`}>
          <i className={styles.blob} />
        </span>
      </div>

      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.h1}>Live trading lab</h1>

          {/* top meta / status row */}
          <section className={`${styles.section} ${styles.sectionPad}`}>
            <header className={styles.headerRow}>
              <div>
                <h2 className={styles.h2}>NVDA candle engine</h2>
                <p className={styles.meta}>
                  Read-only view of the NVDA candle trading lab. Shows live
                  market status, current symbol/timeframe configuration, worker
                  equity snapshots and a live chart. Data is served by{" "}
                  <code>/api/nvda-trading/*</code> (backend C# controller).
                </p>
              </div>
              <div className={styles.headerRight}>
                <div className={styles.badgeRow}>
                  <span className={`${styles.badgeSoft} ${marketStatusClass}`}>
                    Market: {marketStatusLabel}
                  </span>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSm}`}
                    onClick={reload}
                    disabled={loading}
                  >
                    {loading ? "Refreshing…" : "Refresh now"}
                  </button>
                </div>
                <div className={styles.smallMeta}>
                  Last updated:{" "}
                  <span className={styles.kbd}>
                    {lastUpdatedAt ? formatLjubljana(lastUpdatedAt) : "—"}
                  </span>
                </div>
              </div>
            </header>

            {error && <div className={styles.errorBox}>{error}</div>}

            {/* ===============================
                MAIN TRADING CHART CARD (NEW)
               =============================== */}
            <div className={`${styles.card} ${styles.mainCard}`}>
             <CouncilPanel/>
             <WorkerBotsPanel />
              {/* Adjust props to match your TradingChartCard API */}
              <TradingChartsPanel

              />
            </div>

            {/* If you have a separate control panel, you can drop it here or next to chart */}
            {/*
            <div className={`${styles.card} ${styles.controls}`}>
              <LiveTradingPanel settings={settings} onReload={reload} />
            </div>
            */}

            {/* Market clock + symbol/settings grid, like two Bootstrap cols */}
            <div className={styles.grid}>
              {/* Market clock card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.h3}>Market clock</h3>
                  <span className={styles.badgeSoft}>
                    Exchange: {marketClock?.exchange ?? "NYSE"}
                  </span>
                </div>

                {!marketClock && (
                  <p className={styles.small}>
                    {loading
                      ? "Loading market clock…"
                      : "Market clock is not available at the moment."}
                  </p>
                )}

                {marketClock && (
                  <>
                    <div className={styles.row}>
                      <div className={styles.labelCol}>Now (UTC)</div>
                      <div className={styles.valueCol}>
                        <span className={styles.kbd}>
                          {formatUtc(marketClock.nowUtc)}
                        </span>
                      </div>
                    </div>
                    <div className={styles.row}>
                      <div className={styles.labelCol}>Now (Ljubljana)</div>
                      <div className={styles.valueCol}>
                        <span className={styles.kbd}>
                          {formatLjubljana(marketClock.nowLjubljana)}
                        </span>
                      </div>
                    </div>

                    <div className={styles.subHeader}>Current session</div>
                    <div className={styles.row}>
                      <div className={styles.labelCol}>Open (UTC)</div>
                      <div className={styles.valueCol}>
                        <span className={styles.kbd}>
                          {formatUtc(marketClock.currentSessionOpenUtc)}
                        </span>
                      </div>
                    </div>
                    <div className={styles.row}>
                      <div className={styles.labelCol}>Close (UTC)</div>
                      <div className={styles.valueCol}>
                        <span className={styles.kbd}>
                          {formatUtc(marketClock.currentSessionCloseUtc)}
                        </span>
                      </div>
                    </div>
                    <div className={styles.row}>
                      <div className={styles.labelCol}>Open (Ljubljana)</div>
                      <div className={styles.valueCol}>
                        <span className={styles.kbd}>
                          {formatLjubljana(
                            marketClock.currentSessionOpenLjubljana
                          )}
                        </span>
                      </div>
                    </div>
                    <div className={styles.row}>
                      <div className={styles.labelCol}>Close (Ljubljana)</div>
                      <div className={styles.valueCol}>
                        <span className={styles.kbd}>
                          {formatLjubljana(
                            marketClock.currentSessionCloseLjubljana
                          )}
                        </span>
                      </div>
                    </div>

                    <div className={styles.subHeader}>Next session</div>
                    <div className={styles.row}>
                      <div className={styles.labelCol}>Next open (UTC)</div>
                      <div className={styles.valueCol}>
                        <span className={styles.kbd}>
                          {formatUtc(marketClock.nextSessionOpenUtc)}
                        </span>
                      </div>
                    </div>
                    <div className={styles.row}>
                      <div className={styles.labelCol}>
                        Next open (Ljubljana)
                      </div>
                      <div className={styles.valueCol}>
                        <span className={styles.kbd}>
                          {formatLjubljana(
                            marketClock.nextSessionOpenLjubljana
                          )}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Symbol / settings card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.h3}>Symbol & timeframe</h3>
                  <span className={styles.badgeSoft}>
                    {settings
                      ? `${settings.symbol} · ${settings.timeframeCode}`
                      : "No settings"}
                  </span>
                </div>

                {!settings && (
                  <p className={styles.small}>
                    {loading
                      ? "Loading trading settings…"
                      : "Trading settings are not configured yet."}
                  </p>
                )}

                {settings && (
                  <>
                    <p className={styles.meta}>
                      Live engine is configured via{" "}
                      <code>trading_settings</code> (symbol, timeframe,
                      provider, capital per worker and historical window).
                    </p>

                    <div className={styles.row}>
                      <div className={styles.labelCol}>Symbol</div>
                      <div className={styles.valueCol}>
                        <span className={styles.kbd}>{settings.symbol}</span>
                      </div>
                    </div>
                    <div className={styles.row}>
                      <div className={styles.labelCol}>Timeframe</div>
                      <div className={styles.valueCol}>
                        <span className={styles.kbd}>
                          {settings.timeframeCode} ({settings.timeframeMinutes}{" "}
                          min)
                        </span>
                      </div>
                    </div>
                    <div className={styles.row}>
                      <div className={styles.labelCol}>Data provider</div>
                      <div className={styles.valueCol}>
                        <span className={styles.kbd}>
                          {settings.dataProvider}
                        </span>
                      </div>
                    </div>
                    <div className={styles.row}>
                      <div className={styles.labelCol}>Initial capital</div>
                      <div className={styles.valueCol}>
                        {settings.initialCapitalPerWorker.toFixed(2)}{" "}
                        <span className={styles.dim}>per worker</span>
                      </div>
                    </div>
                    <div className={styles.row}>
                      <div className={styles.labelCol}>Historical candles</div>
                      <div className={styles.valueCol}>
                        {settings.historicalCandles}
                      </div>
                    </div>
                    <div className={styles.row}>
                      <div className={styles.labelCol}>Updated (UTC)</div>
                      <div className={styles.valueCol}>
                        <span className={styles.kbd}>
                          {formatUtc(settings.updatedUtc)}
                        </span>
                      </div>
                    </div>

                    <div className={styles.subHeader}>Last price snapshot</div>
                    <div className={styles.row}>
                      <div className={styles.labelCol}>Last close</div>
                      <div className={styles.valueCol}>
                        {lastPrice != null ? (
                          <span className={styles.priceValue}>
                            {lastPrice.toFixed(4)}
                          </span>
                        ) : (
                          <span className={styles.dim}>n/a</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.row}>
                      <div className={styles.labelCol}>Candle time</div>
                      <div className={styles.valueCol}>
                        <span className={styles.kbd}>
                          {lastCandleTimeUtc
                            ? formatUtc(lastCandleTimeUtc)
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Workers table */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.h3}>Workers & equity</h3>
                <div className={styles.badgeRow}>
                  <span className={styles.badgeSoft}>
                    Workers: {workers.length || 0}
                  </span>
                  {workerSummary && (
                    <span className={styles.badgeSoft}>
                      Total equity: {workerSummary.totalEquity.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <p className={styles.meta}>
                Each worker simulates one strategy instance with its own equity,
                cash and open positions. This is read-only and does not expose
                private API keys or infrastructure details.
              </p>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name / strategy</th>
                      <th>Equity</th>
                      <th>Cash</th>
                      <th>Realized PnL</th>
                      <th>Unrealized PnL</th>
                      <th>Open pos</th>
                      <th>Total trades</th>
                      <th>Snapshot (UTC)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && !workers.length && (
                      <tr>
                        <td colSpan={9} className={styles.small}>
                          Loading workers…
                        </td>
                      </tr>
                    )}

                    {!loading && !workers.length && (
                      <tr>
                        <td colSpan={9} className={styles.small}>
                          No workers are registered yet. Once the engine is
                          running, worker snapshots will appear here.
                        </td>
                      </tr>
                    )}

                    {workers.map((w) => (
                      <tr key={w.id}>
                        <td className={styles.kbd}>{w.id}</td>
                        <td>
                          <div className={styles.bold}>{w.name}</div>
                          <div className={styles.small}>
                            {w.strategyName || "—"}
                          </div>
                        </td>
                        <td>
                          {w.equity != null ? w.equity.toFixed(2) : "—"}
                        </td>
                        <td>{w.cash != null ? w.cash.toFixed(2) : "—"}</td>
                        <td
                          className={
                            w.realizedPnl != null && w.realizedPnl < 0
                              ? styles.neg
                              : styles.pos
                          }
                        >
                          {w.realizedPnl != null
                            ? w.realizedPnl.toFixed(2)
                            : "—"}
                        </td>
                        <td
                          className={
                            w.unrealizedPnl != null && w.unrealizedPnl < 0
                              ? styles.neg
                              : styles.pos
                          }
                        >
                          {w.unrealizedPnl != null
                            ? w.unrealizedPnl.toFixed(2)
                            : "—"}
                        </td>
                        <td>{w.openPositions ?? "—"}</td>
                        <td>{w.totalTrades ?? "—"}</td>
                        <td className={styles.kbd}>
                          {w.snapshotUtc ? formatUtc(w.snapshotUtc) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {workerSummary && (
                <div className={styles.summaryRow}>
                  <div>
                    <span className={styles.dim}>Workers:</span>{" "}
                    {workerSummary.workersCount}
                  </div>
                  <div>
                    <span className={styles.dim}>Total equity:</span>{" "}
                    {workerSummary.totalEquity.toFixed(2)}
                  </div>
                  <div>
                    <span className={styles.dim}>Realized PnL:</span>{" "}
                    <span
                      className={
                        workerSummary.totalRealized < 0
                          ? styles.neg
                          : styles.pos
                      }
                    >
                      {workerSummary.totalRealized.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className={styles.dim}>Unrealized PnL:</span>{" "}
                    <span
                      className={
                        workerSummary.totalUnrealized < 0
                          ? styles.neg
                          : styles.pos
                      }
                    >
                      {workerSummary.totalUnrealized.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className={styles.dim}>Open positions:</span>{" "}
                    {workerSummary.openPositions}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <FooterMatrix overlay={false} />
    </div>
  );
}
