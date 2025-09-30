import { http } from '@/api/api';

export type EtlOverview = {
  companies: number;
  articlesGdelt: number;
  articlesExt: number;
  requestsTotal: number;
  jobs: number;
  perSource24h: Array<{ source: string; count: number; ok: number; bad: number }>;
};

export const adminMarket = {
  overview: () => http.get<EtlOverview>('/api/etl/overview'),
  jobs: (take = 100) => http.get<any[]>('/api/etl/jobs', { take }),
  requests: (take = 200) => http.get<any[]>('/api/etl/requests', { take }),
  keys: () => http.get<any[]>('/api/etl/keys'),
  countsByCompany: () => http.get<Array<{ symbol: string; total: number }>>('/api/etl/counts'),
};
