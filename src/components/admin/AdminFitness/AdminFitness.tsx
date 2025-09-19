import React, { useEffect, useRef, useState } from 'react';
import Navbar from '@/components/navbar/Navbar';
import { http } from '@/api/api';
import { useAuth } from '@/components/auth/AuthContext';
import styles from './AdminFitness.module.css';

type ListResponse = {
  zipFiles: { fileName: string; fullPath: string; size: number; createdUtc: string }[];
  extracted: { folderName: string; fullPath: string; createdUtc: string }[];
};

export default function AdminFitness() {
  const { isAuthed, isAdmin, email } = useAuth();
  const [list, setList] = useState<ListResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>('');
  const [label, setLabel] = useState<string>('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const refresh = async () => {
    try {
      const res = await http.get<ListResponse>('/api/shealth/list');
      setList(res);
    } catch (e: any) {
      setMsg(e?.message ?? 'Failed to load list.');
    }
  };
  useEffect(() => { if (isAuthed && isAdmin) refresh(); }, [isAuthed, isAdmin]);

  const humanSize = (n: number) => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
    return `${(n / 1024 ** 3).toFixed(2)} GB`;
    };

  const onUpload = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f) { setMsg('Choose a .zip first.'); return; }
    setBusy(true); setMsg('Uploading…');
    try {
      const fd = new FormData();
      fd.append('file', f);
      if (label.trim()) fd.append('label', label.trim());
      const json = await http.postForm<{ zipSavedAs: string; extractedFolderName: string }>(
        '/api/shealth/upload-zip',
        fd
      );
      setMsg(`ZIP saved & extracted → ${json.extractedFolderName}`);
      await refresh();
    } catch (e: any) {
      setMsg(e?.message ?? 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };
const onDeleteAllDaily = async () => {
  if (!confirm('⚠️ This will permanently delete ALL rows in FitnessDaily for ALL users. Continue?')) return;

  const typed = prompt('Type DELETE to confirm:')?.trim();
  if (typed !== 'DELETE') { setMsg('Cancelled.'); return; }

  setBusy(true);
  setMsg('Deleting all FitnessDaily rows…');

  try {
    // Either call the helper:
    // const res = await fitness.daily.truncate();
    // Or call the API directly:
    const res = await http.del<{ deleted: number }>(`/api/fitness/daily/all`);
    const deleted = res?.deleted ?? 0;
    setMsg(`🗑️ Deleted ${deleted} row(s) from FitnessDaily.`);
  } catch (e: any) {
    const apiMsg =
      e?.response?.data?.detail ||
      e?.response?.data ||
      e?.message ||
      'Delete-all failed.';
    setMsg(apiMsg);
  } finally {
    setBusy(false);
  }
};

  const onProcessAll = async () => {
    setBusy(true);
    setMsg('Processing ALL extracted folders…');
    try {
      const res = await http.post<any>('/api/shealth/process-all');
      const processed = res?.processed ?? 0;
      const real = res?.totalUpsertedReal ?? 0;
      const syn = res?.totalUpsertedSynthetic ?? 0;
      setMsg(`Processed ${processed} folder(s). Upserted ${real} real + ${syn} synthetic rows.`);
    } catch (e: any) {
      const apiMsg =
        e?.response?.data?.detail ||
        e?.response?.data ||
        e?.message ||
        'Process-all failed.';
      setMsg(apiMsg);
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  if (!isAuthed) {
    return (
      <div className={styles.root}>
        <Navbar overlay brand="medenijazbec.pro" />
        <main className={styles.main}>
          <div className={styles.wrap}>
            <div className={styles.card}>Not logged in.</div>
          </div>
        </main>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className={styles.root}>
        <Navbar overlay brand="medenijazbec.pro" />
        <main className={styles.main}>
          <div className={styles.wrap}>
            <div className={styles.card}>You’re logged in, but not an admin.</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Navbar overlay brand="medenijazbec.pro" />
      <main className={styles.main}>
        <div className={styles.wrap}>
          {/* Upload / Extract */}
          <div className={styles.card}>
            <h2 className={styles.h2}>Upload Samsung Health .zip</h2>
            <div className={styles.row}>
              <input
                ref={fileRef}
                type="file"
                accept=".zip"
                className={styles.input}
              />
              <input
                type="text"
                placeholder="optional label (e.g. phone-export-2025-09)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className={styles.input}
                style={{ minWidth: 240 }}
              />
              <button className={`${styles.btn} ${styles.primary}`} disabled={busy} onClick={onUpload}>
                {busy ? 'Working…' : 'Upload ZIP'}
              </button>
              <button className={styles.btn} onClick={refresh} disabled={busy}>Refresh</button>
            </div>
            <div className={styles.meta}>
              Logged in as <b>{email}</b>. ZIP is saved to <code className={styles.kbd}>ZIP_FILES</code>, then extracted into <code className={styles.kbd}>RAW_DATA/&lt;folder&gt;</code>.
            </div>
            {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
          </div>

          {/* ZIP Files */}
          <div className={styles.card}>
            <h2 className={styles.h2}>ZIP Files</h2>
            {!list?.zipFiles?.length ? (
              <div className={styles.meta}>No ZIPs yet.</div>
            ) : (
              <table className={styles.table}>
                <thead><tr><th>Name</th><th>Size</th><th>Created (UTC)</th></tr></thead>
                <tbody>
                  {list.zipFiles.map(z => (
                    <tr key={z.fileName}>
                      <td className={`${styles.mono}`}>{z.fileName}</td>
                      <td>{humanSize(z.size)}</td>
                      <td className={styles.meta}>{new Date(z.createdUtc).toISOString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
            {/* Danger Zone */}
            <div
              className={styles.card}
              style={{
                borderColor: 'rgba(255,107,107,0.45)',
                boxShadow: '0 0 12px rgba(255,107,107,0.25)',
              }}
            >
              <h2 className={styles.h2}>Danger Zone</h2>
              <div className={styles.meta}>
                This will permanently delete <b>ALL</b> rows in{' '}
                <code className={styles.kbd}>FitnessDaily</code> for every user. This cannot be undone.
              </div>

              <div className={styles.row} style={{ marginTop: 8 }}>
                <button
                  className={styles.btn}
                  style={{ borderColor: 'rgba(255,107,107,0.75)' }}
                  onClick={onDeleteAllDaily}
                  disabled={busy}
                  title="Delete all rows from FitnessDaily (admin only)"
                  aria-label="Delete all FitnessDaily rows"
                >
                  {busy ? 'Working…' : 'Delete ALL FitnessDaily rows'}
                </button>
              </div>
            </div>

          {/* Extracted Folders */}
          <div className={styles.card}>
            <h2 className={styles.h2}>Extracted Folders</h2>
            <div className={styles.row} style={{ justifyContent: 'flex-end', marginTop: -8, marginBottom: 8 }}>
              <button
                className={`${styles.btn} ${styles.primary}`}
                onClick={onProcessAll}
                disabled={busy || !list?.extracted?.length}
                title="Run Python pipeline for every extracted folder and insert into FitnessDaily"
              >
                {busy ? 'Working…' : 'Process ALL & Insert'}
              </button>
            </div>

            {!list?.extracted?.length ? (
              <div className={styles.meta}>Nothing extracted yet.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr><th>Folder</th><th>Created (UTC)</th></tr>
                </thead>
                <tbody>
                  {list.extracted.map(x => (
                    <tr key={x.folderName}>
                      <td className={styles.mono}>{x.folderName}</td>
                      <td className={styles.meta}>{new Date(x.createdUtc).toISOString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
