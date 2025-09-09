import { http } from '@/api/api'
import type { Project } from '@/types/domain'

export const projects = {
  list: (params?: { kind?: 'software'|'hardware'; includeUnpublished?: boolean }) =>
    http.get<Project[]>(`/api/projects`, params),
  get: (slug: string) => http.get<Project>(`/api/projects/${slug}`),
  create: (p: Partial<Project>) => http.post<Project>(`/api/projects`, p),
  update: (id: number, p: Partial<Project>) => http.put<Project>(`/api/projects/${id}`, p),
  remove: (id: number) => http.del<void>(`/api/projects/${id}`),
};
