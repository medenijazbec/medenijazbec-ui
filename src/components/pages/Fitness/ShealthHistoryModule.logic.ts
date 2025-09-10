// src/components/pages/Fitness/ShealthHistoryModule.logic.ts
import { useEffect, useMemo, useState } from "react";
import { http } from "@/api/api";
import { env } from "@/lib/env";

export type FitnessRow = {
  userId: string;
  day: string;           // "YYYY-MM-DD"
  steps?: number | null;
  distanceKm?: number | null;
};

export function useShealthHistory() {
  // resolve once at startup: ?userId=... OR .env public id
  const [uid] = useState<string | undefined>(() => {
    const qsId = new URLSearchParams(window.location.search).get("userId")?.trim();
    const envId = env.PUBLIC_FITNESS_USER_ID?.trim();
    return qsId || envId || undefined;
  });

  const [rows, setRows] = useState<FitnessRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setError("No target user specified. Provide ?userId=... in the URL or set VITE_PUBLIC_FITNESS_USER_ID.");
      return;
    }
    setLoading(true);
    const from = "2000-01-01";
    const to = new Date().toISOString().slice(0, 10);

    http.get<FitnessRow[]>("/api/fitness/daily", { userId: uid, from, to })
      .then(all => setRows((all ?? []).filter(r => r.day !== "1970-01-01")))
      .catch((e:any) => setError(e?.response?.data?.detail ?? e?.message ?? "Failed to load."))
      .finally(() => setLoading(false));
  }, [uid]);

  const months = useMemo(() => {
    const map = new Map<string, FitnessRow[]>();
    for (const r of rows) {
      const ym = r.day.slice(0, 7);
      if (!map.has(ym)) map.set(ym, []);
      map.get(ym)!.push(r);
    }
    return Array.from(map.entries())
      .sort((a,b) => a[0] < b[0] ? -1 : 1)
      .map(([ym, items]) => {
        let totalSteps = 0, totalKm = 0, bestSteps = 0, bestDist = 0;
        for (const it of items) {
          totalSteps += it.steps ?? 0;
          const km = Number(it.distanceKm ?? 0);
          totalKm += km;
          if ((it.steps ?? 0) > bestSteps) bestSteps = it.steps ?? 0;
          if (km > bestDist) bestDist = km;
        }
        return {
          ym,
          items: items.sort((a,b)=>a.day.localeCompare(b.day)),
          totalSteps,
          totalKm: Math.round(totalKm * 100) / 100,
          bestSteps,
          bestDist
        };
      });
  }, [rows]);

  const extremes = useMemo(() => {
    const bySteps = [...rows].sort((a,b)=> (b.steps ?? 0) - (a.steps ?? 0)).slice(0, 10);
    const byDist  = [...rows].sort((a,b)=> Number(b.distanceKm ?? 0) - Number(a.distanceKm ?? 0)).slice(0, 10);
    return { bySteps, byDist };
  }, [rows]);

  return { rows, months, extremes, loading, error };
}
