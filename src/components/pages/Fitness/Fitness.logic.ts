import { useEffect, useMemo, useState } from 'react';
import { http } from '@/api/api';
import { auth } from '@/controllers/auth';
import type { FitnessDaily } from '@/types/domain';

// Backend expects: GET /api/fitness/daily?userId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
// (see FitnessController in your API). :contentReference[oaicite:1]{index=1}

export function useFitnessDaily(days = 90, userId?: string) {
  const [uid, setUid] = useState<string | undefined>(userId);
  const [rows, setRows] = useState<FitnessDaily[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // resolve user if not provided
  useEffect(() => {
    if (uid) return;
    auth.me().then(u => setUid(u.id)).catch(() => setError('Please log in.'));
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - Math.max(1, days));
    const qs = {
      userId: uid,
      from: from.toISOString().slice(0,10),
      to:   to.toISOString().slice(0,10),
    };
    setLoading(true);
    http.get<FitnessDaily[]>('/api/fitness/daily', qs)
      .then(setRows)
      .catch((e:any) => setError(e?.message ?? 'Failed to load fitness.'))
      .finally(() => setLoading(false));
  }, [uid, days]);

  const summary = useMemo(() => {
    if (!rows.length) return null;
    const total = rows.reduce((a,r) => a + (r.steps ?? 0), 0);
    const avg = Math.round(total / rows.length);
    const best = rows.reduce((m, r) => (r.steps ?? 0) > (m?.steps ?? 0) ? r : m, rows[0]);
    return { total, avg, best };
  }, [rows]);

  return { uid, rows, loading, error, summary };
}
