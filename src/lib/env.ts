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

// Remove wrapping quotes and trim
const cleanStr = (v: unknown, def = '') => {
  const s = String(v ?? def).trim();
  const m = s.match(/^(['"])(.*)\1$/);
  return m ? m[2] : s;
};

// Read from Vite env (with dev defaults matching your setup)
const V = (import.meta as any).env ?? {};

const RAW_API_URL  = V.VITE_API_URL  ?? 'https://localhost:7268';
const RAW_WS_URL   = V.VITE_WS_URL   ?? 'https://localhost:7268/animhub';
const RAW_PREVIEW  = V.VITE_CLIENT_FBX_PREVIEW ?? 'false';

// present in your .env as well:
const RAW_SCAN_ANIM_DIR = V.VITE_SCAN_ANIM_DIR ?? 'false';
const RAW_ANIM_DIR      = V.VITE_ANIM_DIR ?? '/models/Animations/';

// 👇 NEW: public fitness user id for anonymous viewing
const RAW_PUBLIC_FITNESS_USER_ID = V.VITE_PUBLIC_FITNESS_USER_ID ?? '';

export const env = {
  // strip trailing slashes from API base to avoid double // in requests
  API_URL: cleanStr(RAW_API_URL).replace(/\/+$/, ''),
  WS_URL: cleanStr(RAW_WS_URL),
  CLIENT_FBX_PREVIEW: toBool(RAW_PREVIEW, false),

  // extras you already have in .env (safe to keep/export)
  SCAN_ANIM_DIR: toBool(RAW_SCAN_ANIM_DIR, false),
  ANIM_DIR: cleanStr(RAW_ANIM_DIR),

  // 👇 use this in ShealthHistoryModule.logic to avoid requiring login
  PUBLIC_FITNESS_USER_ID: cleanStr(RAW_PUBLIC_FITNESS_USER_ID),
} as const;

export default env; // allows `import env from '@/lib/env'`
