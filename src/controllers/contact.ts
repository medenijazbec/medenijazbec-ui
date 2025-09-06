import { http } from '@/api/api';
import type { ContactInquiry } from '@/types/domain';


export const contact = {
submit: (p: Omit<ContactInquiry, 'id'|'status'|'createdAt'|'updatedAt'>) => http.post<ContactInquiry>(`/api/contact`, p),
list: () => http.get<ContactInquiry[]>(`/api/contact`),
updateStatus: (id: number, status: ContactInquiry['status']) => http.patch<ContactInquiry>(`/api/contact/${id}/status`, { status }),
};