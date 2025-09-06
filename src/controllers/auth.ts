import { http } from '@/api/api';
import type { User } from '@/types/domain';


export const auth = {
me: () => http.get<User>('/api/auth/me'),
login: (email: string, password: string) => http.post<{ token: string; user: User }>('/api/auth/login', { email, password }),
register: (email: string, userName: string, password: string) => http.post<User>('/api/auth/register', { email, userName, password }),
logout: () => http.post<void>('/api/auth/logout'),
};