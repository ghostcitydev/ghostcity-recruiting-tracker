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
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-xl font-semibold text-zinc-100">Import a Dynasty Save</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Point this at your CFB 27 DYNASTY save file. It&apos;s read-only — the file is only read, never modified.
        Typical location: <code className="rounded bg-zinc-900 px-1 py-0.5 text-zinc-300">Documents\EA SPORTS College Football 27\saves\DYNASTY-...</code>
      </p>

      <form onSubmit={handleImport} className="mt-6 flex flex-col gap-3">
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder={String.raw`C:\Users\you\Documents\EA SPORTS College Football 27\saves\DYNASTY-...`}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
        />
        <button
          type="submit"
          disabled={status === 'loading' || !path}
          className="self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {status === 'loading' ? 'Importing…' : 'Import'}
        </button>
      </form>

      {status === 'error' && (
        <p className="mt-4 rounded-md border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-300">{error}</p>
      )}

      {status === 'done' && result && (
        <div className="mt-4 rounded-md border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
          <p>Imported season <strong>{result.seasonYear}</strong> — {result.teamsImported} teams.</p>
          {result.teamsSkipped.length > 0 && (
            <p className="mt-1 text-emerald-400/70">Skipped (not real programs): {result.teamsSkipped.join(', ')}</p>
          )}
          <button
            onClick={() => router.push('/')}
            className="mt-3 rounded-md bg-emerald-700 px-3 py-1.5 text-white hover:bg-emerald-600"
          >
            View dashboard
          </button>
        </div>
      )}
    </div>
  );
}
