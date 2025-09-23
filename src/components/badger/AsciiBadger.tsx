// path: honey_badger_ui/src/components/badger/AsciiBadgerPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AsciiBadger } from "./badger.logic";
import styles from "./AsciiBadger.module.css";
import { ALLOWED_EXTS, ANIM_DIR, PREFETCH_ANIMS } from "./badger.constants";
import { politePrefetch } from "@/lib/prefetch";
import { animgroups } from "@/controllers/animationGroups";
import { http } from "@/api/api";
import { useAuth } from "@/components/auth/AuthContext";

const PAGE_LOAD_CATEGORY = "page-load";
const KICK_SLUG = "kick-the-badger";
const allowed = (n: string) => ALLOWED_EXTS.some(ext => n.toLowerCase().endsWith(ext));
const pickOne = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

type Settings = {
  offsetY: number;
  saucerOffsetY?: number;
  lightYaw: number;
  lightHeight: number;
  lightDist: number;
  modelZoom?: number;
  saucerZoom?: number;
  cameraZoom?: number;
};

const DEFAULTS: Required<Settings> = {
  offsetY: 0,
  saucerOffsetY: 0,
  lightYaw: 0,
  lightHeight: 120,
  lightDist: 200,
  modelZoom: 1,
  saucerZoom: 1,
  cameraZoom: 1,
};

