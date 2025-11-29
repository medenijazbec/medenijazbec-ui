// src/components/pages/LiveTrading/CouncilComponent/council.logic.ts

import {
  liveTrading,
  type CouncilRecommendationDto,
  type CouncilDecisionRequest,
  formatUtc as formatUtcFromController,
} from "@/controllers/liveTrading";

export type { CouncilRecommendationDto, CouncilDecisionRequest };

export type RecommendationStatus =
  | "PENDING_USER"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | string;

/**
 * Re-export formatter so CouncilPanel can use it.
 */
export const formatUtc = formatUtcFromController;

/**
 * Fetch latest PENDING_USER recommendation.
 * If ownerUserId is omitted, backend will use the default/admin owner id.
 */
export async function fetchLatestCouncilRecommendation(
  ownerUserId?: number | null,
): Promise<CouncilRecommendationDto | null> {
  return liveTrading.latestCouncilRecommendation(ownerUserId);
}

/**
 * Post user decision back to council + strategy_signals.
 */
export async function postCouncilDecision(
  recommendationId: number,
  body: CouncilDecisionRequest,
): Promise<void> {
  await liveTrading.councilDecision(recommendationId, body);
}
