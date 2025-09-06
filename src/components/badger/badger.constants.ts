// Where animations are served from (Vite serves /public at '/')
const ENV = (import.meta as any).env ?? {};

const bool = (v: any, d = false) =>
  typeof v === "boolean" ? v :
  typeof v === "string" ? /^(1|true|yes|on|y)$/i.test(v) : d;

export const ANIM_DIR: string =
  (ENV.VITE_ANIM_DIR as string) ?? "/models/Animations/";

// Feature toggles
export const SCAN_ANIM_DIR = bool(ENV.VITE_SCAN_ANIM_DIR, true);     // scrape folder if no manifest
export const PREFETCH_ANIMS = bool(ENV.VITE_PREFETCH_ANIMS, false);  // idle prefetch GLBs
export const USE_DRACO      = bool(ENV.VITE_USE_DRACO, true);

// Draco decoder location (must end with '/')
export const DRACO_DECODER_PATH: string =
  ((ENV.VITE_DRACO_DECODER_PATH as string) ?? "https://www.gstatic.com/draco/v1/decoders/")
    .replace(/(?<!\/)$/, "/");

export const ALLOWED_EXTS = [".glb", ".gltf"] as const;
export const ASCII_CHARSET = " .,:;-~+=*#%@";

export const LABELS = {
  pause: "Pause",
  play: "Play",
  ttOn: "Turntable",
  ttOff: "No Turntable",
  lightOn: "Light",
  lightOff: "Light (stopped)",
};

// Used only if there’s no manifest and scanning is disabled/empty
export const FALLBACK_CLIPS: string[] = [
  // "Idle.glb",
  // "Walking.glb",
];
