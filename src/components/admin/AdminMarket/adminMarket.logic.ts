import { useEffect, useMemo, useState } from "react";
import { adminMarket, type EtlOverview } from "@/controllers/adminMarket";

export function useEtlOverview() {
  const [data, setData] = useState<EtlOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const res = await adminMarket.overview();
        if (!abort) setData(res);
      } catch (e: any) {
        if (!abort) setErr(e?.message ?? "load failed");
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    const t = setInterval(() => {
      adminMarket.overview().then(r => !abort && setData(r)).catch(()=>{});
    }, 10_000); // 10s “near real-time”
    return () => { abort = true; clearInterval(t); };
  }, []);

  return { data, loading, err };
}

export function useTopCounts() {
  const [rows, setRows] = useState<Array<{symbol:string; total:number}>>([]);
  useEffect(() => {
    let abort = false;
    (async () => {
      const r = await adminMarket.countsByCompany(); if (!abort) setRows(r);
    })();
    const t = setInterval(() => adminMarket.countsByCompany().then(r=>!abort && setRows(r)).catch(()=>{}), 15000);
    return () => { abort = true; clearInterval(t); };
  }, []);
  return rows;
}
