// controllers/admin.ts
import { http } from "@/api/api";

export type TopIp = {
  id: number;
  day: string;
  ip: string;
  count: number;
  rank: number;
  country?: string | null;
  asn?: string | null;
};

export type Overview = {
  totalUsers: number;
  req24h: number;
  err5xx24h: number;
  uniqueIpsToday: number;
  topIpToday?: TopIp | null;
  authProviderHealth: {
    status: "ok" | "degraded" | "down";
    lastOutageUtc?: string | null;
  };
};

export const admin = {
  overview: () =>
    http.get<Overview>("/api/admin/stats/overview"),

  rps: (fromUtc?: string, toUtc?: string) =>
    http.get<
      Array<{
        t: string;
        requests: number;
        p50: number;
        p95: number;
        p99: number;
        errors: number;
      }>
    >("/api/admin/stats/rps", { fromUtc, toUtc }),

  topIps: (dayIso?: string) =>
    http.get<{ day: string; top: TopIp[] }>(
      "/api/admin/traffic/top-ips",
      dayIso ? { day: dayIso } : undefined
    ),

  recentLogs: (take = 200) =>
    http.get<
      Array<{
        startedUtc: string;
        method: string;
        path: string;
        statusCode: number;
        durationMs: number;
        ip: string;
        userAgent: string;
        userId?: string | null;
      }>
    >("/api/admin/traffic/recent", { take }),

  statusSplit: (fromUtc: string, toUtc: string) =>
    http.get<
      Array<{ bucket: string; count: number }>
    >("/api/admin/traffic/status-split", {
      fromUtc,
      toUtc,
    }),

  allAccounts: () =>
    http.get<
      Array<{
        id: string;
        email: string;
        userName: string;
        createdAt: string;
        updatedAt: string;
        roles: string[];
        sessions: { last?: string | null; count: number };
      }>
    >("/api/admin/accounts/all"),

  adminLastSession: (adminId?: string) =>
    http.get<any>(
      "/api/admin/accounts/admin-last-session",
      adminId ? { adminId } : undefined
    ),

  listBans: () =>
    http.get<
      Array<{
        id: number;
        value: string;
        reason?: string | null;
        expiresUtc?: string | null;
        createdUtc: string;
      }>
    >("/api/admin/security/ip-bans"),

  banIp: (value: string, reason?: string, expiresUtc?: string) =>
    http.post("/api/admin/security/ip-bans", {
      value,
      reason,
      expiresUtc,
    }),

  unban: (id: number) =>
    http.del(`/api/admin/security/ip-bans/${id}`),
};
