import React from "react";
import styles from "./AdminMarket.module.css";
import Navbar from "@/components/navbar/Navbar";
import { useEtlOverview, useTopCounts, useKeyInventory, useBlockedKeys, useFairness, useJobsWorkers, usePrices, useAlerts } from "./adminMarket.logic";

export default function AdminMarket() {
  const { data, loading, err } = useEtlOverview();
  const counts = useTopCounts();
  const inventory = useKeyInventory();
  const blocked = useBlockedKeys();
  const fairness = useFairness();
  const { jobs, workers } = useJobsWorkers();
  const priceFresh = usePrices();
  const alerts = useAlerts();

  return (
    <div className={styles.root}>
      <Navbar overlay brand="medenijazbec.pro" />
      <main className={styles.main}>

        {/* Top KPIs */}
        <div className={styles.card} style={{gridColumn:'1 / -1', marginBottom:12}}>
          <h3>ETL Overview</h3>
          {loading && <div>Loading…</div>}
          {err && <div style={{color:'#ff9a9a'}}>Error: {err}</div>}
          {data && (
            <div className={styles.kpi}>
              <span className={styles.pill}>Companies: <b>{data.companies}</b></span>
              <span className={styles.pill}>Articles (GDELT): <b>{data.articlesGdelt}</b></span>
              <span className={styles.pill}>Articles (Ext): <b>{data.articlesExt}</b></span>
              <span className={styles.pill}>Requests total: <b>{data.requestsTotal}</b></span>
              <span className={styles.pill}>Jobs: <b>{data.jobs}</b></span>
              <span className={styles.pill}>OK rate 24h: <b>{Math.round((data.okRate24h ?? 0) * 100)}%</b></span>
            </div>
          )}
        </div>

        {/* Alerts */}
        <section className={styles.card} style={{gridColumn:'1 / -1'}}>
          <h3>Alerts</h3>
          {!alerts ? <div>—</div> : (
            <div className={styles.alerts}>
              <div><b>No free keys:</b> {alerts.noFreeSources.length ? alerts.noFreeSources.join(", ") : "—"}</div>
              <div><b>Rising 429 (1h):</b> {alerts.hot429.length ? (
                <ul className={styles.ul}>
                  {alerts.hot429.map(a => (
                    <li key={a.source}>{a.source}: {a.s429}/{a.total} ({a.pct}%)</li>
                  ))}
                </ul>
              ) : "—"}</div>
              <div><b>Hammering during cooldown:</b> {alerts.hammering.length ? alerts.hammering.length : "—"}</div>
            </div>
          )}
        </section>

        <div className={styles.grid}>
          {/* Inventory by source */}
          <section className={styles.card} style={{gridColumn:'span 6'}}>
            <h3>Key Inventory (by source)</h3>
            {!inventory.length ? <div>—</div> : (
              <table className={styles.table}>
                <thead><tr><th>Source</th><th>Total</th><th>Active</th><th>Free</th><th>Blocked</th><th>Inactive</th></tr></thead>
                <tbody>
                  {inventory.map(r => (
                    <tr key={r.source}>
                      <td>{r.source}</td><td>{r.total}</td><td>{r.active}</td><td>{r.free}</td><td>{r.blocked}</td><td>{r.inactive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Blocked keys with ETA */}
          <section className={styles.card} style={{gridColumn:'span 6'}}>
            <h3>Blocked Keys (ETA)</h3>
            {!blocked.length ? <div>—</div> : (
              <table className={styles.table}>
                <thead><tr><th>Source</th><th>Label</th><th>Minutes left</th><th>Until (UTC)</th></tr></thead>
                <tbody>
                  {blocked.map(b => (
                    <tr key={b.id}>
                      <td>{b.source}</td>
                      <td>{b.accountLabel || "—"}</td>
                      <td>{b.minutesRemaining}</td>
                      <td className={styles.meta}>{new Date(b.exhaustedUntil).toISOString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Fairness */}
          <section className={styles.card} style={{gridColumn:'span 6'}}>
            <h3>Rotation Fairness (24h)</h3>
            {!fairness.length ? <div>—</div> : (
              <table className={styles.table}>
                <thead><tr><th>Source</th><th>Busiest Key</th><th>Share</th><th>Total Reqs</th></tr></thead>
                <tbody>
                  {fairness.map(f => (
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

          {/* Article counts by symbol (existing) */}
          <section className={styles.card} style={{gridColumn:'span 6'}}>
            <h3>Article counts by symbol</h3>
            {!counts.length ? <div>—</div> : (
              <table className={styles.table}>
                <thead><tr><th>Symbol</th><th>Total Articles</th></tr></thead>
                <tbody>
                  {counts.map(r => (<tr key={r.symbol}><td>{r.symbol}</td><td>{r.total}</td></tr>))}
                </tbody>
              </table>
            )}
          </section>

          {/* Jobs & Workers */}
          <section className={styles.card} style={{gridColumn:'span 6'}}>
            <h3>Jobs & Workers</h3>
            <div className={styles.split}>
              <div>
                <div className={styles.subhead}>Jobs by status</div>
                {!jobs.length ? <div>—</div> : (
                  <table className={styles.tableSm}>
                    <tbody>
                      {jobs.map(j => (<tr key={j.status}><td>{j.status}</td><td>{j.c}</td></tr>))}
                    </tbody>
                  </table>
                )}
              </div>
              <div>
                <div className={styles.subhead}>Workers</div>
                {!workers ? <div>—</div> : (
                  <div className={styles.meta}>
                    Active: <b>{workers.active.length}</b> • Stale: <b>{workers.stale.length}</b> • Total: <b>{workers.total}</b>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Price freshness */}
          <section className={styles.card} style={{gridColumn:'span 6'}}>
            <h3>Prices – Latest Close</h3>
            {!priceFresh.length ? <div>—</div> : (
              <table className={styles.table}>
                <thead><tr><th>Symbol</th><th>Latest date</th><th>Days since</th></tr></thead>
                <tbody>
                  {priceFresh.map(p => (
                    <tr key={p.symbol}>
                      <td>{p.symbol}</td>
                      <td className={styles.meta}>{p.latest ? new Date(p.latest).toISOString().slice(0,10) : "—"}</td>
                      <td>{p.daysSince ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
