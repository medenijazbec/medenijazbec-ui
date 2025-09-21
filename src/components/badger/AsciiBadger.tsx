import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./AsciiBadger.module.css";
import { AsciiBadger } from "./badger.logic";
import { ALLOWED_EXTS, ANIM_DIR, PREFETCH_ANIMS } from "./badger.constants";
import { politePrefetch } from "@/lib/prefetch";
import { animgroups } from "@/controllers/animationGroups";

const PAGE_LOAD_CATEGORY = "page-load";
const KICK_SLUG = "kick-the-badger";

const allowed = (n: string) => ALLOWED_EXTS.some(ext => n.toLowerCase().endsWith(ext));
const pickOne = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const AsciiBadgerPage: React.FC = () => {
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [core, setCore] = useState<AsciiBadger | null>(null);

  // chosen idle on page load (loop forever)
  const idleRef = useRef<string | null>(null);
  // available combat clips
  const kickFilesRef = useRef<string[]>([]);

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
    })();

    // click → random kick once → back to previously-chosen idle forever
    const onClick = () => {
      const idle = idleRef.current;
      const kicks = kickFilesRef.current;
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

  const onPlayPause  = () => { core?.togglePlay();      force(); };
  const onTurntable  = () => { core?.toggleTurntable(); force(); };
  const onLight      = () => { core?.toggleLightSpin(); force(); };

  return (
    <div className={styles.root}>
      <div className={styles.hud}>
        <button onClick={onPlayPause}>{labels.playPauseLabel()}</button>
        <button onClick={onTurntable}>{labels.turntableLabel()}</button>
        <button onClick={onLight}>{labels.lightLabel()}</button>
      </div>

      {/* where AsciiEffect mounts; fills its parent */}
      <div ref={stageRef} className={styles.stage} />
    </div>
  );
};

export default AsciiBadgerPage;
