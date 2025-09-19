import { useEffect, useMemo, useState } from "react";
import { http } from "@/api/api";
import { env } from "@/lib/env";

export type FitnessRow = {
  userId: string;
  day: string;                // "YYYY-MM-DD"
  steps?: number | null;
  distanceKm?: number | null;
  caloriesOut?: number | null;
};

export type MonthBucket = {
  ym: string;
  items: FitnessRow[];
  totalSteps: number;
  totalKm: number;
  totalCalories: number;
};

export function useShealthHistory() {
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
      setError("No target user specified. Provide ?userId=... or set VITE_PUBLIC_FITNESS_USER_ID.");
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const from = "2000-01-01";
        const to = new Date().toISOString().slice(0, 10);

        // fetch everything (server filters by range)
        const data = await http.get<FitnessRow[]>("/api/fitness/daily", { userId: uid, from, to });

        // sanitize nulls → numbers; drop bad dates
        const safe: FitnessRow[] = (data ?? [])
          .filter(r => !!r && !!r.day && r.day !== "1970-01-01")
          .map(r => ({
            userId: r.userId,
            day: r.day,
            steps: Number.isFinite(Number(r.steps)) ? Number(r.steps) : 0,
            distanceKm: Number.isFinite(Number(r.distanceKm)) ? Number(r.distanceKm) : 0,
            caloriesOut: Number.isFinite(Number(r.caloriesOut)) ? Number(r.caloriesOut) : 0,
          }))
          .sort((a, b) => a.day.localeCompare(b.day));

        setRows(safe);
        setError(null);
      } catch (e: any) {
        setError(e?.response?.data?.detail ?? e?.message ?? "Failed to load.");
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  const months: MonthBucket[] = useMemo(() => {
    const map = new Map<string, FitnessRow[]>();
    for (const r of rows) {
      const ym = r.day.slice(0, 7);
      if (!map.has(ym)) map.set(ym, []);
      map.get(ym)!.push(r);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map<MonthBucket>(([ym, items]) => {
        let totalSteps = 0, totalKm = 0, totalCalories = 0;
        for (const it of items) {
          totalSteps += Number(it.steps || 0);
          totalKm += Number(it.distanceKm || 0);
          totalCalories += Number(it.caloriesOut || 0);
        }
        return {
          ym,
          items: items.sort((a, b) => a.day.localeCompare(b.day)),
          totalSteps,
          totalKm: Math.round(totalKm * 100) / 100,
          totalCalories: Math.round(totalCalories),
        };
      });
  }, [rows]);

  return { rows, months, loading, error };
}
