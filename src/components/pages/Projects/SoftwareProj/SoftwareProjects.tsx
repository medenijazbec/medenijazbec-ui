import React, { useEffect, useMemo, useState } from "react";
import styles from "./SoftwareProj.module.css";
import { projects } from "@/controllers/projects";
import type { Project } from "@/types/domain";

import CoverCropperModal from "@/components/media/CoverCropper/CoverCropperModal";
import ProjectViewerModal from "@/components/media/ProjectViewer/ProjectViewerModal";
import { env } from "@/lib/env";

const absUrl = (u?: string) => {
  if (!u) return "";
  if (u.startsWith("blob:") || u.startsWith("data:")) return u;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return `${env.API_URL}${u}`;
  return u;
};

type CardProps = {
  p: Project;
  onOpen?: (p: Project) => void;
  onPickCover?: (p: Project, f: File) => void;
  onRecrop?: (p: Project) => void;
};

export function Card({ p, onOpen, onPickCover, onRecrop }: CardProps) {
  const coverRaw = p.images?.[0]?.url || "";
  const cover = absUrl(coverRaw);
  const teaser = useMemo(
    () => (p.summary || p.description || "").split(/\r?\n/)[0] || "",
    [p.summary, p.description]
  );

  return (
    <article
      className={styles.album}
      tabIndex={0}
      onClick={() => onOpen?.(p)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.(p);
        }
      }}
      role="button"
      aria-label={`Open ${p.title}`}
    >
      <div
        className={styles.cover}
        style={cover ? { backgroundImage: `url("${cover}")` } : undefined}
        aria-hidden={true}
      />
      <div className={styles.overlay}>
        <h3 className={styles.title}>{p.title}</h3>
        {teaser && <p className={styles.teaser}>{teaser}</p>}

        {(p.liveUrl || p.repoUrl) && (
          <div className={styles.links} onClick={(e) => e.stopPropagation()}>
            {p.liveUrl && (
              <a className={styles.link} href={p.liveUrl} target="_blank" rel="noreferrer">
                Live
              </a>
            )}
            {p.repoUrl && (
              <a className={styles.link} href={p.repoUrl} target="_blank" rel="noreferrer">
                Repo
              </a>
            )}
          </div>
        )}

        {(onRecrop || onPickCover) && (
          <div className={styles.links} onClick={(e) => e.stopPropagation()}>
            {onRecrop && (
              <button className={styles.link} type="button" onClick={() => onRecrop(p)}>
                Re-crop Cover
              </button>
            )}
            {onPickCover && (
              <label className={styles.link} style={{ cursor: "pointer" }}>
                New Cover…
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onPickCover(p, f);
                  }}
                />
              </label>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
const SoftwareProjects: React.FC = () => {
  const [items, setItems] = useState<Project[]>([]);
  useEffect(() => {
    projects.list({ kind: "software" }).then(setItems).catch(console.error);
  }, []);

  // Viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerProject, setViewerProject] = useState<Project | null>(null);
  const openViewer = (p: Project) => { setViewerProject(p); setViewerOpen(true); };
  const closeViewer = () => setViewerOpen(false);

  // Cropper
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropProject, setCropProject] = useState<Project | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const onPickCover = (p: Project, f: File) => {
    setCropProject(p);
    setFile(f);
    setCropSrc(null);
    setCropOpen(true);
  };
  const onRecrop = (p: Project) => {
    setCropProject(p);
    setFile(null);
    setCropSrc(absUrl(p.images?.[0]?.url || ""));
    setCropOpen(true);
  };
  const closeCropper = () => { setCropOpen(false); setFile(null); };

  const onSaveCover = async (out: { blob: Blob; dataUrl: string; x:number; y:number; scale:number }) => {
    // TODO: POST out.blob to your API for cropProject!.id
    if (cropProject) {
      // Optimistic UI update
      setItems(prev => prev.map(it => it.id === cropProject.id
        ? { ...it, images: [{ url: out.dataUrl, alt: it.images?.[0]?.alt || "cover", sortOrder: 0 }, ...(it.images?.slice(1) || [])] }
        : it));
    }
    closeCropper();
  };

  return (
    <section className={styles.wrap}>
      <div className={styles.navRow}>
        <h2 className={styles.heading}>SOFTWARE</h2>
      </div>

      <div className={styles.grid}>
        {items.map((p) => (
          <Card
            key={p.id}
            p={p}
            onOpen={openViewer}
            onPickCover={onPickCover}
            onRecrop={onRecrop}
          />
        ))}
        {!items.length && <div className={styles.empty}>No software projects yet.</div>}
      </div>

      {/* Modals */}
      <ProjectViewerModal open={viewerOpen} project={viewerProject} onClose={closeViewer} />
      <CoverCropperModal
        open={cropOpen}
        src={file ? undefined : cropSrc || undefined}
        file={file || undefined}
        onClose={closeCropper}
        onSave={onSaveCover}
      />
    </section>
  );
};

export default SoftwareProjects;
