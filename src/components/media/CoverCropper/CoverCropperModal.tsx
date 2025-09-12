import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./CoverCropperModal.module.css";

/**
 * A simple square cropper (viewport style). The user pans/zooms the image
 * inside a square mask; Save exports a 256x256 PNG Blob + dataURL.
 */
type Props = {
  open: boolean;
  /** Image to crop – either a File (from <input>) or an existing URL. */
  file?: File | null;
  src?: string | null;
  onClose: () => void;
  onSave: (out: {
    blob: Blob;
    dataUrl: string;
    // Persistable transform (useful if you want to re-open at same spot):
    x: number; y: number; scale: number;
  }) => void;
  /** Optional initial transform if re-opening an existing crop. */
  initial?: { x: number; y: number; scale: number };
};
const TARGET = 256;
const VIEWPORT = 380;

export default function CoverCropperModal({ open, file, src, onClose, onSave, initial }: Props) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : (src || null)), [file, src]);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [imgW, setImgW] = useState(0);
  const [imgH, setImgH] = useState(0);

  // pan/zoom
  const [scale, setScale] = useState(initial?.scale ?? 1);
  const [pos, setPos] = useState({ x: initial?.x ?? 0, y: initial?.y ?? 0 }); // offset from centered image
  const dragRef = useRef<{ startX: number; startY: number; startPos: { x: number; y: number } } | null>(null);

  useEffect(() => {
    if (!url) return;
    const img = new Image();
    img.onload = () => { setImgW(img.naturalWidth); setImgH(img.naturalHeight); };
    img.src = url;
    return () => { if (file) URL.revokeObjectURL(url!); };
  }, [url, file]);

  const { minScaleCover, maxScale } = useMemo(() => {
    if (!imgW || !imgH) return { minScaleCover: 1, maxScale: 8 };
    const sCover = Math.max(VIEWPORT / imgW, VIEWPORT / imgH); // must cover square
    return { minScaleCover: sCover, maxScale: sCover * 8 };
  }, [imgW, imgH]);

  // keep image within viewport (no blank edges)
  const clampPos = (nx: number, ny: number, sc: number) => {
    const w = imgW * sc;
    const h = imgH * sc;
    // allowed translation from the centered position:
    const maxX = Math.max(0, (w - VIEWPORT) / 2);
    const maxY = Math.max(0, (h - VIEWPORT) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, nx)), y: Math.max(-maxY, Math.min(maxY, ny)) };
  };

  // set defaults when image loads
  useEffect(() => {
    if (!imgW || !imgH) return;
    const s = Math.max(minScaleCover, initial?.scale ?? minScaleCover);
    setScale(s);
    setPos(clampPos(initial?.x ?? 0, initial?.y ?? 0, s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgW, imgH]);

  // drag handlers
  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPos: { ...pos } };
    stageRef.current?.classList.add(styles.grabbing);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const next = { x: dragRef.current.startPos.x + dx, y: dragRef.current.startPos.y + dy };
    setPos(clampPos(next.x, next.y, scale));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    dragRef.current = null;
    stageRef.current?.classList.remove(styles.grabbing);
  };

  // wheel zoom around center (simple)
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    const next = Math.max(minScaleCover, Math.min(maxScale, scale * factor));
    setScale(next);
    setPos(p => clampPos(p.x, p.y, next));
  };

  const fit = () => {
    const s = Math.max(minScaleCover, minScaleCover);
    setScale(s);
    setPos({ x: 0, y: 0 });
  };
  const fill = () => {
    const s = Math.max(minScaleCover, minScaleCover) * 1.2;
    setScale(s);
    setPos(p => clampPos(p.x, p.y, s));
  };
  const center = () => setPos({ x: 0, y: 0 });

  const onSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setScale(v);
    setPos(p => clampPos(p.x, p.y, v));
  };

  const save = async () => {
    if (!imgRef.current) return;
    const sc = scale;

    // Calculate the visible square (viewport) in source pixels.
    // Because we center using translate(-50%,-50%) and then offset by pos.{x,y},
    // the drawn image's top-left = center - half(draw) + pos.
    const drawW = imgW * sc;
    const drawH = imgH * sc;
    const left = (VIEWPORT - drawW) / 2 + pos.x;
    const top  = (VIEWPORT - drawH) / 2 + pos.y;

    const sx = Math.max(0, (-left) / sc);
    const sy = Math.max(0, (-top)  / sc);
    const sSize = Math.min(imgW - sx, imgH - sy, VIEWPORT / sc);

    const c = document.createElement("canvas");
    c.width = TARGET; c.height = TARGET;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imgRef.current, sx, sy, sSize, sSize, 0, 0, TARGET, TARGET);

    const blob: Blob = await new Promise(res => c.toBlob(b => res(b as Blob), "image/png", 0.92)!);
    const dataUrl = c.toDataURL("image/png");
    onSave({ blob, dataUrl, x: pos.x, y: pos.y, scale: sc });
  };

  if (!open) return null;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.header}>
          <b>Crop Cover (256×256)</b>
          <div className={styles.hTools}>
            <button className={styles.hBtn} onClick={fit}   title="Fit">Fit</button>
            <button className={styles.hBtn} onClick={fill}  title="Fill">Fill</button>
            <button className={styles.hBtn} onClick={center} title="Center">Center</button>
          </div>
        </div>

        <div
          ref={stageRef}
          className={styles.viewport}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
        >
          {!!url && (
            <img
              ref={imgRef}
              src={url}
              alt=""
              draggable={false}
              className={styles.img}
              style={{
                width: imgW ? imgW * scale : undefined,
                height: imgH ? imgH * scale : undefined,
                // ✅ center first, then offset by pos (so panning works naturally)
                transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)`,
              }}
            />
          )}
          <div className={styles.mask} aria-hidden />
        </div>

        <div className={styles.controls}>
          <input
            type="range"
            min={minScaleCover}
            max={maxScale}
            step="0.001"
            value={scale}
            onChange={onSlider}
            className={styles.slider}
          />
          <div className={styles.actions}>
            <button className={styles.btn} onClick={onClose}>Cancel</button>
            <button className={styles.btnPrimary} onClick={save}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}