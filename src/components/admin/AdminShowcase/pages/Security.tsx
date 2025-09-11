import React, { useEffect, useState } from "react";
import styles from "../AdminShowcase.module.css";
import { admin } from "@/controllers/admin";

export default function Security() {
  const [bans, setBans] = useState<any[]>([]);
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");

  const load = async () => setBans(await admin.listBans());
  useEffect(() => { load(); }, []);

  const ban = async () => {
    if (!ip.trim()) return;
    await admin.banIp(ip.trim(), reason || undefined);
    setIp(""); setReason("");
    await load();
  };
  const unban = async (id: number) => { await admin.unban(id); await load(); };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <b>Quick block/allow</b>
        <div style={{display:"flex", gap:8, marginTop:8}}>
          <input className={styles.input} placeholder="IP (e.g., 1.2.3.4)" value={ip} onChange={e=>setIp(e.target.value)} />
          <input className={styles.input} placeholder="Reason (optional)" value={reason} onChange={e=>setReason(e.target.value)} />
          <button className={styles.btn} onClick={ban}>Block IP</button>
        </div>
      </div>

      <div className={styles.card}>
        <b>Active bans</b>
        <table className={styles.table} style={{marginTop:8}}>
          <thead><tr><th>IP</th><th>Reason</th><th>Created</th><th>Expires</th><th></th></tr></thead>
          <tbody>
            {bans.map(b => (
              <tr key={b.id}>
                <td className={styles.kbd}>{b.value}</td>
                <td>{b.reason ?? "—"}</td>
                <td>{new Date(b.createdUtc).toISOString()}</td>
                <td>{b.expiresUtc ? new Date(b.expiresUtc).toISOString() : "—"}</td>
                <td><button className={styles.btn} onClick={()=>unban(b.id)}>Unban</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
