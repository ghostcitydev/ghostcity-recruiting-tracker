'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ImportResult = {
  seasonYear: number;
  teamsImported: number;
  teamsSkipped: string[];
};

export default function ImportPage() {
  const [path, setPath] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
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
        Point this at your CFB 27 DYNASTY save file. Read-only — the file is never modified.
        <br />
        Typical location: <code
          className="rounded px-1.5 py-0.5 text-xs"
          style={{ background: 'var(--ocean-800)', color: 'var(--ocean-300)' }}
        >Documents\EA SPORTS College Football 27\saves\DYNASTY-...</code>
      </p>

      <form onSubmit={handleImport} className="mt-6 flex flex-col gap-3">
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder={String.raw`C:\Users\you\Documents\EA SPORTS College Football 27\saves\DYNASTY-...`}
          className="rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors"
          style={{
            background: 'var(--ocean-900)',
            borderColor: 'var(--ocean-700)',
            color: 'var(--ocean-100)',
          }}
        />
        <button
          type="submit"
          disabled={status === 'loading' || !path}
          className="self-start rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: 'var(--ocean-600)' }}
        >
          {status === 'loading' ? 'Importing…' : 'Import Save'}
        </button>
      </form>

      {status === 'error' && (
        <div className="mt-5 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#991b1b', background: 'rgba(153,27,27,0.15)', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {status === 'done' && result && (
        <div className="mt-5 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'var(--ocean-700)', background: 'var(--ocean-900)', color: 'var(--ocean-200)' }}>
          <p>Imported season <strong style={{ color: 'var(--ocean-100)' }}>{result.seasonYear}</strong> — {result.teamsImported} teams with recruit breakdowns.</p>
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
    </div>
  );
}
