import React, { useEffect, useMemo, useState } from "react";
import styles from "./ProjectsAdmin.module.css";
import { projects } from "@/controllers/projects";
import type { Project, ProjectImage } from "@/types/domain";

type Kind = 'software' | 'hardware';

const blank = (kind: Kind): Partial<Project> => ({
  slug: "",
  title: "",
  summary: "",
  description: "",
  kind,
  featured: false,
  published: true,
  images: [],
});

export default function ProjectsAdmin() {
  const [kind, setKind] = useState<Kind>('software');
  const [items, setItems] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Project | null>(null);
  const [draft, setDraft] = useState<Partial<Project> | null>(null);

  const load = () =>
    projects.list({ kind, includeUnpublished: true }).then(setItems).catch(console.error);

  useEffect(() => { load(); }, [kind]);

  const startNew = () => { const d = blank(kind); setDraft(d); setEditing(null); };
  const startEdit = (p: Project) => { setEditing(p); setDraft({ ...p }); };

  const upsert = async () => {
    if (!draft) return;
    // basic validation
    if (!draft.slug || !draft.title) { alert("Slug and Title are required"); return; }

    try {
      if (editing) {
        await projects.update(editing.id, draft as Project);
      } else {
        await projects.create(draft as Project);
      }
      setDraft(null);
      setEditing(null);
      await load();
    } catch (e) {
      console.error(e);
      alert("Save failed");
    }
  };

  const del = async (p: Project) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    await projects.remove(p.id);
    await load();
  };

  const addImage = () => {
    if (!draft) return;
    const imgs = [...(draft.images || [])];
    imgs.push({ url: "", alt: "", sortOrder: imgs.length } as ProjectImage);
    setDraft({ ...draft, images: imgs });
  };

  const sorted = useMemo(
    () => items.slice().sort((a,b) => Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title)),
    [items]
  );

  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <h2 className={styles.title}>Projects Admin</h2>
        <div className={styles.tools}>
          <select className={styles.select} value={kind} onChange={e=>setKind(e.target.value as Kind)}>
            <option value="software">Software</option>
            <option value="hardware">Hardware</option>
          </select>
          <button className={styles.btn} onClick={startNew}>New Project</button>
        </div>
      </header>

      {/* List */}
      <div className={styles.list}>
        {sorted.map(p => (
          <div key={p.id} className={styles.row}>
            <div className={styles.rowL}>
              <div className={styles.rowTitle}>{p.title}</div>
              <div className={styles.rowSub}>{p.slug} • {p.published ? "Published" : "Draft"} {p.featured ? "• Featured" : ""}</div>
            </div>
            <div className={styles.rowR}>
              <button className={styles.btn} onClick={()=>startEdit(p)}>Edit</button>
              <button className={styles.btn} onClick={()=>del(p)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Editor */}
      {draft && (
        <div className={styles.editor}>
          <div className={styles.grid}>
            <label className={styles.label}>Kind</label>
            <select className={styles.input} value={draft.kind || kind} onChange={e=>setDraft({...draft, kind: e.target.value as Kind})}>
              <option value="software">Software</option>
              <option value="hardware">Hardware</option>
            </select>

            <label className={styles.label}>Slug</label>
            <input className={styles.input} value={draft.slug || ""} onChange={e=>setDraft({...draft, slug: e.target.value})} />

            <label className={styles.label}>Title</label>
            <input className={styles.input} value={draft.title || ""} onChange={e=>setDraft({...draft, title: e.target.value})} />

            <label className={styles.label}>Summary</label>
            <input className={styles.input} value={draft.summary || ""} onChange={e=>setDraft({...draft, summary: e.target.value})} />

            <label className={styles.label}>Description</label>
            <textarea className={styles.area} rows={6} value={draft.description || ""} onChange={e=>setDraft({...draft, description: e.target.value})} />

            <label className={styles.label}>Links</label>
            <div className={styles.cols2}>
              <input className={styles.input} placeholder="Live URL" value={draft.liveUrl || ""} onChange={e=>setDraft({...draft, liveUrl: e.target.value})} />
              <input className={styles.input} placeholder="Repo URL" value={draft.repoUrl || ""} onChange={e=>setDraft({...draft, repoUrl: e.target.value})} />
            </div>

            <label className={styles.label}>Flags</label>
            <div className={styles.flags}>
              <label><input type="checkbox" checked={!!draft.published} onChange={e=>setDraft({...draft, published: e.target.checked})} /> Published</label>
              <label><input type="checkbox" checked={!!draft.featured} onChange={e=>setDraft({...draft, featured: e.target.checked})} /> Featured</label>
            </div>

            <label className={styles.label}>Images</label>
            <div>
              {(draft.images || []).map((img, i) => (
                <div key={i} className={styles.imgRow}>
                  <input className={styles.input} placeholder="Image URL" value={img.url} onChange={e=>{
                    const copy = [...(draft.images || [])];
                    copy[i] = { ...copy[i], url: e.target.value };
                    setDraft({ ...draft, images: copy });
                  }}/>
                  <input className={styles.input} placeholder="Alt" value={img.alt || ""} onChange={e=>{
                    const copy = [...(draft.images || [])];
                    copy[i] = { ...copy[i], alt: e.target.value };
                    setDraft({ ...draft, images: copy });
                  }}/>
                  <input className={styles.input} type="number" placeholder="Sort" value={img.sortOrder ?? i} onChange={e=>{
                    const copy = [...(draft.images || [])];
                    copy[i] = { ...copy[i], sortOrder: Number(e.target.value) };
                    setDraft({ ...draft, images: copy });
                  }}/>
                  <button className={styles.btn} onClick={()=>{
                    const copy = [...(draft.images || [])];
                    copy.splice(i,1);
                    setDraft({ ...draft, images: copy });
                  }}>✕</button>
                </div>
              ))}
              <button className={styles.btn} onClick={addImage}>Add image</button>
            </div>
          </div>

          <div className={styles.editorActions}>
            <button className={styles.btn} onClick={upsert}>Save</button>
            <button className={styles.btn} onClick={()=>{ setDraft(null); setEditing(null); }}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}
