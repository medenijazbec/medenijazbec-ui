import { http } from '@/api/api'
import type { AnimationGroup } from '@/types/domain'

export type SaveGroupRequest = {
  title: string
  slug?: string
  description?: string
  tagsJson?: string
  published: boolean
  category?: string
  isDefaultForCategory?: boolean

  items: { fileName: string; label?: string | null }[]
}

export const animgroups = {
  list: (publishedOnly = false) =>
    http.get<Array<{ id: number; slug: string; title: string; published: boolean; category: string; isDefaultForCategory: boolean; items: number; updatedAt: string }>>(
      '/api/animgroups', { publishedOnly }
    ),

  get: (idOrSlug: string | number) =>
    http.get<AnimationGroup>(`/api/animgroups/${idOrSlug}`),

  byCategory: (category: string, publishedOnly = true) =>
    http.get<AnimationGroup[]>(`/api/animgroups/by-category/${encodeURIComponent(category)}`, { publishedOnly }),

  defaultByCategory: (category: string) =>
    http.get<AnimationGroup>(`/api/animgroups/default`, { category }),

  randomByCategory: (category: string) =>
    http.get<AnimationGroup>(`/api/animgroups/random`, { category }),

  create: (req: SaveGroupRequest) =>
    http.post<AnimationGroup>('/api/animgroups', req),

  update: (id: number, req: SaveGroupRequest) =>
    http.put<void>(`/api/animgroups/${id}`, req),

  remove: (id: number) =>
    http.del<void>(`/api/animgroups/${id}`),
}
