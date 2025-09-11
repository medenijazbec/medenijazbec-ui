import React from "react";

export default function Sparkline({ points, w=180, h=44 }: { points: number[]; w?: number; h?: number }) {
  const max = Math.max(1, ...points);
  const path = points.map((v, i) => {
    const x = (i/(points.length-1)) * (w-2) + 1;
    const y = h - 2 - (v/max) * (h-4);
    return `${i===0?"M":"L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.9"/>
    </svg>
  );
}
