import React, { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/navbar/Navbar";
import styles from "./ProjectsAdmin.module.css";
import { projects } from "@/controllers/projects";
import { api } from "@/api/api";
import { env } from "@/lib/env";
import type { Project, ProjectImage } from "@/types/domain";
import CoverCropperModal from "@/components/media/CoverCropper/CoverCropperModal";

type Kind = "software" | "hardware";
type TechItem = { name: string; iconUrl?: string | null };

/** new draft */
const empty = (kind: Kind): Partial<Project> => ({
  slug: "",
  title: "",
  summary: "",
  description: "",
  liveUrl: "",
  repoUrl: "",
  featured: false,
  published: true,
  kind,
  images: [],
});

/** robust, accent-aware slugify; collapses repeats and trims dashes */
const slugify = (s: string) =>
  (s || "")
    .normalize("NFKD")                    // split accents
    .replace(/[\u0300-\u036f]/g, "")      // drop accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")          // non-alnum → dash
    .replace(/^-+|-+$/g, "")              // trim edges
    .replace(/-{2,}/g, "-");              // collapse repeats

/** robust parser that accepts stringified or array JSON */
function parseTechStack(input: unknown): TechItem[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((x: any) => ({ name: String(x?.name ?? x), iconUrl: x?.iconUrl ?? null }));
  }
  if (typeof input === "string") {
    try {
      const arr = JSON.parse(input);
      return Array.isArray(arr)
        ? arr.map((x: any) => ({ name: String(x?.name ?? x), iconUrl: x?.iconUrl ?? null }))
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Escape HTML for preview, then later replace [[imgN]] tokens. */
const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

/** Convert relative '/images/...' to absolute backend URL for preview */
const absUrl = (u?: string | null) => {
  if (!u) return "";
  if (u.startsWith("blob:") || u.startsWith("data:")) return u;
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return `${env.API_URL}${u}`;
  return u;
};

/** Upload a single image (project image or icon) to the backend. Returns public URL (/images/...). */
async function uploadImageFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post<{ url: string }>("/api/uploads/image", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.url; // e.g. "/images/xyz.png"
}
/** Turn a Blob into a File and upload (used by the cropper). */
async function uploadCroppedBlob(blob: Blob, filename = `cover-256-${Date.now()}.png`): Promise<string> {
  const file = new File([blob], filename, { type: "image/png" });
  return uploadImageFile(file);
}

/** Measure image intrinsic size. Uses absUrl so relative /images/... works. */
async function measureImageDims(u: string): Promise<{ w: number; h: number }> {
  const src = absUrl(u);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}

export default function ProjectsAdmin() {
  const [kind, setKind] = useState<Kind>("software");
  const [items, setItems] = useState<Project[]>([]);
  const [editing, setEditing] = useState<Project | null>(null);
  const [draft, setDraft] = useState<Partial<Project> | null>(null);
  const [tech, setTech] = useState<TechItem[]>([]);
  const [techName, setTechName] = useState("");
  const [loading, setLoading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  // --- Cover cropper modal state ---
type CropAction = "firstUpload" | "reCropCover" | "setAsCover";
const [cropOpen, setCropOpen] = useState(false);
const [cropIndex, setCropIndex] = useState<number | null>(null);
const [cropAction, setCropAction] = useState<CropAction>("reCropCover");
const [cropFile, setCropFile] = useState<File | null>(null);
const [cropSrc, setCropSrc] = useState<string | null>(null);

const openCropperFromFile = (index: number, file: File, action: CropAction) => {
  setCropIndex(index); setCropAction(action); setCropFile(file); setCropSrc(null); setCropOpen(true);
};
const openCropperFromUrl = (index: number, src: string, action: CropAction) => {
  setCropIndex(index); setCropAction(action); setCropFile(null); setCropSrc(absUrl(src)); setCropOpen(true);
};
const closeCropper = () => { setCropOpen(false); setCropIndex(null); setCropFile(null); setCropSrc(null); };

  const descRef = useRef<HTMLTextAreaElement | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await projects.list({ kind, includeUnpublished: true });
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [kind]);

const startNew = () => {
  setEditing(null);
  setDraft(empty(kind));
  setTech([]);
  setSlugTouched(false);
};

  const startEdit = (p: Project) => {
    setEditing(p);
    setDraft({
      id: p.id,
      slug: p.slug,
      title: p.title,
      summary: p.summary,
      description: p.description,
      liveUrl: p.liveUrl,
      repoUrl: p.repoUrl,
      featured: p.featured,
      published: p.published,
      kind: p.kind,
      images: (p.images || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    });

    const raw = (p as any).techStackJson ?? (p as any).techStack ?? null;
    setTech(parseTechStack(raw));
    setSlugTouched(false);
  };

  const cancel = () => {
    setEditing(null);
    setDraft(null);
    setTech([]);
  };

const save = async () => {
  if (!draft) return;
  if (!draft.slug || !draft.title) {
    alert("Slug and Title are required");
    return;
  }

  // Validate cover: must exist AND be 256×256
  const imgs = (draft.images || []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const cover = imgs[0];
  if (!cover || !(cover.url || (cover as any)._previewUrl)) {
    alert("Please add a cover image (index 0). It must be 256×256.");
    return;
  }

  // If not flagged by our cropper, double-check actual dimensions
  let coverOk = !!(cover as any)._cover256;
  if (!coverOk) {
    try {
      const dim = await measureImageDims((cover as any)._previewUrl || cover.url!);
      coverOk = dim.w === 256 && dim.h === 256;
    } catch {
      coverOk = false;
    }
  }
  if (!coverOk) {
    // Force user through cropper before save
    openCropperFromUrl(0, (cover as any)._previewUrl || cover.url!, "reCropCover");
    alert("Cover image must be 256×256. Please crop it, then Save again.");
    return;
  }

  const images = (draft.images || []).map((img, idx) => ({
    ...img,
    sortOrder: img.sortOrder ?? idx,
  })) as ProjectImage[];

  const payload: Partial<Project> & { techStackJson?: string } = {
    ...draft,
    images,
    techStackJson: JSON.stringify(
      tech.map((t) => ({ name: t.name, iconUrl: t.iconUrl ?? undefined }))
    ),
  };

  try {
    if (editing?.id) {
      await projects.update(editing.id, payload as any);
    } else {
      await projects.create(payload as any);
    }
    await load();
    cancel();
  } catch (err: any) {
    console.error(err);
    alert(err?.message || "Save failed");
  }
};


  const remove = async (p: Project) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    await projects.remove(p.id);
    await load();
  };

  // ------- Images (project gallery) --------
  const addImage = () => {
    if (!draft) return;
    const imgs = (draft.images || []).slice();
    imgs.push({ url: "", alt: "", sortOrder: imgs.length } as ProjectImage);
    setDraft({ ...draft, images: imgs });
  };

  const setImage = (i: number, patch: Partial<ProjectImage> & { _previewUrl?: string }) => {
    if (!draft) return;
    const images = (draft.images || []).slice();
    images[i] = { ...(images[i] as any), ...patch };
    setDraft({ ...draft, images });
  };

  // Upload to backend; set final URL and preview immediately
const onPickLocalFile = async (i: number, file?: File | null) => {
  if (!draft || !file) return;

  // Always force cover crop for first image
  if (i === 0) {
    openCropperFromFile(0, file, "firstUpload");
    return;
  }

  // Non-cover images: upload as-is; user can later "Set as cover" (which will crop)
  const tempPreview = URL.createObjectURL(file);
  setImage(i, { _previewUrl: tempPreview });
  try {
    const url = await uploadImageFile(file);
    setImage(i, { url, _previewUrl: url });
  } catch (e) {
    console.error(e);
    alert("Upload failed");
  }
};


  // ------- Tech stack --------
  const addTech = () => {
    const name = techName.trim();
    if (!name) return;
    setTech((t) => [...t, { name }]);
    setTechName("");
  };

  const removeTech = (idx: number) => {
    setTech((t) => t.filter((_, i) => i !== idx));
  };

  const uploadTechIcon = async (idx: number, file?: File | null) => {
    if (!file) return;
    try {
      const url = await uploadImageFile(file); // "/images/..."
      setTech((arr) => {
        const next = arr.slice();
        next[idx] = { ...next[idx], iconUrl: url };
        return next;
      });
    } catch (e) {
      console.error(e);
      alert("Icon upload failed");
    }
  };

  // ------- List sorting for display --------
  const sorted = useMemo(
    () =>
      items
        .slice()
        .sort((a, b) => Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title)),
    [items]
  );

  // ------- Description helpers / preview -------
  const insertImgTokenAtCaret = (token: string) => {
    const el = descRef.current;
    if (!draft || !el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const text = draft.description || "";
    const next = text.slice(0, start) + token + text.slice(end);
    setDraft({ ...draft, description: next });
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };
const onCropSave = async (out: { blob: Blob; dataUrl: string; x: number; y: number; scale: number }) => {
  if (cropIndex == null || !draft) { closeCropper(); return; }

  try {
    // Upload the cropped 256×256 PNG; store relative URL returned by API
    const url = await uploadCroppedBlob(out.blob);

    const newImg: ProjectImage & any = {
      url,
      alt: draft.images?.[cropIndex!]?.alt || "",
      sortOrder: 0,
      _previewUrl: url,
      _cover256: true
    };

    const images = (draft.images || []).slice();

    if (cropAction === "setAsCover" && cropIndex !== 0) {
      // Remove from current index, unshift as cover
      const removed = images.splice(cropIndex, 1)[0];
      images.unshift({ ...newImg, alt: removed?.alt || newImg.alt });
    } else {
      // firstUpload or reCropCover -> overwrite index 0
      images[0] = { ...(images[0] as any), ...newImg };
    }

    setDraft({ ...draft, images });
  } catch (e) {
    console.error(e);
    alert("Cropping upload failed.");
  } finally {
    closeCropper();
  }
};

  const renderPreviewHtml = () => {
    const text = draft?.description || "";
    const safe = escapeHtml(text);
    const withImgs = safe.replace(/\[\[img(\d+)\]\]/g, (_, nStr) => {
      const n = parseInt(nStr, 10);
      const imgs = (draft?.images || [])
        .slice()
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      const img = imgs[n];
      if (!img || !(img.url || (img as any)._previewUrl)) return `[[img${n}]]`;
      const raw = (img as any)._previewUrl || img.url!;
      const src = absUrl(raw);
      const alt = escapeHtml(img.alt || "");
      return `<figure style="margin:10px 0">
        <img src="${src}" alt="${alt}" style="max-width:100%;border:1px solid rgba(0,255,102,.35)"/>
        ${alt ? `<figcaption style="opacity:.8;font-size:12px">${alt}</figcaption>` : ""}
      </figure>`;
    });
    return withImgs.replace(/\n/g, "<br/>");
  };

  return (
    <div className={styles.page}>
      <Navbar overlay brand="medenijazbec.pro" />
      <main className={styles.main}>
        <section className={styles.wrap}>
          <header className={styles.header}>
            <h2 className={styles.title}>Projects Admin</h2>
            <div className={styles.tools}>
              <select className={styles.select} value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                <option value="software">Software</option>
                <option value="hardware">Hardware</option>
              </select>
              <button className={styles.btn} onClick={startNew}>
                New Project
              </button>
            </div>
          </header>

          <div className={styles.list}>
            {loading && <div className={styles.empty}>Loading…</div>}
            {!loading && sorted.length === 0 && <div className={styles.empty}>No projects yet.</div>}
            {!loading &&
              sorted.map((p) => (
                <div key={p.id} className={styles.row}>
                  <div className={styles.rowL}>
                    <div className={styles.rowTitle}>{p.title}</div>
                    <div className={styles.rowSub}>
                      {p.slug} • {p.kind} • {p.published ? "Published" : "Draft"} {p.featured ? "• Featured" : ""}
                    </div>
                  </div>
                  <div className={styles.rowR}>
                    <button className={styles.btn} onClick={() => startEdit(p)}>
                      Edit
                    </button>
                    <button className={styles.btn} onClick={() => remove(p)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {draft && (
            <div className={styles.editor}>
              <div className={styles.grid}>
                <label className={styles.label}>Kind</label>
                <select
                  className={styles.input}
                  value={draft.kind || kind}
                  onChange={(e) => setDraft({ ...draft, kind: e.target.value as Kind })}
                >
                  <option value="software">Software</option>
                  <option value="hardware">Hardware</option>
                </select>

              <label className={styles.label}>Slug</label>
              <div className={styles.row}>
                <input
                  className={styles.input}
                  value={draft.slug || ""}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setDraft({ ...draft, slug: e.target.value });
                  }}
                  placeholder="my-cool-project"
                />
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => setDraft(d => (d ? { ...d, slug: slugify(d.slug || d.title || "") } : d))}
                  title="Generate a clean slug from the current Slug (or Title if Slug empty)"
                >
                  Slugify
                </button>
              </div>


                <label className={styles.label}>Title</label>
<input
  className={styles.input}
  value={draft.title || ""}
  onChange={(e) => {
    const t = e.target.value;
    setDraft(d => {
      if (!d) return d;
      const next: any = { ...d, title: t };
      if (!slugTouched) next.slug = slugify(t); // auto-suggest slug until user edits slug manually
      return next;
    });
  }}
/>


                <label className={styles.label}>Summary</label>
                <input
                  className={styles.input}
                  value={draft.summary || ""}
                  onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
                />

                <label className={styles.label}>Description</label>
                <div>
                  <textarea
                    ref={descRef}
                    className={styles.area}
                    rows={8}
                    placeholder={`Write your project…\nUse [[img0]], [[img1]], … to place images by index.`}
                    value={draft.description || ""}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  />
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
                    Tip: Click “Insert” on an image to inject its token at your cursor.
                  </div>
                </div>

                <label className={styles.label}>LiveUrl</label>
                <input
                  className={styles.input}
                  value={draft.liveUrl || ""}
                  onChange={(e) => setDraft({ ...draft, liveUrl: e.target.value })}
                />

                <label className={styles.label}>RepoUrl</label>
                <input
                  className={styles.input}
                  value={draft.repoUrl || ""}
                  onChange={(e) => setDraft({ ...draft, repoUrl: e.target.value })}
                />

                <label className={styles.label}>Tech Stack</label>
                <div className={styles.row}>
                  <input
                    className={styles.input}
                    placeholder="e.g., React"
                    value={techName}
                    onChange={(e) => setTechName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addTech();
                    }}
                  />
                  <button type="button" className={styles.btn} onClick={addTech}>
                    Add
                  </button>
                </div>

                {/* tech items */}
                <div style={{ gridColumn: "1 / -1", display: "grid", gap: 10 }}>
                  {tech.map((t, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 8 }}>
                      <input
                        className={styles.input}
                        value={t.name}
                        onChange={(e) =>
                          setTech((arr) => {
                            const next = arr.slice();
                            next[i] = { ...next[i], name: e.target.value };
                            return next;
                          })
                        }
                        placeholder="Tool name"
                      />
                      <input
                        className={styles.input}
                        value={t.iconUrl || ""}
                        onChange={(e) =>
                          setTech((arr) => {
                            const next = arr.slice();
                            next[i] = { ...next[i], iconUrl: e.target.value };
                            return next;
                          })
                        }
                        placeholder="/images/… (optional icon URL)"
                      />
                      <input type="file" accept="image/*" onChange={(e) => uploadTechIcon(i, e.target.files?.[0])} />
                      <button type="button" className={styles.btn} onClick={() => removeTech(i)}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <label className={styles.label}>Featured</label>
                <input
                  type="checkbox"
                  checked={!!draft.featured}
                  onChange={(e) => setDraft({ ...draft, featured: e.target.checked })}
                />

                <label className={styles.label}>Published</label>
                <input
                  type="checkbox"
                  checked={!!draft.published}
                  onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                />
              </div>

{/* Images */}
<div className={styles.gallery}>
  <div className={styles.row} style={{ justifyContent: "space-between" }}>
    <h4 className={styles.rowTitle}>Images</h4>
    <button className={styles.btn} onClick={addImage}>+ Add Image</button>
  </div>

  {(draft.images || []).map((img, i) => {
    const rawPreview = (img as any)._previewUrl || img.url || "";
    const preview = absUrl(rawPreview);
    const isCover = i === 0;

    return (
      <div key={i} className={styles.imgCard}>
        {/* Left: thumbnail */}
        <div className={styles.thumbWrap}>
          {preview ? (
            <img className={styles.thumb} src={preview} alt={img.alt || ""} />
          ) : (
            <div className={styles.thumbEmpty}>No image</div>
          )}
          {isCover && <span className={styles.coverBadgeChip}>Cover</span>}
          {(img as any)._cover256 && <span className={styles.croppedChip}>✓ 256×256</span>}
        </div>

        {/* Right: fields + actions */}
        <div className={styles.imgFields}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Image URL</span>
            <input
              className={styles.input}
              placeholder="/images/…"
              value={img.url || ""}
              onChange={(e) => setImage(i, { url: e.target.value })}
            />
          </label>

          <div className={styles.twoCol}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Alt text</span>
              <input
                className={styles.input}
                placeholder="Describe the image"
                value={img.alt || ""}
                onChange={(e) => setImage(i, { alt: e.target.value })}
              />
            </label>

            <label className={styles.field} style={{ maxWidth: 120 }}>
              <span className={styles.fieldLabel}>Sort</span>
              <input
                className={styles.input}
                type="number"
                placeholder="Sort"
                value={img.sortOrder ?? i}
                onChange={(e) =>
                  setImage(i, { sortOrder: parseInt(e.target.value || `${i}`, 10) })
                }
              />
            </label>
          </div>

          {/* Actions */}
          <div className={styles.actionsRow}>
            <label className={styles.fileBtn}>
              Choose File
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onPickLocalFile(i, e.target.files?.[0])}
              />
            </label>

            <button
              className={styles.btn}
              type="button"
              title="Insert [[imgN]] at cursor"
              onClick={() => insertImgTokenAtCaret(`[[img${i}]]`)}
            >
              Insert
            </button>

            {isCover ? (
              <button
                className={styles.btn}
                type="button"
                title="Re-crop cover (256×256)"
                onClick={() => {
                  const src = (img as any)._previewUrl || img.url || "";
                  if (!src) { alert("No image to crop."); return; }
                  openCropperFromUrl(0, src, "reCropCover");
                }}
              >
                Crop Cover 256×256
              </button>
            ) : (
              <button
                className={styles.btn}
                type="button"
                title="Set as cover (requires crop)"
                onClick={() => {
                  const src = (img as any)._previewUrl || img.url || "";
                  if (!src) { alert("Upload image first."); return; }
                  openCropperFromUrl(i, src, "setAsCover");
                }}
              >
                Set as Cover
              </button>
            )}

            <button
              className={styles.btnDanger}
              onClick={() => {
                const images = (draft.images || []).slice();
                images.splice(i, 1);
                setDraft({ ...draft, images });
              }}
            >
              Remove
            </button>
          </div>

          {/* Cover requirement hint */}
          {isCover && (
            <div className={styles.coverHint}>
              Cover must be exactly <b>256×256</b>.
              {!((img as any)._cover256) && <span className={styles.hintDot}> • not cropped yet</span>}
            </div>
          )}
        </div>
      </div>
    );
  })}
</div>



              {/* Live preview */}
              <div style={{ border: "1px solid rgba(0,255,102,.35)", padding: 12 }}>
                <div className={styles.rowTitle} style={{ marginBottom: 6 }}>
                  Preview
                </div>
                <div
                  style={{ lineHeight: 1.45, letterSpacing: ".01em" }}
                  dangerouslySetInnerHTML={{ __html: renderPreviewHtml() }}
                />
              </div>

              <div className={styles.actions}>
                <button className={styles.btn} onClick={save}>
                  Save
                </button>
                <button className={styles.btn} onClick={cancel}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Cropper modal */}
<CoverCropperModal
  open={cropOpen}
  file={cropFile || undefined}
  src={cropSrc || undefined}
  onClose={closeCropper}
  onSave={onCropSave}
/>

        </section>
      </main>
    </div>
  );
}
