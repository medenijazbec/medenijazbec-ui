import { http } from '@/api/api';
import type { User } from '@/types/domain';


export const users = {
get: (id: string) => http.get<User>(`/api/users/${id}`),
search: (q: string) => http.get<User[]>(`/api/users`, { q }),
};