'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Season = { id: string; year: number; label: string };
type TeamStat = {
  id: string;
  overall: number | null;
  prestige: number | null;
  prestigeRank: number | null;
  recruitingRank: number | null;
  teamRank: number | null;
  wins: number | null;
  losses: number | null;
  transfersIn: number | null;
  transfersOut: number | null;
  recruitCount: number | null;
  unsignedRecruits: number | null;
  rosterSize: number | null;
  team: {
    id: string;
    name: string;
    shortName: string | null;
    conference: string;
    logoUrl: string | null;
  };
};

type SortKey = 'name' | 'conference' | 'overall' | 'prestige' | 'recruitingRank' | 'record' | 'transfersIn' | 'transfersOut' | 'recruitCount';

export default function Dashboard() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState<string>('');
  const [stats, setStats] = useState<TeamStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [conferenceFilter, setConferenceFilter] = useState<string>('All');
  const [sortKey, setSortKey] = useState<SortKey>('overall');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetch('/api/seasons').then((r) => r.json()).then((data: Season[]) => {
      setSeasons(data);
      if (data.length) setSeasonId(data[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!seasonId) return;
    fetch(`/api/stats?seasonId=${seasonId}`).then((r) => r.json()).then(setStats);
  }, [seasonId]);

  const conferences = useMemo(() => {
    const set = new Set(stats.map((s) => s.team.conference));
    return ['All', ...Array.from(set).sort()];
  }, [stats]);

  const rows = useMemo(() => {
    let filtered = conferenceFilter === 'All' ? stats : stats.filter((s) => s.team.conference === conferenceFilter);
    filtered = [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'name': return dir * a.team.name.localeCompare(b.team.name);
        case 'conference': return dir * a.team.conference.localeCompare(b.team.conference) || a.team.name.localeCompare(b.team.name);
        case 'overall': return dir * ((a.overall ?? -1) - (b.overall ?? -1));
        case 'prestige': return dir * ((a.prestige ?? -1) - (b.prestige ?? -1));
        case 'recruitingRank': {
          const av = a.recruitingRank ?? 9999, bv = b.recruitingRank ?? 9999;
          return -dir * (av - bv); // lower rank number = better, so invert
        }
        case 'record': return dir * ((a.wins ?? 0) - (a.losses ?? 0) - ((b.wins ?? 0) - (b.losses ?? 0)));
        case 'transfersIn': return dir * ((a.transfersIn ?? -1) - (b.transfersIn ?? -1));
        case 'transfersOut': return dir * ((a.transfersOut ?? -1) - (b.transfersOut ?? -1));
        case 'recruitCount': return dir * ((a.recruitCount ?? -1) - (b.recruitCount ?? -1));
        default: return 0;
      }
    });
    return filtered;
  }, [stats, conferenceFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function Th({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) {
    const active = sortKey === sortKeyName;
    return (
      <th
        onClick={() => toggleSort(sortKeyName)}
        className={`cursor-pointer select-none px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide ${active ? 'text-zinc-100' : 'text-zinc-500'} hover:text-zinc-200`}
      >
        {label}{active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
      </th>
    );
  }

  if (loading) return <div className="p-6 text-zinc-400">Loading…</div>;

  if (!seasons.length) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-zinc-100">No seasons imported yet</h1>
        <p className="mt-2 text-zinc-400">Import your CFB 27 dynasty save to see team overalls, recruiting ranks, transfers, and more.</p>
        <Link href="/import" className="mt-6 inline-block rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500">
          Import a save file
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div>
          <label className="mr-2 text-sm text-zinc-400">Season</label>
          <select
            value={seasonId}
            onChange={(e) => setSeasonId(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mr-2 text-sm text-zinc-400">Conference</label>
          <select
            value={conferenceFilter}
            onChange={(e) => setConferenceFilter(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
          >
            {conferences.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <span className="text-sm text-zinc-500">{rows.length} teams</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-zinc-900">
            <tr>
              <th className="px-3 py-2"></th>
              <Th label="Team" sortKeyName="name" />
              <Th label="Conference" sortKeyName="conference" />
              <Th label="OVR" sortKeyName="overall" />
              <Th label="Prestige" sortKeyName="prestige" />
              <Th label="Recruit Rank" sortKeyName="recruitingRank" />
              <Th label="Record" sortKeyName="record" />
              <Th label="Transfers In" sortKeyName="transfersIn" />
              <Th label="Transfers Out" sortKeyName="transfersOut" />
              <Th label="Recruits Signed" sortKeyName="recruitCount" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900/40'}>
                <td className="px-3 py-2">
                  {r.team.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.team.logoUrl} alt="" className="h-6 w-6 object-contain" />
                  ) : null}
                </td>
                <td className="px-3 py-2 font-medium text-zinc-100">{r.team.name}</td>
                <td className="px-3 py-2 text-zinc-400">{r.team.conference}</td>
                <td className="px-3 py-2 tabular-nums text-zinc-200">{r.overall ?? '—'}</td>
                <td className="px-3 py-2 tabular-nums text-zinc-200">{r.prestige ?? '—'}</td>
                <td className="px-3 py-2 tabular-nums text-zinc-200">{r.recruitingRank ?? '—'}</td>
                <td className="px-3 py-2 tabular-nums text-zinc-200">{r.wins ?? 0}-{r.losses ?? 0}</td>
                <td className="px-3 py-2 tabular-nums text-emerald-400">{r.transfersIn ?? '—'}</td>
                <td className="px-3 py-2 tabular-nums text-rose-400">{r.transfersOut ?? '—'}</td>
                <td className="px-3 py-2 tabular-nums text-zinc-200">{r.recruitCount ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
