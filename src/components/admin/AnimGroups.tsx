import React, { useEffect, useMemo, useState } from 'react'
import styles from './AnimGroups.module.css'
import { AsciiPreview } from '@/components/admin/AsciiPreview'
import { animgroups, type SaveGroupRequest } from '@/controllers/animationGroups'
import { ANIM_DIR, ALLOWED_EXTS, SCAN_ANIM_DIR } from '@/components/badger/badger.constants'
import { Button } from '@/components/ui/Button'

type FoundClip = { name: string; checked: boolean; label?: string }

async function listClips(): Promise<string[]> {
  // Try manifest first (animations.json)
  try {
    const r = await fetch(`${ANIM_DIR}animations.json`, { cache: 'no-cache' })
    if (r.ok) {
      const arr = (await r.json()) as string[]
      return arr.filter(n => ALLOWED_EXTS.some(ext => n.toLowerCase().endsWith(ext)))
    }
  } catch {}

  // Fall back to directory scan if allowed
  if (SCAN_ANIM_DIR) {
    try {
      const r = await fetch(ANIM_DIR, { cache: 'no-cache' })
      if (r.ok) {
        const html = await r.text()
        const files = [...html.matchAll(/href="([^"]+)"/gi)]
          .map(m => decodeURIComponent(m[1]).split('/').pop() || '')
          .filter(n => ALLOWED_EXTS.some(ext => n.toLowerCase().endsWith(ext)))
        if (files.length) return files
      }
    } catch {}
  }

  return []
}

const LABELS = ['Start', 'Middle', 'End', '']

export default function AnimGroupsPage() {
  const [clips, setClips] = useState<FoundClip[]>([])
  const [preview, setPreview] = useState<string | undefined>(undefined)

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [published, setPublished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    listClips().then(names => {
      setClips(names.map(n => ({ name: n, checked: false })))
      if (names[0]) setPreview(names[0])
    })
  }, [])

  const selected = useMemo(() => clips.filter(c => c.checked), [clips])
  const canSave = title.trim().length > 0 && selected.length > 0 && !saving

  const toggle = (name: string) => {
    setClips(prev => prev.map(c => c.name === name ? { ...c, checked: !c.checked } : c))
  }

  const setItemLabel = (name: string, label: string) => {
    setClips(prev => prev.map(c => c.name === name ? { ...c, label: label || undefined } : c))
  }

  const move = (name: string, dir: -1 | 1) => {
    const idx = selected.findIndex(x => x.name === name)
    if (idx < 0) return
    const newOrder = [...selected]
    const ni = idx + dir
    if (ni < 0 || ni >= newOrder.length) return
    const tmp = newOrder[idx]; newOrder[idx] = newOrder[ni]; newOrder[ni] = tmp
    // write back into clips array
    setClips(prev => {
      const map = new Map(newOrder.map(it => [it.name, it]))
      return prev.map(c => map.has(c.name) ? { ...map.get(c.name)!, checked: true } : c)
    })
  }

  const save = async () => {
    setSaving(true); setMessage('')
    try {
      const payload: SaveGroupRequest = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        published,
        tagsJson: undefined,
        items: selected.map(s => ({ fileName: s.name, label: s.label || undefined }))
      }
      const created = await animgroups.create(payload)
      setMessage(`Saved group "${created.title}" (slug: ${created.slug}) with ${created.items.length} item(s).`)
      // reset
      setTitle(''); setSlug(''); setDescription(''); setPublished(false)
      setClips(prev => prev.map(c => ({ ...c, checked: false, label: undefined })))
    } catch (e: any) {
      setMessage(e?.response?.data ?? e?.message ?? 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.wrap}>
        {/* Left: builder */}
        <div className={styles.card}>
          <h2 className={styles.h2}>New Animation Group</h2>

          <div className={styles.row}>
            <input className={styles.input} placeholder="Title (e.g., Breakdance Combo A)"
                   value={title} onChange={e => setTitle(e.target.value)} />
            <input className={styles.input} placeholder="Custom slug (optional)"
                   value={slug} onChange={e => setSlug(e.target.value)} />
          </div>

          <div className={styles.row}>
            <textarea className={styles.input} rows={3} placeholder="Description (optional)"
                      value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className={styles.row}>
            <label><input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} /> Published</label>
            <span className={styles.kbd}>Tip:</span>
            <span className={styles.kbd}>Click a name to preview • Use ↑/↓ to reorder</span>
          </div>

          <div className={styles.row}>
            <div style={{flex:1}}>
              <div style={{marginBottom:6}}>Clips</div>
              <div className={styles.list}>
                {clips.map(c => (
                  <div className={`${styles.item} ${c.checked ? styles.selected : ''}`} key={c.name}>
                    <input type="checkbox" checked={c.checked} onChange={() => toggle(c.name)} />
                    <label onClick={() => setPreview(c.name)} title={c.name}>{c.name}</label>
                    {c.checked && (
                      <>
                        <select className={styles.select} value={c.label ?? ''} onChange={e => setItemLabel(c.name, e.target.value)}>
                          {LABELS.map(l => <option key={l} value={l}>{l || '(—)'}</option>)}
                        </select>
                        <Button className={styles.btn} onClick={() => move(c.name, -1)} title="Move up">↑</Button>
                        <Button className={styles.btn} onClick={() => move(c.name, +1)} title="Move down">↓</Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.row}>
            <Button disabled={!canSave} onClick={save}>{saving ? 'Saving…' : 'Save Group'}</Button>
            <div style={{opacity:.85}}>{message}</div>
          </div>
        </div>

        {/* Right: preview */}
        <div className={styles.card}>
          <h2 className={styles.h2}>Preview</h2>
          <AsciiPreview fileName={preview} />
          <div style={{marginTop:8, fontSize:12, opacity:.85}}>
            Loading from: <code>{ANIM_DIR}{preview ?? '(none selected)'}</code>
          </div>
        </div>
      </div>
    </div>
  )
}
