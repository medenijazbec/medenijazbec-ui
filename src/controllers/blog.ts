import { http } from '@/api/api';
import type { BlogPost, BlogTag } from '@/types/domain';


export const blog = {
list: () => http.get<BlogPost[]>(`/api/blog-posts`),
get: (id: number) => http.get<BlogPost>(`/api/blog-posts/${id}`),
create: (p: Partial<BlogPost>) => http.post<BlogPost>(`/api/blog-posts`, p),
update: (id: number, p: Partial<BlogPost>) => http.put<BlogPost>(`/api/blog-posts/${id}`, p),
remove: (id: number) => http.del<void>(`/api/blog-posts/${id}`),
tags: {
list: () => http.get<BlogTag[]>(`/api/blog-tags`),
},
};