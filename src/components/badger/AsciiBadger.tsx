import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./AsciiBadger.module.css";
import { AsciiBadger } from "./badger.logic";
import { ALLOWED_EXTS, ANIM_DIR, PREFETCH_ANIMS } from "./badger.constants";
import { politePrefetch } from "@/lib/prefetch";
import { animgroups } from "@/controllers/animationGroups";
import { http } from "@/api/api";
import { useAuth } from "@/components/auth/AuthContext";

const PAGE_LOAD_CATEGORY = "page-load";
const KICK_SLUG = "kick-the-badger";

const allowed = (n: string) => ALLOWED_EXTS.some(ext => n.toLowerCase().endsWith(ext));
const pickOne = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

type Settings = { offsetY: number; lightYaw: number; lightHeight: number; lightDist: number };
const DEFAULTS: Settings = { offsetY: 0, lightYaw: 0, lightHeight: 120, lightDist: 200 };

const AsciiBadgerPage: React.FC = () => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [core, setCore] = useState<AsciiBadger | null>(null);
  const { isAdmin } = useAuth(); // your existing auth context

  // chosen idle on page load (loop forever)
  const idleRef = useRef<string | null>(null);
  // available combat clips from group
  const kickFilesRef = useRef<string[]>([]);
  // fallback combat clips discovered from disk if groups are missing/empty
  const fallbackKicksRef = useRef<string[]>([]);

  // local UI state for manual controls (loaded from server)
  const [offsetY, setOffsetY] = useState(DEFAULTS.offsetY);
  const [lightYaw, setLightYaw] = useState(DEFAULTS.lightYaw);
  const [lightHeight, setLightHeight] = useState(DEFAULTS.lightHeight);
  const [lightDist, setLightDist] = useState(DEFAULTS.lightDist);

  // Everyone: load shared settings on mount
  useEffect(() => {
    (async () => {
      try {
        const s = await http.get<Settings>("/api/badger-settings");
        setOffsetY(Number(s.offsetY ?? DEFAULTS.offsetY));
        setLightYaw(Number(s.lightYaw ?? DEFAULTS.lightYaw));
        setLightHeight(Number(s.lightHeight ?? DEFAULTS.lightHeight));
        setLightDist(Number(s.lightDist ?? DEFAULTS.lightDist));
      } catch {
        // ignore if not available; defaults apply
      }
    })();
  }, []);

  useEffect(() => {
    if (!stageRef.current) return;

    const instance = new AsciiBadger(stageRef.current, undefined);
    setCore(instance);

    (async () => {
      // pick ONE idle from page-load group and loop forever
      try {
        const group = await animgroups.defaultByCategory(PAGE_LOAD_CATEGORY);
        const files = (group?.items ?? [])
          .map(i => i.fileName)
          .filter(Boolean)
          .filter(allowed);

        if (files.length) {
          idleRef.current = pickOne(files);
          if (PREFETCH_ANIMS) politePrefetch([`${ANIM_DIR}${idleRef.current}`], { maxConcurrency: 1 });
          await instance.loadClipPath(idleRef.current, { loopForever: true });
        }
      } catch { /* ignore */ }

      // preload kick group list
      try {
        const kick = await animgroups.get(KICK_SLUG);
        kickFilesRef.current = (kick?.items ?? [])
          .map(i => i.fileName)
          .filter(Boolean)
          .filter(allowed);

        if (PREFETCH_ANIMS && kickFilesRef.current.length) {
          politePrefetch(kickFilesRef.current.map(f => `${ANIM_DIR}${f}`), { maxConcurrency: 3 });
        }
      } catch { /* ignore */ }

      // discover animations as a fallback for clicks (kick/hit/punch/attack)
      try {
        const names = await instance.listAnimations();
        const pattern = /(kick|hit|punch|attack|strike)/i;
        fallbackKicksRef.current = names.filter(n => pattern.test(n));
      } catch { /* ignore */ }
    })();

    // click → random kick once → back to previously-chosen idle forever (with fallback)
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

  // Apply current state to scene whenever state or core changes
  useEffect(() => {
    if (!core) return;
    core.setModelOffsetY(offsetY);
    core.setLightYawDegrees(lightYaw);
    core.setLightHeight(lightHeight);
    core.setLightDistance(lightDist);
  }, [core, offsetY, lightYaw, lightHeight, lightDist]);

  // minimal controls (no clip dropdown, no open file, no status)
  const [, setTick] = useState(0);
  const force = () => setTick(t => t + 1);
  const labels = useMemo(
    () =>
      core?.ui ?? {
        playPauseLabel: () => "Pause",
        turntableLabel: () => "Turntable",
        lightLabel: () => "Light",
      },
    [core]
  );

  type SaveState = "idle" | "saving" | "saved" | "error";
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const save = async (payload: Partial<Settings> = {}) => {
    if (!isAdmin) return;                 // non-admins never write
    setSaveState("saving");
    try {
      const body = { offsetY, lightYaw, lightHeight, lightDist, ...payload };
      await http.post("/api/badger-settings", body);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1000);
    } catch {
      setSaveState("error");
    }
  };

  const onPlayPause  = () => { core?.togglePlay();      force(); };
  const onTurntable  = () => { core?.toggleTurntable(); force(); };
  const onLightSpin  = () => { core?.toggleLightSpin(); force(); };

  // hook up manual controls (also persist when admin)
  const setBadgerY = (v: number) => {
    setOffsetY(v);
    core?.setModelOffsetY(v);
    if (isAdmin) save({ offsetY: v });
  };
  const setYaw = (v: number) => {
    setLightYaw(v);
    core?.setLightYawDegrees(v);    // disables spin
    if (isAdmin) save({ lightYaw: v });
  };
  const setH = (v: number) => {
    setLightHeight(v);
    core?.setLightHeight(v);        // disables spin
    if (isAdmin) save({ lightHeight: v });
  };
  const setD = (v: number) => {
    setLightDist(v);
    core?.setLightDistance(v);      // disables spin
    if (isAdmin) save({ lightDist: v });
  };

  return (
    <div className={styles.root}>
      {/* HUD: buttons + sliders (ADMIN ONLY) */}
      {isAdmin ? (
        <div className={styles.hud}>
          <button onClick={onPlayPause}>{labels.playPauseLabel()}</button>
          <button onClick={onTurntable}>{labels.turntableLabel()}</button>
          <button onClick={onLightSpin}>{labels.lightLabel()}</button>

          {/* Manual positioning */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 8 }}>
            <label style={{ fontSize: 12, opacity: .85 }}>Badger&nbsp;Y</label>
            <input
              type="range" min={-120} max={240} value={offsetY}
              onChange={e => setBadgerY(parseInt(e.currentTarget.value, 10))}
            />

            <label style={{ fontSize: 12, opacity: .85 }}>Light&nbsp;Yaw</label>
            <input
              type="range" min={0} max={360} value={lightYaw}
              onChange={e => setYaw(parseInt(e.currentTarget.value, 10))}
            />

            <label style={{ fontSize: 12, opacity: .85 }}>Light&nbsp;H</label>
            <input
              type="range" min={40} max={300} value={lightHeight}
              onChange={e => setH(parseInt(e.currentTarget.value, 10))}
            />

            <label style={{ fontSize: 12, opacity: .85 }}>Light&nbsp;Dist</label>
            <input
              type="range" min={120} max={400} value={lightDist}
              onChange={e => setD(parseInt(e.currentTarget.value, 10))}
            />

            {/* Reset buttons */}
            <button
              onClick={() => {
                const v = DEFAULTS.offsetY;
                setOffsetY(v);
                core?.setModelOffsetY(v);
                save({ offsetY: v });
              }}
            >
              Reset&nbsp;Y
            </button>

            <button
              onClick={() => {
                const next = {
                  lightYaw: DEFAULTS.lightYaw,
                  lightHeight: DEFAULTS.lightHeight,
                  lightDist: DEFAULTS.lightDist,
                };
                setLightYaw(next.lightYaw);
                setLightHeight(next.lightHeight);
                setLightDist(next.lightDist);
                core?.setLightYawDegrees(next.lightYaw);
                core?.setLightHeight(next.lightHeight);
                core?.setLightDistance(next.lightDist);
                save(next);
              }}
            >
              Reset&nbsp;Light
            </button>
          </div>

          {/* Save status */}
          <div style={{ marginLeft: 8 }}>
            <small style={{ opacity: .8 }}>
              {saveState === "saving" && "Saving…"}
              {saveState === "saved"  && "Saved ✓"}
              {saveState === "error"  && "Save failed"}
            </small>
          </div>
        </div>
      ) : null}

      {/* where AsciiEffect mounts; fills its parent */}
      <div ref={stageRef} className={styles.stage} />
    </div>
  );
};

export default AsciiBadgerPage;
