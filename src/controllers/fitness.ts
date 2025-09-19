import { http } from '@/api/api';
import type { FitnessDaily, ExerciseSession } from '@/types/domain';

export const fitness = {
  daily: {
    list: (userId: string) => http.get<FitnessDaily[]>(`/api/fitness/daily`, { userId }),
    upsert: (row: Partial<FitnessDaily>) => http.post<FitnessDaily>(`/api/fitness/daily`, row),
    
    fillMissing: (userId: string, from?: string, to?: string) =>
      http.post<{ inserted: number; from: string; to: string }>(`/api/fitness/daily/fill-missing`, {
        userId, from, to
      }),
  },
  sessions: {
    list: (userId: string) => http.get<ExerciseSession[]>(`/api/fitness/sessions`, { userId }),
    create: (s: Partial<ExerciseSession>) => http.post<ExerciseSession>(`/api/fitness/sessions`, s),
  },
};
