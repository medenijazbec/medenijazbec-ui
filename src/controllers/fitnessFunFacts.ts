// src/controllers/fitnessFunFacts.ts
import { http } from '@/api/api';
import type { FunFactsResponse } from '@/types/fitnessFunFacts';

export const fitnessFunFacts = {
  get: (params: {
    userId: string;
    from?: string;
    to?: string;
    includeSynthetic?: true;
    streakThreshold1?: number;
    streakThreshold2?: number;
  }) => http.get<FunFactsResponse>('/api/fitness/fun-facts', params),
};
