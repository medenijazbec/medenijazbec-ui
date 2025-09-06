// src/lib/env.ts

type Boolish = string | boolean | undefined | null;

const toBool = (v: Boolish, def = false) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['1', 'true', 'yes', 'y', 'on'].includes(s)) return true;
    if (['0', 'false', 'no', 'n', 'off'].includes(s)) return false;
  }
  return def;
};

// Read from Vite env (with dev defaults matching your setup)
const RAW_API_URL = (import.meta as any).env?.VITE_API_URL ?? 'https://localhost:7268';
const RAW_WS_URL  = (import.meta as any).env?.VITE_WS_URL  ?? 'https://localhost:7268/animhub';
const RAW_PREVIEW = (import.meta as any).env?.VITE_CLIENT_FBX_PREVIEW ?? 'false';

export const env = {
  // strip trailing slashes from API base to avoid double-// in fetch paths
  API_URL: String(RAW_API_URL).replace(/\/+$/, ''),
  WS_URL: String(RAW_WS_URL), // keep as-is (may end with /animhub)
  CLIENT_FBX_PREVIEW: toBool(RAW_PREVIEW, false),
} as const;

export default env; // allows `import env from '@/lib/env'`
