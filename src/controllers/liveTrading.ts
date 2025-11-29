// src/controllers/liveTrading.ts

import { http } from "@/api/api";

// ----------------- SHARED TYPES -----------------

export type WorkerMode = "PAPER" | "LIVE";

export type WorkerSummaryDto = {
  id: number;
  name: string;
  strategyName: string;
  mode: WorkerMode | string;
  /**
   * 1 = enabled / used, 0 = disabled (do not show in UI).
   */
  isActive: boolean;
  /**
   * true = trading paused, false = trading active.
   */
  isTradingPaused?: boolean;
  initialCapital: number;
  ownerUserId?: string | null;
  latestEquity?: number | null;
  latestCash?: number | null;
  latestStatsAtUtc?: string | null;

  // Optional: win-rate stats for worker, if backend exposes them
  successRatePct?: number | null;
  tradesSampleCount?: number | null;
};

export type RecommendationStatus =
  | "PENDING_USER"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | string;

export interface CouncilRecommendationDto {
  recommendationId: number;
  signalId: number;

  workerId: number;
  workerName: string;
  strategyName: string;

  symbolId: number;
  symbol: string;
  symbolName?: string | null;

  timeframeId: number;
  timeframeCode: string;
  timeframeMinutes: number;

  side: "BUY" | "SELL" | string;
  suggestedPrice: number;
  sizeValue: number;
  stopLoss?: number | null;
  takeProfit?: number | null;

  expectedReturnPct?: number | null;
  expectedProfitValue?: number | null;
  confidence?: number | null;

  signalCreatedAtUtc?: string | null;
  signalValidUntilUtc?: string | null;
  createdAtUtc: string;

  latestCandleOpenTimeUtc?: string | null;

  userTotalEquity?: number | null;
  userCashAvailable?: number | null;
  userCapitalInPositions?: number | null;

  recommendationStatus: RecommendationStatus;

  // success % for this worker + method (strategy)
  workerSuccessRatePct?: number | null;
  workerTradesSampleCount?: number | null;
  strategySuccessRatePct?: number | null;
  strategyTradesSampleCount?: number | null;
}

export interface CouncilDecisionRequest {
  /**
   * MUST be "ACCEPT" or "REJECT" for the C# backend.
   */
  decision: "ACCEPT" | "REJECT" | string;
  decisionNote?: string;
  userTotalEquity?: number;
  userCashAvailable?: number;
  userCapitalInPositions?: number;
}

export interface ResetWorkerDailyRequest {
  newDailyCapital?: number;
  resetNote?: string;
}

// ----------------- SMALL HELPERS -----------------

export function formatUtc(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ----------------- LIVE TRADING API -----------------

/**
 * Trading dashboard / live trading endpoints.
 * NOTE: we now use /api/Workers and /api/Council/* controllers.
 */
export const liveTrading = {
  // ---------- Workers ----------

  workersList: () => http.get<WorkerSummaryDto[]>("/api/Workers"),

  setWorkerMode: (workerId: number, mode: WorkerMode) =>
    http.put<void>(`/api/Workers/${workerId}/mode`, { mode }),

  /**
   * Toggle trading active/paused for a worker with IsActive = 1.
   */
  setWorkerActive: (workerId: number, isActive: boolean) =>
    http.put<void>(`/api/Workers/${workerId}/active`, {
      isActive,
    }),

  setWorkerDailyCapital: (workerId: number, dailyCapital: number) =>
    http.put<void>(`/api/Workers/${workerId}/daily-capital`, {
      dailyCapital,
    }),

  resetWorkerDaily: (workerId: number, payload: ResetWorkerDailyRequest) =>
    http.post<void>(`/api/Workers/${workerId}/reset-daily`, payload),

  // ---------- Council ----------

  latestCouncilRecommendation: async (
    ownerUserId?: number | null,
  ): Promise<CouncilRecommendationDto | null> => {
    const params = new URLSearchParams();
    if (ownerUserId != null) {
      params.set("ownerUserId", String(ownerUserId));
    }

    try {
      return await http.get<CouncilRecommendationDto>(
        `/api/Council/recommendation${
          params.toString() ? `?${params.toString()}` : ""
        }`,
      );
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  councilDecision: (recommendationId: number, body: CouncilDecisionRequest) =>
    http.post<void>(
      `/api/Council/recommendation/${recommendationId}/decision`,
      body,
    ),
};
