'use client';

import { useEffect, useMemo, useState } from 'react';
import { safeJson } from '@/lib/safeFetch';

type Season = { id: string; year: number; label: string; snapshot: string };
type Move = { id: string; teamName: string; fromConference: string | null; toConference: string; season: Season };

export default function RealignmentPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [moves, setMoves] = useState<Move[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    safeJson<Season[]>('/api/seasons?snapshot=signing_day').then((res) => {
      if (!res.ok || !res.data) { setError(res.error ?? 'Could not load Signing Day seasons.'); return; }
      setSeasons(res.data);
      setSeasonId((current) => current || res.data[0]?.id || '');
    });
  }, []);

  useEffect(() => {
    if (!seasonId) { setMoves([]); return; }
    safeJson<Move[]>(`/api/realignment?seasonId=${encodeURIComponent(seasonId)}`).then((res) => {
      if (!res.ok || !res.data) { setError(res.error ?? 'Could not load realignment recommendations.'); return; }
      setError(''); setMoves(res.data);
    });
  }, [seasonId]);

  const selected = useMemo(() => seasons.find((season) => season.id === seasonId), [seasons, seasonId]);
  return (
    <div className="mx-auto max-w-[1160px] px-6 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--ocean-100)' }}>Conference Realignment</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--ocean-400)' }}>Saved recommendations from each Signing Day import. These are records only—apply any move yourself through CFB 27&apos;s Custom Conferences menu.</p>
        </div>
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-400)' }}>
          Signing Day
          <select className="ml-2 rounded border px-2 py-1 text-sm normal-case font-normal" style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-700)', color: 'var(--ocean-100)' }} value={seasonId} onChange={(event) => setSeasonId(event.target.value)}>
            {seasons.map((season) => <option key={season.id} value={season.id}>{season.label}</option>)}
          </select>
        </label>
      </div>
      {error ? <p className="rounded border px-4 py-3 text-sm" style={{ borderColor: '#ef4444', color: '#fca5a5' }}>{error}</p> : null}
      {!error && !selected ? <p className="rounded border px-4 py-3 text-sm" style={{ borderColor: 'var(--ocean-700)', color: 'var(--ocean-400)' }}>No Signing Day imports yet.</p> : null}
      {selected ? <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--ocean-700)', background: 'var(--ocean-900)' }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--ocean-700)' }}>
          <strong style={{ color: 'var(--ocean-100)' }}>{selected.label}</strong>
          <span className="text-sm" style={{ color: 'var(--ocean-400)' }}>{moves.length} recommendation{moves.length === 1 ? '' : 's'}</span>
        </div>
        {moves.length ? <table className="w-full text-sm"><thead style={{ color: 'var(--ocean-400)' }}><tr className="text-left"><th className="px-4 py-3">Team</th><th className="px-4 py-3">Current conference</th><th className="px-4 py-3">Recommended conference</th></tr></thead><tbody>{moves.map((move) => <tr key={move.id} className="border-t" style={{ borderColor: 'var(--ocean-800)', color: 'var(--ocean-200)' }}><td className="px-4 py-3 font-medium">{move.teamName}</td><td className="px-4 py-3" style={{ color: 'var(--ocean-400)' }}>{move.fromConference ?? '—'}</td><td className="px-4 py-3 font-medium" style={{ color: 'var(--ocean-100)' }}>{move.toConference}</td></tr>)}</tbody></table> : <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ocean-400)' }}>No realignment recommendations were saved for this import.</p>}
      </div> : null}
    </div>
  );
}
