import React, { useEffect, useMemo, useState } from "react";
import styles from "./ProjectViewerModal.module.css";
import type { Project } from "@/types/domain";
import { env } from "@/lib/env";

const absUrl = (u?: string) => {
  if (!u) return "";
  if (u.startsWith("blob:") || u.startsWith("data:")) return u;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return `${env.API_URL}${u}`;
  return u;
};

type Props = {
  open: boolean;
  project: Project | null;
  onClose: () => void;
};

export default function ProjectViewerModal({ open, project, onClose }: Props) {
  const imgs = useMemo(
    () => (project?.images?.length ? project.images : [{ url: "", alt: "" }]),
    [project]
  );
  const [idx, setIdx] = useState(0);

  useEffect(() => { setIdx(0); }, [project?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIdx(i => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIdx(i => Math.min(imgs.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, imgs.length, onClose]);

  if (!open || !project) return null;

  const img = imgs[idx];

  // Render description with [[imgN]] tokens → inline images
  const renderDesc = () => {
    const text = project.description || "";
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safe = esc(text);
    const withImgs = safe.replace(/\[\[img(\d+)\]\]/g, (_, m) => {
      const n = parseInt(m, 10);
      const t = imgs[n];
      if (!t?.url) return "";
      const src = absUrl(t.url);
      const alt = esc(t.alt || "");
      return `<figure style="margin:.5rem 0;"><img src="${src}" alt="${alt}" style="max-width:100%;height:auto;border:1px solid rgba(255,255,255,.15)"/><figcaption style="opacity:.8;font-size:12px">${alt}</figcaption></figure>`;
    });
    return withImgs.replace(/\n/g, "<br/>");
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <header className={styles.header}>
          <div className={styles.titleWrap}>
            <h3 className={styles.title}>{project.title}</h3>
            {project.summary && <p className={styles.summary}>{project.summary}</p>}
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className={styles.body}>
          <button
            className={`${styles.navBtn} ${styles.left}`}
            onClick={() => setIdx(i => Math.max(0, i - 1))}
            disabled={idx === 0}
            aria-label="Previous image"
          >‹</button>

          <div className={styles.preview} aria-live="polite">
            {img?.url
              ? <img src={absUrl(img.url)} alt={img.alt || ""} />
              : <div className={styles.noimg}>No image</div>}
          </div>

          <button
            className={`${styles.navBtn} ${styles.right}`}
            onClick={() => setIdx(i => Math.min(imgs.length - 1, i + 1))}
            disabled={idx === imgs.length - 1}
            aria-label="Next image"
          >›</button>

          <aside className={styles.side}>
            {project.description && (
              <div
                className={styles.desc}
                dangerouslySetInnerHTML={{ __html: renderDesc() }}
              />
            )}
            {(project.liveUrl || project.repoUrl) && (
              <div className={styles.links}>
                {project.liveUrl && <a className={styles.link} href={project.liveUrl} target="_blank" rel="noreferrer">Live</a>}
                {project.repoUrl && <a className={styles.link} href={project.repoUrl} target="_blank" rel="noreferrer">Repo</a>}
              </div>
            )}
          </aside>
        </div>

        {imgs.length > 1 && (
          <div className={styles.thumbs}>
            {imgs.map((t, i) => (
              <button
                key={i}
                className={`${styles.thumb} ${i === idx ? styles.active : ""}`}
                onClick={() => setIdx(i)}
                aria-label={`Image ${i + 1}`}
              >
                {t.url ? <img src={absUrl(t.url)} alt={t.alt || ""} /> : <span />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
