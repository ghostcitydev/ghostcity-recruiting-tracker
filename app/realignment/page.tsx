'use client';

import { useEffect, useMemo, useState } from 'react';
import { safeJson } from '@/lib/safeFetch';
import teamLogos from '@/lib/team-logos.json';

type Season = { id: string; year: number; label: string; snapshot: string };
type Move = { id: string; teamName: string; fromConference: string | null; toConference: string; season: Season };
type ForceWinGame = { id: string; week: number; homeTeam: string; awayTeam: string; forcedWinner: string; reason: string | null; season: Season };

type Tab = 'realignment' | 'forcewin';

function TeamLogo({ name }: { name: string }) {
  const url = (teamLogos as Record<string, string>)[name];
  if (!url) return null;
  return <img src={url} alt="" className="h-4 w-4 object-contain flex-shrink-0" />;
}

function SortHeader<T extends string>({
  col, label, active, dir, onClick, align = 'left',
}: { col: T; label: string; active: boolean; dir: 'asc' | 'desc'; onClick: (col: T) => void; align?: 'left' | 'right' }) {
  return (
    <th
      onClick={() => onClick(col)}
      className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`}
      style={{ color: active ? 'var(--ocean-200)' : 'var(--ocean-400)' }}
    >
      {label}{active ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );
}

export default function RealignmentPage() {
  const [tab, setTab] = useState<Tab>('realignment');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [realignSeasonId, setRealignSeasonId] = useState('');
  const [forceWinSeasonId, setForceWinSeasonId] = useState('');
  const [moves, setMoves] = useState<Move[]>([]);
  const [forceWinGames, setForceWinGames] = useState<ForceWinGame[]>([]);
  const [error, setError] = useState('');
  const [forceWinError, setForceWinError] = useState('');

  const [moveSortCol, setMoveSortCol] = useState<'team' | 'from' | 'to'>('team');
  const [moveSortDir, setMoveSortDir] = useState<'asc' | 'desc'>('asc');
  const [fwSortCol, setFwSortCol] = useState<'week' | 'away' | 'home' | 'winner'>('week');
  const [fwSortDir, setFwSortDir] = useState<'asc' | 'desc'>('asc');

  const realignmentSeasons = useMemo(() => seasons.filter((s) => s.snapshot === 'signing_day'), [seasons]);
  const forceWinSeasons = useMemo(() => seasons.filter((s) => s.snapshot === 'week_zero'), [seasons]);

  useEffect(() => {
    // Realignment recommendations are saved against Signing Day imports;
    // Force Win history is saved against Week 0 imports -- so this needs
    // every season, not just one snapshot type.
    safeJson<Season[]>('/api/seasons').then((res) => {
      if (!res.ok || !res.data) { setError(res.error ?? 'Could not load seasons.'); return; }
      setSeasons(res.data);
    });
  }, []);

  useEffect(() => {
    setRealignSeasonId((current) => current || realignmentSeasons[0]?.id || '');
  }, [realignmentSeasons]);

  useEffect(() => {
    setForceWinSeasonId((current) => current || forceWinSeasons[0]?.id || '');
  }, [forceWinSeasons]);

  useEffect(() => {
    if (!realignSeasonId) { setMoves([]); return; }
    safeJson<Move[]>(`/api/realignment?seasonId=${encodeURIComponent(realignSeasonId)}`).then((res) => {
      if (!res.ok || !res.data) { setError(res.error ?? 'Could not load realignment recommendations.'); return; }
      setError(''); setMoves(res.data);
    });
  }, [realignSeasonId]);

  useEffect(() => {
    if (!forceWinSeasonId) { setForceWinGames([]); return; }
    safeJson<ForceWinGame[]>(`/api/force-win?seasonId=${encodeURIComponent(forceWinSeasonId)}`).then((res) => {
      if (!res.ok || !res.data) { setForceWinError(res.error ?? 'Could not load Force Win history.'); return; }
      setForceWinError(''); setForceWinGames(res.data);
    });
  }, [forceWinSeasonId]);

  const selectedRealignSeason = useMemo(() => realignmentSeasons.find((s) => s.id === realignSeasonId), [realignmentSeasons, realignSeasonId]);
  const selectedForceWinSeason = useMemo(() => forceWinSeasons.find((s) => s.id === forceWinSeasonId), [forceWinSeasons, forceWinSeasonId]);

  const toggleMoveSort = (col: 'team' | 'from' | 'to') => {
    if (moveSortCol === col) setMoveSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setMoveSortCol(col); setMoveSortDir('asc'); }
  };
  const toggleFwSort = (col: 'week' | 'away' | 'home' | 'winner') => {
    if (fwSortCol === col) setFwSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setFwSortCol(col); setFwSortDir('asc'); }
  };

  const sortedMoves = useMemo(() => {
    const dir = moveSortDir === 'asc' ? 1 : -1;
    return [...moves].sort((a, b) => {
      if (moveSortCol === 'team') return dir * a.teamName.localeCompare(b.teamName);
      if (moveSortCol === 'from') return dir * (a.fromConference ?? '').localeCompare(b.fromConference ?? '');
      return dir * a.toConference.localeCompare(b.toConference);
    });
  }, [moves, moveSortCol, moveSortDir]);

  const sortedForceWinGames = useMemo(() => {
    const dir = fwSortDir === 'asc' ? 1 : -1;
    return [...forceWinGames].sort((a, b) => {
      if (fwSortCol === 'week') return dir * (a.week - b.week);
      if (fwSortCol === 'away') return dir * a.awayTeam.localeCompare(b.awayTeam);
      if (fwSortCol === 'home') return dir * a.homeTeam.localeCompare(b.homeTeam);
      return dir * a.forcedWinner.localeCompare(b.forcedWinner);
    });
  }, [forceWinGames, fwSortCol, fwSortDir]);

  return (
    <div className="mx-auto max-w-[1160px] px-6 py-8">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--ocean-100)' }}>Toolbox Outputs</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--ocean-400)' }}>Saved results from your imports. These are records only—apply any realignment move yourself through CFB 27&apos;s Custom Conferences menu.</p>
      </div>

      {/* Subtabs */}
      <div className="mt-4 flex gap-1 border-b" style={{ borderColor: 'var(--ocean-700)' }}>
        {([['realignment', 'Conference Realignment'], ['forcewin', 'Force Win']] as [Tab, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderColor: tab === value ? 'var(--ocean-400)' : 'transparent',
              color: tab === value ? 'var(--ocean-100)' : 'var(--ocean-500)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-4 rounded border px-4 py-3 text-sm" style={{ borderColor: '#ef4444', color: '#fca5a5' }}>{error}</p> : null}

      {tab === 'realignment' && (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-400)' }}>
              Signing Day import
              <select className="ml-2 rounded border px-2 py-1 text-sm normal-case font-normal" style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-700)', color: 'var(--ocean-100)' }} value={realignSeasonId} onChange={(event) => setRealignSeasonId(event.target.value)}>
                {realignmentSeasons.map((season) => <option key={season.id} value={season.id}>{season.label}</option>)}
              </select>
            </label>
          </div>
          {!realignmentSeasons.length ? (
            <p className="rounded border px-4 py-3 text-sm" style={{ borderColor: 'var(--ocean-700)', color: 'var(--ocean-400)' }}>No Signing Day imports yet.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--ocean-700)', background: 'var(--ocean-900)' }}>
              <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: 'var(--ocean-700)' }}>
                <strong className="text-sm" style={{ color: 'var(--ocean-100)' }}>{selectedRealignSeason?.label}</strong>
                <span className="text-xs" style={{ color: 'var(--ocean-400)' }}>{moves.length} recommendation{moves.length === 1 ? '' : 's'}</span>
              </div>
              {sortedMoves.length ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left">
                      <SortHeader col="team" label="Team" active={moveSortCol === 'team'} dir={moveSortDir} onClick={toggleMoveSort} />
                      <SortHeader col="from" label="Current conference" active={moveSortCol === 'from'} dir={moveSortDir} onClick={toggleMoveSort} />
                      <SortHeader col="to" label="Recommended conference" active={moveSortCol === 'to'} dir={moveSortDir} onClick={toggleMoveSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMoves.map((move) => (
                      <tr key={move.id} className="border-t" style={{ borderColor: 'var(--ocean-800)', color: 'var(--ocean-200)' }}>
                        <td className="px-3 py-2 font-medium">
                          <span className="flex items-center gap-2"><TeamLogo name={move.teamName} />{move.teamName}</span>
                        </td>
                        <td className="px-3 py-2" style={{ color: 'var(--ocean-400)' }}>{move.fromConference ?? '—'}</td>
                        <td className="px-3 py-2 font-medium" style={{ color: 'var(--ocean-100)' }}>{move.toConference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ocean-400)' }}>No realignment recommendations were saved for this import.</p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'forcewin' && (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-400)' }}>
              Week 0 import
              <select className="ml-2 rounded border px-2 py-1 text-sm normal-case font-normal" style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-700)', color: 'var(--ocean-100)' }} value={forceWinSeasonId} onChange={(event) => setForceWinSeasonId(event.target.value)}>
                {forceWinSeasons.map((season) => <option key={season.id} value={season.id}>{season.label}</option>)}
              </select>
            </label>
          </div>
          {!forceWinSeasons.length ? (
            <p className="rounded border px-4 py-3 text-sm" style={{ borderColor: 'var(--ocean-700)', color: 'var(--ocean-400)' }}>No Week 0 imports yet.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--ocean-700)', background: 'var(--ocean-900)' }}>
              <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: 'var(--ocean-700)' }}>
                <div>
                  <strong className="text-sm" style={{ color: 'var(--ocean-100)' }}>{selectedForceWinSeason?.label}</strong>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--ocean-500)' }}>Games force-decided at import, while the save was still at Week 0.</p>
                </div>
                <span className="text-xs" style={{ color: 'var(--ocean-400)' }}>{forceWinGames.length} game{forceWinGames.length === 1 ? '' : 's'}</span>
              </div>
              {forceWinError ? <p className="px-4 py-3 text-sm" style={{ color: '#fca5a5' }}>{forceWinError}</p> : null}
              {!forceWinError && sortedForceWinGames.length ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left">
                      <SortHeader col="week" label="Week" active={fwSortCol === 'week'} dir={fwSortDir} onClick={toggleFwSort} />
                      <SortHeader col="away" label="Away" active={fwSortCol === 'away'} dir={fwSortDir} onClick={toggleFwSort} />
                      <SortHeader col="home" label="Home" active={fwSortCol === 'home'} dir={fwSortDir} onClick={toggleFwSort} />
                      <SortHeader col="winner" label="Forced winner" active={fwSortCol === 'winner'} dir={fwSortDir} onClick={toggleFwSort} />
                      <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-left" style={{ color: 'var(--ocean-400)' }}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedForceWinGames.map((game) => (
                      <tr key={game.id} className="border-t" style={{ borderColor: 'var(--ocean-800)', color: 'var(--ocean-200)' }}>
                        <td className="px-3 py-2 font-medium">{game.week}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--ocean-400)' }}>
                          <span className="flex items-center gap-1.5"><TeamLogo name={game.awayTeam} />{game.awayTeam}</span>
                        </td>
                        <td className="px-3 py-2" style={{ color: 'var(--ocean-400)' }}>
                          <span className="flex items-center gap-1.5"><TeamLogo name={game.homeTeam} />{game.homeTeam}</span>
                        </td>
                        <td className="px-3 py-2 font-medium" style={{ color: 'var(--ocean-100)' }}>
                          <span className="flex items-center gap-1.5"><TeamLogo name={game.forcedWinner} />{game.forcedWinner}</span>
                        </td>
                        <td className="px-3 py-2 text-[11px]" style={{ color: 'var(--ocean-500)' }} title={game.reason ?? undefined}>{game.reason ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
              {!forceWinError && !sortedForceWinGames.length ? <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ocean-400)' }}>No Force Win games were saved for this import.</p> : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
