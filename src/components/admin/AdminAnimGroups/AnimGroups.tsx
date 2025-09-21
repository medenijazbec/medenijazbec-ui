import React, { useEffect, useMemo, useState } from 'react';
import styles from './AnimGroups.module.css';

import Navbar from '@/components/navbar/Navbar';
import { AsciiPreview } from '@/components/admin/AdminAnimGroups/AsciiPreview';
import { animgroups, type SaveGroupRequest } from '@/controllers/animationGroups';
import { ANIM_DIR, ALLOWED_EXTS, SCAN_ANIM_DIR } from '@/components/badger/badger.constants';
import { Button } from '@/components/ui/Button';

type FoundClip = { name: string; checked: boolean; label?: string }; // label will hold "1..N" or "0"/"idle" if you want

async function listClips(): Promise<string[]> {
  try {
    const r = await fetch(`${ANIM_DIR}animations.json`, { cache: 'no-cache' });
    if (r.ok) {
      const arr = (await r.json()) as string[];
      return arr.filter(n => ALLOWED_EXTS.some(ext => n.toLowerCase().endsWith(ext)));
    }
  } catch {}
  if (SCAN_ANIM_DIR) {
    try {
      const r = await fetch(ANIM_DIR, { cache: 'no-cache' });
      if (r.ok) {
        const html = await r.text();
        const files = [...html.matchAll(/href="([^"]+)"/gi)]
          .map(m => decodeURIComponent(m[1]).split('/').pop() || '')
          .filter(n => ALLOWED_EXTS.some(ext => n.toLowerCase().endsWith(ext)));
        if (files.length) return files;
      }
    } catch {}
  }
  return [];
}

const CATEGORY_PRESETS = ['page-load', 'combat', 'idle', 'tricks', 'emotes', 'misc'];

