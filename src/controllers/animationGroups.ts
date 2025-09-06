import { http } from '@/api/api'
import type { AnimationGroup } from '@/types/domain'

export type SaveGroupRequest = {
  title: string
  slug?: string
  description?: string
  tagsJson?: string
  published: boolean
  items: { fileName: string; label?: string | null }[]
}

export const animgroups = {
  list: (publishedOnly = false) =>
    http.get<Array<{ id: number; slug: string; title: string; published: boolean; items: number; updatedAt: string }>>(
      '/api/animgroups', { publishedOnly }
    ),
  get: (idOrSlug: string | number) =>
    http.get<AnimationGroup>(`/api/animgroups/${idOrSlug}`),

  create: (req: SaveGroupRequest) =>
    http.post<AnimationGroup>('/api/animgroups', req),

  update: (id: number, req: SaveGroupRequest) =>
    http.put<void>(`/api/animgroups/${id}`, req),

  remove: (id: number) =>
    http.del<void>(`/api/animgroups/${id}`),
}
