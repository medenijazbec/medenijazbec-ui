import { http } from '@/api/api'
import type { Project } from '@/types/domain'

export const projects = {
  list: () => http.get<Project[]>(`/api/projects`),
  get: (id: number) => http.get<Project>(`/api/projects/${id}`),
  create: (p: Partial<Project>) => http.post<Project>(`/api/projects`, p),
  update: (id: number, p: Partial<Project>) => http.put<Project>(`/api/projects/${id}`, p),
  remove: (id: number) => http.del<void>(`/api/projects/${id}`),
}
