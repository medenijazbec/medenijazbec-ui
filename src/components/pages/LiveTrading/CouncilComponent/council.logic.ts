// src/components/pages/LiveTrading/CouncilComponent/council.logic.ts

import {
  liveTrading,
  type CouncilOfferDto,
  type CouncilDecisionRequest,
  type CouncilSoldRequest,
  type RecommendationStatus,
  formatUtc as formatUtcFromController,
} from "@/controllers/liveTrading";

export type { CouncilOfferDto, CouncilDecisionRequest, CouncilSoldRequest, RecommendationStatus };

// Re-export formatter so CouncilPanel can use it.
export const formatUtc = formatUtcFromController;

export const councilApi = {
  fetchActive: (ownerUserId?: number | null) =>
    liveTrading.councilActiveOffers(ownerUserId),
  fetchAccepted: (ownerUserId?: number | null) =>
    liveTrading.councilAcceptedOffers(ownerUserId),
  fetchHistory: (ownerUserId?: number | null, hours = 24) =>
    liveTrading.councilHistory(ownerUserId, hours),
  accept: (id: number, body: CouncilDecisionRequest) =>
    liveTrading.councilAccept(id, body),
  reject: (id: number, body: CouncilDecisionRequest) =>
    liveTrading.councilReject(id, body),
  sold: (id: number, body: CouncilSoldRequest) =>
    liveTrading.councilSold(id, body),
};
