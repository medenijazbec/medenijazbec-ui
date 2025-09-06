// src/components/badger/AsciiBadgerPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./AsciiBadger.module.css";
import { AsciiBadger } from "./badger.logic";
import { ALLOWED_EXTS, ANIM_DIR, PREFETCH_ANIMS } from "./badger.constants";
import { politePrefetch } from "@/lib/prefetch";
import MoltenTitle from '@/components/branding/MoltenTitle'

const AsciiBadgerPage: React.FC = () => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [core, setCore] = useState<AsciiBadger | null>(null);
  const [clips, setClips] = useState<string[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  // Create core once
  useEffect(() => {
    if (!stageRef.current) return;

    const instance = new AsciiBadger(stageRef.current, setStatus);
    setCore(instance);

    (async () => {
      const found = await instance.listAnimations();
      setClips(found);

      if (PREFETCH_ANIMS && found.length) {
        politePrefetch(found.map((f) => `${ANIM_DIR}${f}`), { maxConcurrency: 2 });
      }

      if (found[0]) {
        setCurrent(found[0]);
        await instance.loadClipPath(found[0]);
      }
    })();

    return () => instance.dispose();
  }, []);

  const onChangeClip = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setCurrent(name);
    await core?.loadClipPath(name);
  };

  const [, setTick] = useState(0);
  const forceRerender = () => setTick((t) => t + 1);

  const onPlayPause  = () => { core?.togglePlay();       forceRerender(); };
  const onTurntable  = () => { core?.toggleTurntable();  forceRerender(); };
  const onLight      = () => { core?.toggleLightSpin();  forceRerender(); };
  const onOpenFile   = () => fileRef.current?.click();

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!ALLOWED_EXTS.some((ext) => lower.endsWith(ext))) {
      setStatus("Unsupported file type. Please choose a .glb or .gltf.");
      return;
    }
    const buf = await file.arrayBuffer();
    core?.loadClipBuffer(buf, file.name);
  };

  const labels = useMemo(
    () =>
      core?.ui ?? {
        playPauseLabel: () => "Pause",
        turntableLabel: () => "Turntable",
        lightLabel: () => "Light",
      },
    [core]
  );

  return (
    <div
      className={`${styles.root} ${styles.scanlines} ${styles.vignette}`}
      style={{ ['--title-to-badger-gap' as any]: '20rem' }} /* ≈20rem spacing */
    >
      {/* Title layer BELOW the ASCII stage */}
      <div className={styles.titleLayer}>
        <MoltenTitle text="Medeni Jazbec" />
      </div>

      {/* HUD */}
      <div className={styles.hud}>
        <div className={styles.row}>
          <strong>ASCII Animation</strong>
          <span className={styles.note}>
            • Drag = rotate • Scroll = zoom • Double-click = reset
          </span>
        </div>
        <div className={styles.row}>
          <label htmlFor="clip">Clip:</label>
          <select id="clip" value={current} onChange={onChangeClip}>
            {clips.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button onClick={onPlayPause}>{labels.playPauseLabel()}</button>
          <button onClick={onTurntable}>{labels.turntableLabel()}</button>
          <button onClick={onLight}>{labels.lightLabel()}</button>
          <button onClick={onOpenFile}>Open GLB</button>
          <span className={styles.note}>{status}</span>
        </div>
      </div>

      {/* hidden file input */}
      <input
        ref={fileRef}
        className={styles.hiddenInput}
        type="file"
        accept=".glb,.gltf"
        onChange={onFilePicked}
      />

      {/* stage receives the AsciiEffect DOM node */}
      <div ref={stageRef} className={styles.stage} />
    </div>
  );
};

export default AsciiBadgerPage;
