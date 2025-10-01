import { useEffect, useState } from "react";
import { adminMarket, type EtlOverview, type KeyInventoryRow, type BlockedKeyRow, type FairnessRow, type JobsOverviewRow, type WorkerHealth, type PriceFreshnessRow, type AlertsPayload } from "@/controllers/adminMarket";

export function useEtlOverview() {
  const [data, setData] = useState<EtlOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        setLoading(true);
        const res = await adminMarket.overview();
        if (!dead) setData(res);
      } catch (e: any) {
        if (!dead) setErr(e?.message ?? "load failed");
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    const t = setInterval(() => adminMarket.overview().then(r => !dead && setData(r)).catch(()=>{}), 10000);
    return () => { dead = true; clearInterval(t); };
  }, []);
  return { data, loading, err };
}

export function useTopCounts() {
  const [rows, setRows] = useState<Array<{symbol:string; total:number}>>([]);
  useEffect(() => {
    let dead = false;
    const run = () => adminMarket.countsByCompany().then(r => !dead && setRows(r)).catch(()=>{});
    run();
    const t = setInterval(run, 15000);
    return () => { dead = true; clearInterval(t); };
  }, []);
  return rows;
}

export function useKeyInventory() {
  const [rows, setRows] = useState<KeyInventoryRow[]>([]);
  useEffect(() => {
    let dead = false;
    const run = () => adminMarket.keyInventory().then(r => !dead && setRows(r)).catch(()=>{});
    run();
    const t = setInterval(run, 15000);
    return () => { dead = true; clearInterval(t); };
  }, []);
  return rows;
}

export function useBlockedKeys() {
  const [rows, setRows] = useState<BlockedKeyRow[]>([]);
  useEffect(() => {
    let dead = false;
    const run = () => adminMarket.keyBlocked().then(r => !dead && setRows(r)).catch(()=>{});
    run();
    const t = setInterval(run, 10000);
    return () => { dead = true; clearInterval(t); };
  }, []);
  return rows;
}

export function useFairness() {
  const [rows, setRows] = useState<FairnessRow[]>([]);
  useEffect(() => {
    let dead = false;
    const run = () => adminMarket.keyFairness(24).then(r => !dead && setRows(r)).catch(()=>{});
    run();
    const t = setInterval(run, 30000);
    return () => { dead = true; clearInterval(t); };
  }, []);
  return rows;
}

export function useJobsWorkers() {
  const [jobs, setJobs] = useState<JobsOverviewRow[]>([]);
  const [workers, setWorkers] = useState<WorkerHealth | null>(null);
  useEffect(() => {
    let dead = false;
    const run = async () => {
      try {
        const [j, w] = await Promise.all([adminMarket.jobsOverview(), adminMarket.workers()]);
        if (!dead) { setJobs(j); setWorkers(w); }
      } catch {}
    };
    run();
    const t = setInterval(run, 15000);
    return () => { dead = true; clearInterval(t); };
  }, []);
  return { jobs, workers };
}

export function usePrices() {
  const [rows, setRows] = useState<PriceFreshnessRow[]>([]);
  useEffect(() => {
    let dead = false;
    const run = () => adminMarket.prices().then(r => !dead && setRows(r)).catch(()=>{});
    run();
    const t = setInterval(run, 60000);
    return () => { dead = true; clearInterval(t); };
  }, []);
  return rows;
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertsPayload | null>(null);
  useEffect(() => {
    let dead = false;
    const run = () => adminMarket.alerts().then(a => !dead && setAlerts(a)).catch(()=>{});
    run();
    const t = setInterval(run, 20000);
    return () => { dead = true; clearInterval(t); };
  }, []);
  return alerts;
}
