import React, { useMemo, useState } from 'react';
import Navbar from '@/components/navbar/Navbar';
import styles from './Fitness.module.css';
import { useFitnessDaily } from './Fitness.logic';

const DAY_OPTIONS = [30, 60, 90, 180, 365];

export default function FitnessPage() {
  const [days, setDays] = useState<number>(90);
  const { rows, loading, error, summary } = useFitnessDaily(days);

  const pretty = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString();

  const totals = useMemo(() => {
    if (!rows.length) return null;
    const km = rows.reduce((a, r) => a + (Number((r as any).distanceKm) || 0), 0);
    return { km: Math.round(km * 10) / 10 };
  }, [rows]);

  return (
    <div className={styles.page}>
      <Navbar overlay brand="medenijazbec.pro" />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.h1}>Fitness</h1>

          <div className={styles.card}>
            <div className={styles.row}>
              <label>Range:&nbsp;</label>
              <select
                className={styles.select}
                value={days}
                onChange={(e)=>setDays(Number(e.target.value))}
              >
                {DAY_OPTIONS.map(d => <option key={d} value={d}>{d} days</option>)}
              </select>
            </div>

            {loading && <div className={styles.meta}>Loading…</div>}
            {error && <div className={styles.bad}>{error}</div>}

            {!!summary && !loading && (
              <div className={styles.row}>
                <div>Avg steps: <b>{summary.avg.toLocaleString()}</b></div>
                <div>• Total steps: <b>{summary.total.toLocaleString()}</b></div>
                <div>• Best day: <b>{pretty(summary.best.day)}</b> ({(summary.best.steps ?? 0).toLocaleString()} steps)</div>
                {totals && <div>• Distance: <b>{totals.km} km</b></div>}
              </div>
            )}
          </div>

          <div className={styles.card}>
            <table className={styles.table}>
              <thead>
                <tr><th>Date</th><th style={{textAlign:'right'}}>Steps</th><th style={{textAlign:'right'}}>Distance (km)</th></tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.day}>
                    <td className={styles.meta}>{pretty(r.day)}</td>
                    <td style={{textAlign:'right'}}>{(r.steps ?? 0).toLocaleString()}</td>
                    <td style={{textAlign:'right'}}>{((r as any).distanceKm ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                {!rows.length && !loading && (
                  <tr><td colSpan={3} className={styles.meta}>No data yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  );
}
