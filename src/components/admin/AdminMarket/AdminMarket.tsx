import React from "react";
import styles from "./AdminMarket.module.css";
import { useEtlOverview, useTopCounts } from "./adminMarket.logic";
import Navbar from "@/components/navbar/Navbar";

export default function AdminMarket() {
  const { data, loading, err } = useEtlOverview();
  const counts = useTopCounts();

  return (
    <div className={styles.root}>
      <Navbar overlay brand="medenijazbec.pro" />
      <main className={styles.main}>

        <div className={styles.card} style={{gridColumn:'1 / -1', marginBottom:12}}>
          <h3>ETL Overview</h3>
          {loading && <div>Loading…</div>}
          {err && <div style={{color:'#ff9a9a'}}>Error: {err}</div>}
          {data && (
            <div className={styles.kpi}>
              <span className="pill">Companies: <b>{data.companies}</b></span>
              <span className="pill">Articles (GDELT): <b>{data.articlesGdelt}</b></span>
              <span className="pill">Articles (Ext): <b>{data.articlesExt}</b></span>
              <span className="pill">Requests total: <b>{data.requestsTotal}</b></span>
              <span className="pill">Jobs: <b>{data.jobs}</b></span>
            </div>
          )}
        </div>

        <div className={styles.grid}>
          <section className={styles.card} style={{gridColumn:'span 6'}}>
            <h3>Requests (last 24h by source)</h3>
            {!data ? <div>—</div> : (
              <table className={styles.table}>
                <thead><tr><th>Source</th><th>Total</th><th>OK</th><th>BAD</th></tr></thead>
                <tbody>
                  {data.perSource24h.map(r => (
                    <tr key={r.source}><td>{r.source}</td><td>{r.count}</td><td>{r.ok}</td><td>{r.bad}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

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
        </div>

      </main>
    </div>
  );
}
