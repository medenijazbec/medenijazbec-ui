import React, { useEffect, useState } from "react";
import styles from "../AdminShowcase.module.css";
import { admin } from "@/controllers/admin";

export default function Logs(){
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { admin.recentLogs(300).then(setItems); }, []);
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <b>Recent requests (last ~300)</b>
        <table className={styles.table} style={{marginTop:8}}>
          <thead>
            <tr><th>When</th><th>IP</th><th>UID</th><th>Method</th><th>Path</th><th>Code</th><th>ms</th></tr>
          </thead>
          <tbody>
            {items.map((r,i)=>(
              <tr key={i}>
                <td className={styles.kbd}>{new Date(r.startedUtc).toISOString()}</td>
                <td className={styles.kbd}>{r.ip}</td>
                <td className={styles.kbd}>{r.userId || "—"}</td>
                <td>{r.method}</td>
                <td className={styles.kbd}>{r.path}</td>
                <td>{r.statusCode}</td>
                <td>{r.durationMs}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{fontSize:12, opacity:.85, marginTop:8}}>
          Tip: many widgets in your list (e.g., “Top 404 paths”, “Bad UAs”, “429/403 repeaters”) are simple filters on this stream — wired in future tabs with server-side queries.
        </div>
      </div>
    </div>
  );
}
