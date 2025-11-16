import { useEffect, useState } from "react";
import {
  adminMarket,
  type WatchdogOverview,
  type WatchdogCleanupStats,
} from "@/controllers/adminMarket";

export function useWatchdogOverview() {
  const [data, setData] = useState<WatchdogOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;

    const run = async () => {
      try {
        setLoading(true);
        const res = await adminMarket.watchdogOverview();
        if (!dead) {
          setData(res);
          setErr(null);
        }
      } catch (e: any) {
        if (!dead) {
          setErr(e?.message ?? "load failed");
        }
      } finally {
        if (!dead) setLoading(false);
      }
    };

    // initial fetch
    run();

    // small poll; tweak interval if you like
    const t = setInterval(run, 15000);

    return () => {
      dead = true;
      clearInterval(t);
    };
  }, []);

  return { data, loading, err };
}

export function useWatchdogCleanup() {
  const [data, setData] = useState<WatchdogCleanupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;

    const run = async () => {
      try {
        setLoading(true);
        const res = await adminMarket.watchdogCleanup();
        if (!dead) {
          setData(res);
          setErr(null);
        }
      } catch (e: any) {
        if (!dead) {
          setErr(e?.message ?? "load failed");
        }
      } finally {
        if (!dead) setLoading(false);
      }
    };

    // initial fetch
    run();

    // poll less frequently (cleanup stats don't change every second)
    const t = setInterval(run, 60000);

    return () => {
      dead = true;
      clearInterval(t);
    };
  }, []);

  return { data, loading, err };
}
