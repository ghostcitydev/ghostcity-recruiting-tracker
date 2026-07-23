'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { safeJson } from '@/lib/safeFetch';

type SaveFile = { name: string; path: string };
type Season = { id: string; year: number; label: string };
type ImportResult = {
  seasonYear: number;
  snapshot: 'preseason' | 'signing_day';
  teamsImported: number;
  teamsSkipped: string[];
};

export default function ImportPage() {
  const [saves, setSaves] = useState<SaveFile[]>([]);
  const [saveDir, setSaveDir] = useState('');
  const [defaultDir, setDefaultDir] = useState('');
  const [isDefaultDir, setIsDefaultDir] = useState(true);
  const [selectedPath, setSelectedPath] = useState('');
  const [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [snapshot, setSnapshot] = useState<'signing_day' | 'preseason'>('signing_day');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showFolderEdit, setShowFolderEdit] = useState(false);
  const [folderInput, setFolderInput] = useState('');
  const [folderSaving, setFolderSaving] = useState(false);
  const [folderError, setFolderError] = useState('');
  const router = useRouter();

  function loadSeasons() {
    safeJson<Season[]>('/api/seasons').then((res) => {
      if (res.ok) setSeasons(res.data ?? []);
      else setLoadError(res.error ?? 'Failed to load seasons');
    });
  }

  function loadSaves() {
    return safeJson<{ dir: string; defaultDir: string; isDefault: boolean; saves: SaveFile[]; error?: string }>('/api/saves').then((res) => {
      if (!res.ok) { setLoadError(res.error ?? 'Failed to load saves'); return; }
      const data = res.data;
      if (!data) return;
      setSaveDir(data.dir);
      setDefaultDir(data.defaultDir);
      setIsDefaultDir(data.isDefault);
      setSaves(data.saves);
      setSelectedPath(data.saves.length ? data.saves[0].path : '');
      setLoadError(data.error ?? '');
    });
  }

  useEffect(() => {
    loadSaves();
    loadSeasons();
  }, []);

  async function saveFolder() {
    setFolderSaving(true);
    setFolderError('');
    try {
      const res = await fetch('/api/app-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saveDir: folderInput.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) { setFolderError(data.error ?? 'Failed to save folder'); return; }
      setShowFolderEdit(false);
      await loadSaves();
    } catch (e) {
      setFolderError(e instanceof Error ? e.message : 'Failed to save folder');
    } finally {
      setFolderSaving(false);
    }
  }

  async function resetFolder() {
    setFolderSaving(true);
    setFolderError('');
    try {
      await fetch('/api/app-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saveDir: null }),
      });
      setShowFolderEdit(false);
      await loadSaves();
    } finally {
      setFolderSaving(false);
    }
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPath) return;
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedPath, snapshot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResult(data);
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
      setStatus('error');
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-xl font-bold" style={{ color: 'var(--ocean-100)' }}>Import Dynasty Save</h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--ocean-400)' }}>
        Select a dynasty save file below. Read-only — the file is never modified.
        Import twice per season: once at <strong style={{ color: 'var(--ocean-200)' }}>Preseason</strong> and once after <strong style={{ color: 'var(--ocean-200)' }}>National Signing Day</strong>.
        The tracker detects the season year automatically.
      </p>

      <form onSubmit={handleImport} className="mt-6 flex flex-col gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-500)' }}>
            Save File
          </label>
          {saves.length > 0 ? (
            <select
              value={selectedPath}
              onChange={(e) => setSelectedPath(e.target.value)}
              className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
              style={{
                background: 'var(--ocean-900)',
                borderColor: 'var(--ocean-700)',
                color: 'var(--ocean-100)',
              }}
            >
              {saves.map((s) => (
                <option key={s.path} value={s.path}>{s.name}</option>
              ))}
            </select>
          ) : (
            <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'var(--ocean-700)', background: 'var(--ocean-900)', color: 'var(--ocean-400)' }}>
              {loadError || 'No dynasty save files found'}
            </div>
          )}
          {!showFolderEdit ? (
            <p className="mt-1.5 text-xs" style={{ color: 'var(--ocean-500)' }}>
              Looking in: {saveDir}
              {!isDefaultDir && <span style={{ color: 'var(--ocean-400)' }}> (custom)</span>}
              {' · '}
              <button
                type="button"
                onClick={() => { setFolderInput(saveDir); setFolderError(''); setShowFolderEdit(true); }}
                className="underline hover:opacity-80"
              >
                Change
              </button>
            </p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              <input
                type="text"
                value={folderInput}
                onChange={(e) => setFolderInput(e.target.value)}
                placeholder={defaultDir}
                className="w-full rounded-lg border px-3 py-2 text-xs outline-none"
                style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-700)', color: 'var(--ocean-100)' }}
              />
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={saveFolder}
                  disabled={folderSaving}
                  className="rounded px-3 py-1.5 font-medium text-white disabled:opacity-40"
                  style={{ background: 'var(--ocean-600)' }}
                >
                  Save
                </button>
                {!isDefaultDir && (
                  <button
                    type="button"
                    onClick={resetFolder}
                    disabled={folderSaving}
                    className="underline hover:opacity-80 disabled:opacity-40"
                    style={{ color: 'var(--ocean-400)' }}
                  >
                    Reset to default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setShowFolderEdit(false); setFolderError(''); }}
                  className="underline hover:opacity-80"
                  style={{ color: 'var(--ocean-400)' }}
                >
                  Cancel
                </button>
              </div>
              {folderError && <p style={{ color: '#fca5a5' }}>{folderError}</p>}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-500)' }}>
            Snapshot Type
          </label>
          <div className="flex gap-3">
            {(['signing_day', 'preseason'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSnapshot(s)}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  background: snapshot === s ? 'var(--ocean-600)' : 'var(--ocean-900)',
                  borderColor: snapshot === s ? 'var(--ocean-500)' : 'var(--ocean-700)',
                  color: snapshot === s ? '#fff' : 'var(--ocean-400)',
                }}
              >
                {s === 'signing_day' ? 'Signing Day' : 'Preseason'}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs" style={{ color: 'var(--ocean-500)' }}>
            {snapshot === 'signing_day'
              ? 'Import after National Signing Day to capture final class commitments.'
              : 'Import at season start to capture preseason roster and pipeline state.'}
          </p>
        </div>

        <button
          type="submit"
          disabled={status === 'loading' || !selectedPath}
          suppressHydrationWarning
          className="self-start rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: 'var(--ocean-600)' }}
        >
          {status === 'loading' ? 'Importing…' : 'Import Save'}
        </button>
      </form>

      {status === 'error' && (
        <div className="mt-5 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#FCA5A5', background: 'rgba(220,38,38,0.08)', color: '#991b1b' }}>
          {error}
        </div>
      )}

      {status === 'done' && result && (
        <div className="mt-5 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'var(--ocean-700)', background: 'var(--ocean-900)', color: 'var(--ocean-200)' }}>
          <p>Imported <strong style={{ color: 'var(--ocean-100)' }}>Season {result.seasonYear} — {result.snapshot === 'preseason' ? 'Preseason' : 'Signing Day'}</strong> · {result.teamsImported} teams.</p>
          {result.teamsSkipped.length > 0 && (
            <p className="mt-1" style={{ color: 'var(--ocean-400)' }}>Skipped: {result.teamsSkipped.join(', ')}</p>
          )}
          <button
            onClick={() => router.push('/')}
            className="mt-3 rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: 'var(--ocean-600)' }}
          >
            View Dashboard
          </button>
        </div>
      )}

      {/* Season management */}
      {seasons.length > 0 && (
        <div className="mt-10 border-t pt-8" style={{ borderColor: 'var(--ocean-800)' }}>
          <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ocean-400)' }}>Imported Seasons</h2>
          <div className="mt-3 flex flex-col gap-2">
            {seasons.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border px-4 py-2.5"
                style={{ borderColor: 'var(--ocean-800)', background: 'var(--ocean-900)' }}
              >
                <span className="text-sm font-medium" style={{ color: 'var(--ocean-200)' }}>{s.label}</span>
                {confirmDeleteId === s.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--ocean-400)' }}>Delete all data?</span>
                    <button
                      onClick={async () => {
                        setConfirmDeleteId(null);
                        await fetch('/api/seasons', {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ seasonId: s.id }),
                        });
                        loadSeasons();
                      }}
                      className="rounded px-2.5 py-1 text-xs font-medium"
                      style={{ background: '#DC2626', color: '#fff' }}
                    >
                      Yes, delete
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded px-2.5 py-1 text-xs font-medium"
                      style={{ background: 'var(--ocean-800)', color: 'var(--ocean-400)', border: '1px solid var(--ocean-700)' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(s.id)}
                    className="rounded px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ background: '#DC2626', color: '#fff' }}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