export default function AnimGroupsPage() {
  const [clips, setClips] = useState<FoundClip[]>([]);
  const [preview, setPreview] = useState<string | undefined>(undefined);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [published, setPublished] = useState(false);

  const [category, setCategory] = useState('page-load');
  const [customCategory, setCustomCategory] = useState('');
  const [isDefaultForCategory, setIsDefaultForCategory] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    listClips().then(names => {
      setClips(names.map(n => ({ name: n, checked: false })));
      if (names[0]) setPreview(names[0]);
    });
  }, []);

  const selected = useMemo(() => clips.filter(c => c.checked), [clips]);
  const N = selected.length;

  // Ensure each number 1..N is used exactly once (no gaps/dupes)
  const selectedNumbers = selected
    .map(s => parseInt(s.label || '', 10))
    .filter(n => Number.isFinite(n) && n >= 1);

  const hasAllNumbers =
    selectedNumbers.length === N &&
    new Set(selectedNumbers).size === N &&
    selectedNumbers.every(n => n >= 1 && n <= N);

  const canSave = title.trim().length > 0 && N > 0 && hasAllNumbers && !saving;

  const toggle = (name: string) => {
    setClips(prev => {
      const next = prev.map(c => (c.name === name ? { ...c, checked: !c.checked } : c));
      // If we unchecked something that had a label, free the number
      return next.map(c => (c.name === name && !(!c.checked) ? { ...c, label: undefined } : c));
    });
  };

  const setItemLabel = (name: string, label: string) => {
    setClips(prev => prev.map(c => (c.name === name ? { ...c, label: label || undefined } : c)));
  };

  const autoAssign = () => {
    let k = 1;
    setClips(prev => {
      const checkedNames = prev.filter(p => p.checked).map(p => p.name);
      return prev.map(c => (c.checked ? { ...c, label: String(k++) } : { ...c, label: c.label && !checkedNames.includes(c.name) ? c.label : undefined }));
    });
  };

  const clearAssign = () => setClips(prev => prev.map(c => ({ ...c, label: c.checked ? undefined : c.label })));

  const resolvedCategory = (customCategory.trim().length > 0 ? customCategory.trim() : category).toLowerCase();

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      // Order payload by chosen numeric label 1..N
      const ordered = [...selected]
        .map(s => ({ ...s, n: parseInt(s.label || '0', 10) }))
        .sort((a, b) => a.n - b.n);

      const payload: SaveGroupRequest = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        published,
        tagsJson: undefined,
        category: resolvedCategory || 'misc',
        isDefaultForCategory,
        items: ordered.map(s => ({ fileName: s.name, label: s.label || undefined })), // persist numeric labels "1..N"
      };
      const created = await animgroups.create(payload);
      setMessage(`Saved group "${created.title}" (slug: ${created.slug}, category: ${created.category}) with ${created.items.length} item(s).`);

      // reset
      setTitle('');
      setSlug('');
      setDescription('');
      setPublished(false);
      setCategory('page-load');
      setCustomCategory('');
      setIsDefaultForCategory(false);
      setClips(prev => prev.map(c => ({ ...c, checked: false, label: undefined })));
    } catch (e: any) {
      setMessage(e?.response?.data ?? e?.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  // Render options 1..N for each checked clip
  const numberOptions = (count: number) =>
    Array.from({ length: count }, (_, i) => String(i + 1));

  return (
    <div className={styles.root}>
      <Navbar overlay brand="medenijazbec.pro" />
      <main className={styles.main}>
        <div className={styles.wrap}>
          {/* Left: builder */}
          <div className={styles.card}>
            <h2 className={styles.h2}>New Animation Group</h2>

            <div className={styles.row}>
              <input
                className={styles.input}
                placeholder="Title (e.g., Headspin Combo)"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              <input
                className={styles.input}
                placeholder="Custom slug (optional)"
                value={slug}
                onChange={e => setSlug(e.target.value)}
              />
            </div>

            <div className={styles.row}>
              <textarea
                className={styles.input}
                rows={3}
                placeholder="Description (optional)"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {/* Category + default */}
            <div className={styles.row}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <label className={styles.badge}>Category:</label>
                <select className={styles.select} value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORY_PRESETS.map(c => (<option key={c} value={c}>{c}</option>))}
                </select>
                <span className={styles.kbd}>or custom:</span>
                <input
                  className={styles.input}
                  style={{ maxWidth: 220 }}
                  placeholder="custom category (optional)"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                />
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={isDefaultForCategory} onChange={e => setIsDefaultForCategory(e.target.checked)} />
                  Default for this category
                </label>
              </div>
            </div>

            <div className={styles.row}>
              <label>
                <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} /> Published
              </label>
              <span className={styles.kbd}>Tip:</span>
              <span className={styles.kbd}>
                Tick clips, then assign each a unique number <b>1..{N || 'N'}</b>. The player will run them in that order and loop.
              </span>
            </div>

            <div className={styles.row} style={{ gap: 8 }}>
              <Button className={styles.btn} onClick={autoAssign} disabled={N === 0}>Auto-assign 1..N</Button>
              <Button className={styles.btn} onClick={clearAssign} disabled={N === 0}>Clear</Button>
              {!hasAllNumbers && N > 0 && (
                <span className={styles.warn}>Assign each selected clip a unique number 1..{N}.</span>
              )}
            </div>

            <div className={styles.row}>
              <div style={{ flex: 1 }}>
                <div className={styles.headerRow}>
                  <span>Clips</span>
                  <span style={{ textAlign: 'center' }}>Sequence</span>
                  <span />
                </div>
                <div className={styles.list}>
                  {clips.map(c => (
                    <div className={`${styles.item} ${c.checked ? styles.selected : ''}`} key={c.name}>
                      <input type="checkbox" checked={c.checked} onChange={() => toggle(c.name)} />
                      <label onClick={() => setPreview(c.name)} title={c.name}>{c.name}</label>

                      {c.checked ? (
                        <select
                          className={styles.select}
                          value={c.label ?? ''}
                          onChange={e => setItemLabel(c.name, e.target.value)}
                        >
                          <option value="">{'(—)'}</option>
                          {numberOptions(N).map(no => (
                            <option key={no} value={no}>{no}</option>
                          ))}
                        </select>
                      ) : (
                        <div />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.row}>
              <Button disabled={!canSave} onClick={save}>
                {saving ? 'Saving…' : 'Save Group'}
              </Button>
              <div style={{ opacity: 0.85 }}>{message}</div>
            </div>
          </div>

          {/* Right: preview */}
          <div className={styles.card}>
            <h2 className={styles.h2}>Preview</h2>
            <AsciiPreview fileName={preview} />
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
              Loading from: <code>{ANIM_DIR}{preview ?? '(none selected)'}</code>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
