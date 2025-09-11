import React, { useEffect, useState } from "react";
import styles from "../AdminShowcase.module.css";
import { admin } from "@/controllers/admin";

export default function Accounts() {
  const [users, setUsers] = useState<any[]>([]);
  const [adminLast, setAdminLast] = useState<any|null>(null);

  useEffect(() => {
    admin.allAccounts().then(setUsers).catch(console.error);
    admin.adminLastSession().then(setAdminLast).catch(console.error);
  }, []);

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <b>Admin last login session</b>
        <div style={{marginTop:6,fontSize:14}}>
          {adminLast ? (
            <span>
              {new Date(adminLast.createdUtc).toISOString()} • IP <span className={styles.kbd}>{adminLast.ip}</span> • UA {adminLast.userAgent}
            </span>
          ) : "No session recorded yet."}
        </div>
      </div>

      <div className={styles.card}>
        <b>All accounts</b>
        <table className={styles.table} style={{marginTop:8}}>
          <thead><tr><th>Email</th><th>Roles</th><th>Created</th><th>Last session</th><th>Sessions</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td className={styles.kbd}>{u.email ?? u.userName}</td>
                <td>{(u.roles||[]).join(", ") || "—"}</td>
                <td>{new Date(u.createdAt).toISOString()}</td>
                <td>{u.sessions?.last ? new Date(u.sessions.last).toISOString() : "—"}</td>
                <td>{u.sessions?.count ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