const AsciiBadgerPage: React.FC = () => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [core, setCore] = useState<AsciiBadger | null>(null);
  const { isAdmin } = useAuth();

  // chosen idle (loop forever)
  const idleRef = useRef<string | null>(null);
  const kickFilesRef = useRef<string[]>([]);
  const fallbackKicksRef = useRef<string[]>([]);

  // UI state (no autosave)
  const [offsetY, setOffsetY] = useState(DEFAULTS.offsetY);
  const [saucerY, setSaucerY] = useState(DEFAULTS.saucerOffsetY);
  const [lightYaw, setLightYaw] = useState(DEFAULTS.lightYaw);
  const [lightHeight, setLightHeight] = useState(DEFAULTS.lightHeight);
  const [lightDist, setLightDist] = useState(DEFAULTS.lightDist);
  const [modelZoom, setModelZoom] = useState(DEFAULTS.modelZoom);
  const [saucerZoom, setSaucerZoom] = useState(DEFAULTS.saucerZoom);
  const [cameraZoom, setCameraZoom] = useState(DEFAULTS.cameraZoom);

  // Load server settings on mount
  useEffect(() => {
    (async () => {
      try {
        const s = await http.get<Settings>("/api/badger-settings");
        setOffsetY(Number(s.offsetY ?? DEFAULTS.offsetY));
        setSaucerY(Number(s.saucerOffsetY ?? DEFAULTS.saucerOffsetY));
        setLightYaw(Number(s.lightYaw ?? DEFAULTS.lightYaw));
        setLightHeight(Number(s.lightHeight ?? DEFAULTS.lightHeight));
        setLightDist(Number(s.lightDist ?? DEFAULTS.lightDist));
        setModelZoom(Number(s.modelZoom ?? DEFAULTS.modelZoom));
        setSaucerZoom(Number(s.saucerZoom ?? DEFAULTS.saucerZoom));
        setCameraZoom(Number(s.cameraZoom ?? DEFAULTS.cameraZoom));
      } catch { /* defaults */ }
    })();
  }, []);

  // Mount badger + preload groups
  useEffect(() => {
    if (!stageRef.current) return;
    const instance = new AsciiBadger(stageRef.current, undefined);
    setCore(instance);

    (async () => {
      try {
        const group = await animgroups.defaultByCategory(PAGE_LOAD_CATEGORY);
        const files = (group?.items ?? [])
          .map(i => i.fileName).filter(Boolean).filter(allowed);
        if (files.length) {
          idleRef.current = pickOne(files);
          if (PREFETCH_ANIMS) politePrefetch([`${ANIM_DIR}${idleRef.current}`], { maxConcurrency: 1 });
          await instance.loadClipPath(idleRef.current, { loopForever: true });
        }
      } catch {}

      try {
        const kick = await animgroups.get(KICK_SLUG);
        kickFilesRef.current = (kick?.items ?? [])
          .map(i => i.fileName).filter(Boolean).filter(allowed);
        if (PREFETCH_ANIMS && kickFilesRef.current.length) {
          politePrefetch(kickFilesRef.current.map(f => `${ANIM_DIR}${f}`), { maxConcurrency: 3 });
        }
      } catch {}

      try {
        const names = await instance.listAnimations();
        const pattern = /(kick|hit|punch|attack|strike)/i;
        fallbackKicksRef.current = names.filter(n => pattern.test(n));
      } catch {}
    })();

    const onClick = () => {
      const idle = idleRef.current;
      const kicks = kickFilesRef.current.length ? kickFilesRef.current : fallbackKicksRef.current;
      if (!idle || !kicks.length) return;
      const kick = pickOne(kicks);
      instance.playQueue([
        { file: kick, opts: { loopOnce: true, fallbackMs: 1200 } },
        { file: idle, opts: { loopForever: true } },
      ]);
    };

    const el = stageRef.current;
    el.addEventListener("click", onClick);
    return () => {
      el.removeEventListener("click", onClick);
      instance.dispose();
    };
  }, []);

  // Push current state to scene
  useEffect(() => {
    if (!core) return;
    core.setModelOffsetY(offsetY);
    core.setSaucerOffsetY(saucerY);
    core.setLightYawDegrees(lightYaw);
    core.setLightHeight(lightHeight);
    core.setLightDistance(lightDist);
    core.setModelZoom(modelZoom);
    core.setSaucerZoom(saucerZoom);
    core.setCameraZoom(cameraZoom);
  }, [core, offsetY, saucerY, lightYaw, lightHeight, lightDist, modelZoom, saucerZoom, cameraZoom]);

  // Controls
  const [, setTick] = useState(0);
  const force = () => setTick(t => t + 1);
  const labels = useMemo(
    () => core?.ui ?? {
      playPauseLabel: () => "Pause",
      turntableLabel: () => "Turntable",
      lightLabel: () => "Light",
    },
    [core]
  );

  type SaveState = "idle" | "saving" | "saved" | "error";
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // Manual save (admin only)
  const saveAll = async () => {
    if (!isAdmin) return;
    setSaveState("saving");
    try {
      await http.post("/api/badger-settings", {
        offsetY,
        saucerOffsetY: saucerY,
        lightYaw,
        lightHeight,
        lightDist,
        modelZoom,
        saucerZoom,
        cameraZoom,
      } satisfies Settings);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1100);
    } catch {
      setSaveState("error");
    }
  };

  const onPlayPause = () => { core?.togglePlay();      force(); };
  const onTurntable = () => { core?.toggleTurntable(); force(); };
  const onLightSpin = () => { core?.toggleLightSpin(); force(); };

  // Range helpers that store as numbers (integers for Y, floats/100 for zooms)
  const sliderInt = (e: React.ChangeEvent<HTMLInputElement>) => parseInt(e.currentTarget.value, 10);
  const sliderZoom = (e: React.ChangeEvent<HTMLInputElement>) => parseInt(e.currentTarget.value, 10) / 100;

  return (
    <div className={styles.root} style={{ display: "flex", width: "100%", height: "100dvh", minHeight: 0 }}>

      {/* Left pane: admin-only controls (contained within half-width) */}
      {isAdmin ? (
        <div
          style={{
            flex: "0 0 50%",
            height: "100%",
            padding: 12,
            boxSizing: "border-box",
            borderRight: "1px solid rgba(16,185,129,.25)",
            overflow: "auto"
          }}
        >

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <button onClick={onPlayPause}>{labels.playPauseLabel()}</button>
            <button onClick={onTurntable}>{labels.turntableLabel()}</button>
            <button onClick={onLightSpin}>{labels.lightLabel()}</button>
            <button onClick={saveAll} style={{ marginLeft: "auto" }}>
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Save All"}
            </button>
          </div>

          {/* Positions */}
          <fieldset style={{ border: "1px solid rgba(16,185,129,.25)", borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <legend style={{ opacity: .85, fontSize: 12 }}>Positions</legend>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 60px", gap: 8, alignItems: "center" }}>
              <label>Badger Y</label>
              <input type="range" min={-120} max={240} value={offsetY}
                onChange={e => { const v = sliderInt(e); setOffsetY(v); core?.setModelOffsetY(v); }} />
              <span style={{ opacity: .85 }}>{offsetY}</span>

              <label>Saucer Y</label>
              <input type="range" min={-120} max={240} value={saucerY}
                onChange={e => { const v = sliderInt(e); setSaucerY(v); core?.setSaucerOffsetY(v); }} />
              <span style={{ opacity: .85 }}>{saucerY}</span>
            </div>
          </fieldset>

          {/* Lighting */}
          <fieldset style={{ border: "1px solid rgba(16,185,129,.25)", borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <legend style={{ opacity: .85, fontSize: 12 }}>Light</legend>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 60px", gap: 8, alignItems: "center" }}>
              <label>Light Yaw</label>
              <input type="range" min={0} max={360} value={lightYaw}
                onChange={e => { const v = sliderInt(e); setLightYaw(v); core?.setLightYawDegrees(v); }} />
              <span style={{ opacity: .85 }}>{lightYaw}°</span>

              <label>Light Height</label>
              <input type="range" min={40} max={300} value={lightHeight}
                onChange={e => { const v = sliderInt(e); setLightHeight(v); core?.setLightHeight(v); }} />
              <span style={{ opacity: .85 }}>{lightHeight}</span>

              <label>Light Dist</label>
              <input type="range" min={120} max={400} value={lightDist}
                onChange={e => { const v = sliderInt(e); setLightDist(v); core?.setLightDistance(v); }} />
              <span style={{ opacity: .85 }}>{lightDist}</span>
            </div>
          </fieldset>

          {/* Zoom & distance */}
          <fieldset style={{ border: "1px solid rgba(16,185,129,.25)", borderRadius: 8, padding: 10 }}>
            <legend style={{ opacity: .85, fontSize: 12 }}>Zoom</legend>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 60px", gap: 8, alignItems: "center" }}>
              <label>Model Zoom</label>
              <input type="range" min={50} max={200} step={1} value={Math.round(modelZoom * 100)}
                onChange={e => { const v = sliderZoom(e); setModelZoom(v); core?.setModelZoom(v); }} />
              <span style={{ opacity: .85 }}>{modelZoom.toFixed(2)}×</span>

              <label>Saucer Zoom</label>
              <input type="range" min={50} max={200} step={1} value={Math.round(saucerZoom * 100)}
                onChange={e => { const v = sliderZoom(e); setSaucerZoom(v); core?.setSaucerZoom(v); }} />
              <span style={{ opacity: .85 }}>{saucerZoom.toFixed(2)}×</span>

              <label>Camera Zoom</label>
              <input type="range" min={70} max={200} step={1} value={Math.round(cameraZoom * 100)}
                onChange={e => { const v = sliderZoom(e); setCameraZoom(v); core?.setCameraZoom(v); }} />
              <span style={{ opacity: .85 }}>{cameraZoom.toFixed(2)}×</span>
            </div>
          </fieldset>

          {/* Save status */}
          <div style={{ marginTop: 8, fontSize: 12, opacity: .85 }}>
            {saveState === "saving" && "Saving…"}
            {saveState === "saved" && "Saved ✓"}
            {saveState === "error" && "Save failed"}
          </div>
        </div>
      ) : null}

      {/* Right pane: stage (full width if not admin; half if admin) */}
      <div
        className={styles.stage}
        ref={stageRef}
        style={{
          flex: isAdmin ? "0 0 50%" : "1 1 auto",
          height: "100%",
          position: "relative",
          minHeight: 0
        }}

      />
    </div>
  );
};

export default AsciiBadgerPage;
