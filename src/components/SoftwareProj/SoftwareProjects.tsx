import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./SoftwareProj.module.css";
import { projects } from "@/controllers/projects";
import type { Project } from "@/types/domain";

/** RGB split wobble (same math as your pill glitch) */
function useRGBWobble(ref: React.RefObject<HTMLElement>, active: boolean) {
  const rafRef = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let t0 = performance.now();
    const BASE = active ? 2.0 : 1.0;
    const WOB = active ? 1.6 : 0.6;
    const BURST = active ? 4.0 : 2.0;
    const HZ_R = 0.9, HZ_B = 1.3, PERIOD = 2.6, DUR = 0.10;

    const tick = (ts: number) => {
      rafRef.current = requestAnimationFrame(tick);
      const t = (ts - t0) / 1000;
      const wr = Math.sin(t * Math.PI * 2 * HZ_R);
      const wb = Math.cos(t * Math.PI * 2 * HZ_B);
      let ax = BASE + WOB * 0.7 * wr;
      let ay = BASE * 0.3 + WOB * 0.5 * wb;
      const inBurst = (t % PERIOD) < DUR;
      if (inBurst) { ax += BURST; ay -= BURST * 0.5; }
      const rx = Math.round(ax),  ry = Math.round(ay);
      const bx = Math.round(-ax * 0.85), by = Math.round(ay * 0.6);
      el.style.setProperty("--rgb-rx", `${rx}px`);
      el.style.setProperty("--rgb-ry", `${ry}px`);
      el.style.setProperty("--rgb-bx", `${bx}px`);
      el.style.setProperty("--rgb-by", `${by}px`);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ref, active]);
}

function ProjectCard({ p }: { p: Project }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const imgsRef = useRef<HTMLDivElement | null>(null);
  useRGBWobble(imgsRef as any, open);

  // smooth expand/collapse
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const inner = el.firstElementChild as HTMLElement | null;
    if (!inner) return;
    const h = open ? inner.getBoundingClientRect().height : 0;
    el.style.maxHeight = `${h}px`;
  }, [open, p.description, p.images?.length]);

  const teaser = useMemo(
    () => (p.summary || p.description || "").split(/\r?\n/)[0] || "",
    [p.summary, p.description]
  );

  return (
    <div className={styles.card}>
      <button className={`${styles.head} ${open ? styles.open : ""}`} onClick={() => setOpen(v => !v)}>
        <div>
          <div className={styles.hTitle}>{p.title}</div>
          <div className={styles.hTeaser}>{teaser}</div>
        </div>
        <div className={styles.chev} aria-hidden>›</div>
      </button>

      <div ref={bodyRef} className={styles.body}>
        <div className={styles.inner}>
          {p.description && <div className={styles.desc}>{p.description}</div>}
          {p.images?.length ? (
            <div ref={imgsRef} className={styles.gallery}>
              {p.images.map((img, i) => (
                <div key={i} className={styles.imgWrap}>
                  <img className={styles.img} src={img.url} alt={img.alt || ""} />
                </div>
              ))}
            </div>
          ) : null}
          <div className={styles.links}>
            {p.liveUrl && <a className={styles.link} href={p.liveUrl} target="_blank">Live</a>}
            {p.repoUrl && <a className={styles.link} href={p.repoUrl} target="_blank">Repo</a>}
          </div>
        </div>
      </div>
    </div>
  );
}

const SoftwareProjects: React.FC = () => {
  const [items, setItems] = useState<Project[]>([]);
  useEffect(() => { projects.list({ kind: 'software' }).then(setItems).catch(console.error); }, []);
  return (
    <section className={styles.wrap}>
      <h2 className={styles.title}>Software Projects</h2>
      <div className={styles.list}>
        {items.map(p => <ProjectCard key={p.id} p={p} />)}
      </div>
    </section>
  );
};

export default SoftwareProjects;
