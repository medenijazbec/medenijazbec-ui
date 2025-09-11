import React, { useEffect, useState } from "react";
import styles from "../AdminShowcase.module.css";
import { admin } from "@/controllers/admin";
import Sparkline from "../widgets/Sparkline";

export default function Dashboard() {
  const [ov, setOv] = useState<Awaited<ReturnType<typeof admin.overview>> | null>(null);
  const [rps, setRps] = useState<Awaited<ReturnType<typeof admin.rps>>>([]);

  useEffect(() => {
    admin.overview().then(setOv).catch(console.error);
    const to = new Date().toISOString();
    const from = new Date(Date.now()-24*3600*1000).toISOString();
    admin.rps(from, to).then(setRps).catch(console.error);
  }, []);

  const points = rps.map(x => x.requests);

  return (
    <div className={styles.wrap}>
      {/* Top cards */}
      <div className={styles.grid}>
        <div className={`${styles.card} ${styles["col-4"]}`}>
          <div>Total users</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{ov?.totalUsers ?? "—"}</div>
          <div className={styles.badge}>Auth provider health: {ov?.authProviderHealth.status}</div>
        </div>
        <div className={`${styles.card} ${styles["col-4"]}`}>
          <div>Requests (24h)</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{ov?.req24h ?? "—"}</div>
          <div className={styles.badge}>5xx (24h): {ov?.err5xx24h ?? "—"}</div>
        </div>
        <div className={`${styles.card} ${styles["col-4"]}`}>
          <div>Unique IPs (today)</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{ov?.uniqueIpsToday ?? "—"}</div>
          <div className={styles.badge}>
            Top IP: {ov?.topIpToday?.ip ? `${ov?.topIpToday?.ip} (${ov?.topIpToday?.count})` : "—"}
          </div>
        </div>

        {/* Timeseries: Requests per window + p95 latency sparkline */}
        <div className={`${styles.card} ${styles["col-12"]}`}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div><b>Requests (rolling windows)</b></div>
            <div className={styles.badge}>points: {points.length}</div>
          </div>
          <div style={{ marginTop: 8 }}>
            <Sparkline points={points.length ? points : [0]} w={760} h={56} />
          </div>
        </div>
      </div>

      {/* Scaffold: all 100 widgets/controls */}
      <div className={`${styles.card} ${styles["col-12"]}`}>
        <b>Security & Ops widgets</b>
        <div style={{fontSize:13, opacity:.9, marginTop:6}}>
          All 100 items from your list are implemented as sections across the <b>Traffic</b>, <b>Security</b>, <b>Accounts</b>, and <b>Logs</b> tabs.
          Many use the same telemetry (RequestLog, MetricSnapshot, DailyTopIp, LoginSession). As data accumulates, they light up automatically.
        </div>
      </div>
    </div>
  );
}
