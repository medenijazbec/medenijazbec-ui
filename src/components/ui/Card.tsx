import type { PropsWithChildren } from 'react';
export function Card({ children }: PropsWithChildren) {
return <div className="p-3 rounded border border-emerald-400/40 bg-[#071a14]/80 shadow-[0_0_18px_rgba(16,185,129,.35)]">{children}</div>;
}