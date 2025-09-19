// src/pages/fitness/FitnessFunFacts.tsx
import { useEffect, useMemo, useState } from 'react';
import styles from './FitnessFunFacts.module.css';
import { fitnessFunFacts } from '@/controllers/fitnessFunFacts';
import type { FunFactsResponse, TopDayDto } from '@/types/fitnessFunFacts';
import { env } from '@/lib/env';

function iso(d?: string | null) {
  return d ? new Date(d).toISOString().slice(0, 10) : '—';
}

function resolvePublicUserId() {
  const qsId = new URLSearchParams(window.location.search).get('userId')?.trim();
  if (qsId) return qsId;
  return env.PUBLIC_FITNESS_USER_ID?.trim();
}

function MonthBadge({ y, m }: { y: number; m: number }) {
  const name = new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'short', year: 'numeric' });
  return <span className={styles.badge}>{name}</span>;
}

function TopTable({ title, rows }: { title: string; rows: TopDayDto[] }) {
  return (
    <div className={styles.card}>
      <h3 className={styles.h3}>{title}</h3>
      {!rows?.length ? <div className={styles.meta}>No data.</div> : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th style={{textAlign:'right'}}>Steps</th>
              <th style={{textAlign:'right'}}>Km</th>
              <th style={{textAlign:'right'}}>Cal out</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={`${r.day}-${r.steps}`}>
                <td className={styles.mono}>{iso(r.day)} {r.isSynthetic ? <span className={styles.pill}>SYN</span> : null}</td>
                <td style={{textAlign:'right'}}>{r.steps.toLocaleString()}</td>
                <td style={{textAlign:'right'}}>{(r.distanceKm ?? 0).toFixed(2)}</td>
                <td style={{textAlign:'right'}}>{(r.caloriesOut ?? 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function FitnessFunFacts() {
  const [uid] = useState<string | undefined>(() => resolvePublicUserId());
  const [data, setData] = useState<FunFactsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Always include synthetic
  const INCLUDE_SYNTHETIC = true;

  // From a fixed anchor date onward (inclusive)
  const to = useMemo(() => new Date(), []);
  const from = useMemo(() => new Date('2021-12-14T00:00:00Z'), []);

  const fetchData = async () => {
    if (!uid) {
      setError('No target user specified. Provide ?userId=... or set VITE_PUBLIC_FITNESS_USER_ID.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fitnessFunFacts.get({
        userId: uid,
        from: from.toISOString().slice(0,10),
        to: to.toISOString().slice(0,10),
        includeSynthetic: INCLUDE_SYNTHETIC,
      });
      setData(res);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load fun facts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [uid]);

  return (
    <section className={styles.section}>
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <h2 className={styles.h2}>Fun facts</h2>
          <div className={styles.controls}>
            {/* Synthetic is always included. 
            <button className={styles.btn} disabled={loading} onClick={fetchData}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>*/}
          </div>
        </div>

        {error && <div className={styles.bad}>{error}</div>}

        {!data ? <div className={styles.meta}>Loading…</div> : (
          <>
            <div className={styles.kpiGrid}>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>Days in range</div>
                <div className={styles.kpiValue}>{data.daysWithData} <span className={styles.meta}>/ {data.totalDays}</span></div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>Total steps</div>
                <div className={styles.kpiValue}>{data.totalSteps.toLocaleString()}</div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>Total km</div>
                <div className={styles.kpiValue}>{data.totalKm.toFixed(2)}</div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>Avg steps / day</div>
                <div className={styles.kpiValue}>{data.avgSteps.toLocaleString()}</div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>Avg km / day</div>
                <div className={styles.kpiValue}>{data.avgKm.toFixed(2)}</div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>≥10k steps</div>
                <div className={styles.kpiValue}>{data.daysStepsGte10k}</div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>≥15k steps</div>
                <div className={styles.kpiValue}>{data.daysStepsGte15k}</div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>≥5 km</div>
                <div className={styles.kpiValue}>{data.daysKmGte5}</div>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiLabel}>≥10 km</div>
                <div className={styles.kpiValue}>{data.daysKmGte10}</div>
              </div>
            </div>

            <div style={{ marginTop: 18 }}></div>

            <div className={styles.rowCards}>
              <div className={styles.card}>
                <h3 className={styles.h3}>Best streaks</h3>
                <ul className={styles.list}>
                  <li>
                    <span className={styles.mono}>≥{data.bestStreakGte8k.threshold.toLocaleString()} steps</span> — <b>{data.bestStreakGte8k.length}</b> days
                    {data.bestStreakGte8k.length > 0 && <> (<span className={styles.mono}>{iso(data.bestStreakGte8k.start)}</span> → <span className={styles.mono}>{iso(data.bestStreakGte8k.end)}</span>)</>}
                  </li>
                  <li>
                    <span className={styles.mono}>≥{data.bestStreakGte10k.threshold.toLocaleString()} steps</span> — <b>{data.bestStreakGte10k.length}</b> days
                    {data.bestStreakGte10k.length > 0 && <> (<span className={styles.mono}>{iso(data.bestStreakGte10k.start)}</span> → <span className={styles.mono}>{iso(data.bestStreakGte10k.end)}</span>)</>}
                  </li>
                </ul>
                <div className={styles.meta}>
                  Weekday averages:&nbsp;
                  {data.weekdayAverages.map(w => (
                    <span key={w.weekday} className={styles.badge}>
                      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][w.weekday-1]}:
                      &nbsp;{w.avgSteps.toLocaleString()} / {w.avgKm.toFixed(2)} km
                    </span>
                  ))}
                </div>
                <div className={styles.meta} style={{marginTop:6}}>
                  Best months:&nbsp;
                  <MonthBadge y={data.bestMonthBySteps.year} m={data.bestMonthBySteps.month} /> (steps)
                  &nbsp;·&nbsp;
                  <MonthBadge y={data.bestMonthByKm.year} m={data.bestMonthByKm.month} /> (km)
                </div>
              </div>

              <TopTable title="Top 10 days — steps" rows={data.top10BySteps} />
              <TopTable title="Top 10 days — distance (km)" rows={data.top10ByKm} />
              <TopTable title="Top 10 days — calories out" rows={data.top10ByCaloriesOut} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
