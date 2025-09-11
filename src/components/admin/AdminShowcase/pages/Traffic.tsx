import React, { useEffect, useState } from "react";
import styles from "../AdminShowcase.module.css";
import { admin, type TopIp } from "@/controllers/admin";

export default function Traffic() {
  const [isoDay, setIsoDay] = useState(() => new Date().toISOString().slice(0,10));
  const [rows, setRows] = useState<TopIp[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [split, setSplit] = useState<Array<{bucket:string;count:number}>>([]);

  const load = async (day: string) => {
    const top = await admin.topIps(day);
    setRows(top.top);
    const to = new Date().toISOString();
    const from = new Date(Date.now()-3600*1000).toISOString();
    setSplit(await admin.statusSplit(from, to));
    setRecent(await admin.recentLogs(200));
  };

  useEffect(() => { load(isoDay); }, [isoDay]);

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div style={{display:"flex", gap:10, alignItems:"center"}}>
          <b>Top IPs per day</b>
          <input className={styles.input} type="date" value={isoDay}
            onChange={e => setIsoDay(e.target.value)} />
        </div>
        <table className={styles.table} style={{marginTop:8}}>
          <thead><tr><th>#</th><th>IP</th><th>Count</th><th>Country</th><th>ASN</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={`${r.day}-${r.rank}`}>
                <td>{r.rank}</td><td className={styles.kbd}>{r.ip}</td><td>{r.count}</td>
                <td>{r.country ?? "?"}</td><td>{r.asn ?? "?"}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} style={{opacity:.85}}>No data for selected day.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className={styles.grid}>
        <div className={`${styles.card} ${styles["col-6"]}`}>
          <b>Status code split (last 1h)</b>
          <table className={styles.table} style={{marginTop:8}}>
            <thead><tr><th>Bucket</th><th>Count</th></tr></thead>
            <tbody>{split.map(s => (<tr key={s.bucket}><td>{s.bucket}</td><td>{s.count}</td></tr>))}</tbody>
          </table>
        </div>
        <div className={`${styles.card} ${styles["col-6"]}`}>
          <b>Recent requests</b>
          <table className={styles.table} style={{marginTop:8}}>
            <thead><tr><th>When (UTC)</th><th>IP</th><th>Method</th><th>Path</th><th>Code</th><th>ms</th></tr></thead>
            <tbody>
              {recent.map((r,i) => (
                <tr key={i}>
                  <td>{new Date(r.startedUtc).toISOString()}</td>
                  <td className={styles.kbd}>{r.ip}</td>
                  <td>{r.method}</td><td className={styles.kbd}>{r.path}</td>
                  <td>{r.statusCode}</td><td>{r.durationMs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
