// src/pages/fitness/useFitnessDaily.ts
import { useEffect, useMemo, useState } from 'react';
import { http } from '@/api/api';
import type { FitnessDaily } from '@/types/domain';
import { env } from '@/lib/env';

/**
 * Resolve the target user in this order:
 *   1) ?userId=... (query string)
 *   2) VITE_PUBLIC_FITNESS_USER_ID (from your .env)
 */
function resolvePublicUserId(explicit?: string) {
  if (explicit?.trim()) return explicit.trim();
  const qsId = new URLSearchParams(window.location.search).get('userId')?.trim();
  if (qsId) return qsId;
  const envId = env.PUBLIC_FITNESS_USER_ID?.trim();
  return envId || undefined;
}

export function useFitnessDaily(days = 90, userId?: string) {
  const [uid] = useState<string | undefined>(() => resolvePublicUserId(userId));
  const [rows, setRows] = useState<FitnessDaily[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = uid;
    if (!id) {
      setError('No target user specified. Provide ?userId=... or set VITE_PUBLIC_FITNESS_USER_ID.');
      return;
    }

    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - Math.max(1, days));

    const qs = {
      userId: id,
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };

    setLoading(true);
    http.get<FitnessDaily[]>('/api/fitness/daily', qs)
      .then(setRows)
      .catch((e: any) => setError(e?.message ?? 'Failed to load fitness.'))
      .finally(() => setLoading(false));
  }, [uid, days]);

  const summary = useMemo(() => {
    if (!rows.length) return null;
    const total = rows.reduce((a, r) => a + (r.steps ?? 0), 0);
    const avg = Math.round(total / rows.length);
    const best = rows.reduce((m, r) => (r.steps ?? 0) > (m?.steps ?? 0) ? r : m, rows[0]);
    return { total, avg, best };
  }, [rows]);

  return { uid, rows, loading, error, summary };
}
