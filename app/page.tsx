'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { safeJson } from '@/lib/safeFetch';

type Season = { id: string; year: number; snapshot: string; label: string };
type Settings = {
  cpuTransferChance: number | null;
  userTransferChance: number | null;
  maxTransfersPerTeam: number | null;
  recruitFlipping: boolean | null;
  skillLevel: string | null;
  progressionFreq: string | null;
  talentProgressSpeed: string | null;
  xpPenalty: number | null;
  xpQB: number | null; xpHB: number | null; xpWR: number | null; xpTE: number | null;
  xpT: number | null; xpG: number | null; xpC: number | null;
  xpDE: number | null; xpDT: number | null; xpOLB: number | null; xpMLB: number | null;
  xpCB: number | null; xpFS: number | null; xpSS: number | null;
  xpK: number | null; xpP: number | null;
} | null;
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
  fiveStars: number | null; fourStars: number | null; threeStars: number | null; twoStars: number | null; oneStars: number | null;
  fiveStarsHS: number | null; fourStarsHS: number | null; threeStarsHS: number | null; twoStarsHS: number | null; oneStarsHS: number | null;
  fiveStarsXfer: number | null; fourStarsXfer: number | null; threeStarsXfer: number | null; twoStarsXfer: number | null; oneStarsXfer: number | null;
  hsRecruits: number | null;
  transferRecruits: number | null;
  rosterSize: number | null;
  gradeAtmosphere: string | null;
  gradeBrand: string | null;
  gradeBudget: string | null;
  gradeTraditions: string | null;
  gradeConference: string | null;
  gradeFacilities: string | null;
  facilitiesScore: number | null;
  gradeAcademic: string | null;
  gradeCampus: string | null;
  gradeCoachStability: string | null;
  gradeCoachPrestige: string | null;
  gradeChampion: string | null;
  gradeProQB: string | null; gradeProRB: string | null; gradeProWR: string | null; gradeProTE: string | null;
  gradeProOL: string | null; gradeProDL: string | null; gradeProLB: string | null; gradeProDB: string | null;
  gradeProK: string | null; gradeProP: string | null;
  avgGrade: number | null;
  balanceScore: number | null;
  coachName: string | null;
  coachArchetype: string | null;
  coachLevel: number | null;
  team: {
    id: string;
    name: string;
    shortName: string | null;
    conference: string;
    logoUrl: string | null;
  };
};

type SortKey =
  | 'name' | 'conference' | 'overall' | 'prestige' | 'recruitingRank' | 'teamRank' | 'points'
  | 'record' | 'wins' | 'losses' | 'transfersIn' | 'transfersOut' | 'netTransfers'
  | 'recruitCount' | 'hsRecruits' | 'transferRecruits'
  | 'fiveStars' | 'fourStars' | 'threeStars' | 'twoStars' | 'oneStars'
  | 'avgGrade'
  | 'gradeAtmosphere' | 'gradeBrand' | 'gradeBudget' | 'gradeTraditions' | 'gradeConference'
  | 'gradeFacilities' | 'gradeAcademic' | 'gradeCampus' | 'gradeChampion'
  | 'gradeCoachStability' | 'gradeCoachPrestige'
  | 'gradeProQB' | 'gradeProRB' | 'gradeProWR' | 'gradeProTE' | 'gradeProOL'
  | 'gradeProDL' | 'gradeProLB' | 'gradeProDB' | 'gradeProK' | 'gradeProP'
  | 'coachName' | 'coachArchetype' | 'coachLevel'
  | 'balanceScore';

export default function Dashboard() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState('');
  const [stats, setStats] = useState<TeamStat[]>([]);
  const [settings, setSettings] = useState<Settings>(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [conferenceFilter, setConferenceFilter] = useState('All');
  const [recruitTypeFilter, setRecruitTypeFilter] = useState<'all' | 'hs' | 'transfer'>('all');
  type ViewMode = 'default' | 'grades' | 'coaches';
  type GradeTab = 'all' | 'program' | 'school' | 'pro';
  const [viewMode, setViewMode] = useState<ViewMode>('default');
  const [gradeTab, setGradeTab] = useState<GradeTab>('program');
  const showGrades = viewMode === 'grades';
  const showCoach = viewMode === 'coaches';
  const [sortKey, setSortKey] = useState<SortKey>('overall');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [compareSeasonId, setCompareSeasonId] = useState('');
  const [compareStats, setCompareStats] = useState<TeamStat[]>([]);
  const [balTooltip, setBalTooltip] = useState<{ stat: TeamStat; x: number; y: number } | null>(null);
  const [showBalanceChart, setShowBalanceChart] = useState(false);
  const [allSeasonStats, setAllSeasonStats] = useState<Map<string, TeamStat[]>>(new Map());
  const [chartTeams, setChartTeams] = useState<Set<string>>(new Set());

  useEffect(() => {
    safeJson<Season[]>('/api/seasons').then((res) => {
      if (!res.ok) { setFatalError(res.error); setLoading(false); return; }
      const data = res.data ?? [];
      setSeasons(data);
      if (data.length) setSeasonId(data[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!seasonId) return;
    safeJson<TeamStat[]>(`/api/stats?seasonId=${seasonId}`).then((res) => { if (res.ok) setStats(res.data ?? []); });
    safeJson<Settings>(`/api/settings?seasonId=${seasonId}`).then((res) => { if (res.ok) setSettings(res.data ?? null); });
  }, [seasonId]);

  // Auto-select compare season (previous season of same snapshot type)
  useEffect(() => {
    if (!seasonId || !seasons.length) return;
    const cur = seasons.find((s) => s.id === seasonId);
    if (!cur) return;
    const prev = seasons.find((s) => s.snapshot === cur.snapshot && s.year === cur.year - 1);
    setCompareSeasonId(prev?.id ?? '');
  }, [seasonId, seasons]);

  useEffect(() => {
    if (!compareSeasonId) { setCompareStats([]); return; }
    safeJson<TeamStat[]>(`/api/stats?seasonId=${compareSeasonId}`).then((res) => {
      if (res.ok) setCompareStats(res.data ?? []);
    });
  }, [compareSeasonId]);

  // Load all seasons for balance chart when opened
  useEffect(() => {
    if (!showBalanceChart || !seasons.length) return;
    const missing = seasons.filter((s) => !allSeasonStats.has(s.id));
    if (!missing.length) return;
    Promise.all(missing.map((s) => safeJson<TeamStat[]>(`/api/stats?seasonId=${s.id}`).then((r) => ({ id: s.id, data: r.data ?? [] }))))
      .then((results) => {
        setAllSeasonStats((prev) => {
          const next = new Map(prev);
          results.forEach(({ id, data }) => next.set(id, data));
          return next;
        });
      });
  }, [showBalanceChart, seasons]);

  const compareMap = useMemo(() => {
    const m = new Map<string, TeamStat>();
    for (const s of compareStats) m.set(s.team.id, s);
    return m;
  }, [compareStats]);

  const conferences = useMemo(() => {
    const set = new Set(stats.map((s) => s.team.conference));
    return ['All', 'Power 4', 'Group of 5', ...Array.from(set).sort()];
  }, [stats]);

  const P4 = new Set(['ACC', 'Big 12', 'Big Ten', 'SEC']);
  const G5 = new Set(['American', 'CUSA', 'MAC', 'MWC', 'Sun Belt', 'Pac-12']);

  const rows = useMemo(() => {
    let filtered = conferenceFilter === 'All' ? stats
      : conferenceFilter === 'Power 4' ? stats.filter((s) => P4.has(s.team.conference))
      : conferenceFilter === 'Group of 5' ? stats.filter((s) => G5.has(s.team.conference))
      : stats.filter((s) => s.team.conference === conferenceFilter);
    const isHS = recruitTypeFilter === 'hs';
    const isXfer = recruitTypeFilter === 'transfer';
    const s5v = (r: TeamStat) => (isHS ? r.fiveStarsHS : isXfer ? r.fiveStarsXfer : r.fiveStars) ?? 0;
    const s4v = (r: TeamStat) => (isHS ? r.fourStarsHS : isXfer ? r.fourStarsXfer : r.fourStars) ?? 0;
    const s3v = (r: TeamStat) => (isHS ? r.threeStarsHS : isXfer ? r.threeStarsXfer : r.threeStars) ?? 0;
    const s2v = (r: TeamStat) => (isHS ? r.twoStarsHS : isXfer ? r.twoStarsXfer : r.twoStars) ?? 0;
    const s1v = (r: TeamStat) => (isHS ? r.oneStarsHS : isXfer ? r.oneStarsXfer : r.oneStars) ?? 0;

    filtered = [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'name': return dir * a.team.name.localeCompare(b.team.name);
        case 'conference': return dir * a.team.conference.localeCompare(b.team.conference) || a.team.name.localeCompare(b.team.name);
        case 'overall': return dir * ((a.overall ?? -1) - (b.overall ?? -1));
        case 'prestige': return dir * ((a.prestige ?? -1) - (b.prestige ?? -1));
        case 'recruitingRank': {
          const av = a.recruitingRank ?? 9999, bv = b.recruitingRank ?? 9999;
          return -dir * (av - bv);
        }
        case 'teamRank': {
          const av = a.teamRank ?? 9999, bv = b.teamRank ?? 9999;
          return -dir * (av - bv);
        }
        case 'points': {
          const pv = (r: TeamStat) => s5v(r) * 5 + s4v(r) * 3 + s3v(r);
          return dir * (pv(a) - pv(b));
        }
        case 'record': return dir * ((a.wins ?? 0) - (a.losses ?? 0) - ((b.wins ?? 0) - (b.losses ?? 0)));
        case 'transfersIn': return dir * ((a.transfersIn ?? -1) - (b.transfersIn ?? -1));
        case 'transfersOut': return dir * ((a.transfersOut ?? -1) - (b.transfersOut ?? -1));
        case 'netTransfers': return dir * (((a.transfersIn ?? 0) - (a.transfersOut ?? 0)) - ((b.transfersIn ?? 0) - (b.transfersOut ?? 0)));
        case 'recruitCount': {
          const cv = (r: TeamStat) => (isHS ? r.hsRecruits : isXfer ? r.transferRecruits : r.recruitCount) ?? -1;
          return dir * (cv(a) - cv(b));
        }
        case 'wins': return dir * ((a.wins ?? -1) - (b.wins ?? -1));
        case 'losses': return dir * ((a.losses ?? -1) - (b.losses ?? -1));
        case 'hsRecruits': return dir * ((a.hsRecruits ?? -1) - (b.hsRecruits ?? -1));
        case 'transferRecruits': return dir * ((a.transferRecruits ?? -1) - (b.transferRecruits ?? -1));
        case 'fiveStars': return dir * (s5v(a) - s5v(b));
        case 'fourStars': return dir * (s4v(a) - s4v(b));
        case 'threeStars': return dir * (s3v(a) - s3v(b));
        case 'twoStars': return dir * (s2v(a) - s2v(b));
        case 'oneStars': return dir * (s1v(a) - s1v(b));
        case 'avgGrade': return dir * ((a.avgGrade ?? -1) - (b.avgGrade ?? -1));
        case 'balanceScore': return dir * ((a.balanceScore ?? -1) - (b.balanceScore ?? -1));
        case 'gradeAtmosphere': return dir * (gv(a.gradeAtmosphere) - gv(b.gradeAtmosphere));
        case 'gradeBrand': return dir * (gv(a.gradeBrand) - gv(b.gradeBrand));
        case 'gradeBudget': return dir * (gv(a.gradeBudget) - gv(b.gradeBudget));
        case 'gradeTraditions': return dir * (gv(a.gradeTraditions) - gv(b.gradeTraditions));
        case 'gradeConference': return dir * (gv(a.gradeConference) - gv(b.gradeConference));
        case 'gradeFacilities': return dir * (gv(a.gradeFacilities) - gv(b.gradeFacilities));
        case 'gradeAcademic': return dir * (gv(a.gradeAcademic) - gv(b.gradeAcademic));
        case 'gradeCampus': return dir * (gv(a.gradeCampus) - gv(b.gradeCampus));
        case 'gradeChampion': return dir * (gv(a.gradeChampion) - gv(b.gradeChampion));
        case 'gradeCoachStability': return dir * (gv(a.gradeCoachStability) - gv(b.gradeCoachStability));
        case 'gradeCoachPrestige': return dir * (gv(a.gradeCoachPrestige) - gv(b.gradeCoachPrestige));
        case 'gradeProQB': return dir * (gv(a.gradeProQB) - gv(b.gradeProQB));
        case 'gradeProRB': return dir * (gv(a.gradeProRB) - gv(b.gradeProRB));
        case 'gradeProWR': return dir * (gv(a.gradeProWR) - gv(b.gradeProWR));
        case 'gradeProTE': return dir * (gv(a.gradeProTE) - gv(b.gradeProTE));
        case 'gradeProOL': return dir * (gv(a.gradeProOL) - gv(b.gradeProOL));
        case 'gradeProDL': return dir * (gv(a.gradeProDL) - gv(b.gradeProDL));
        case 'gradeProLB': return dir * (gv(a.gradeProLB) - gv(b.gradeProLB));
        case 'gradeProDB': return dir * (gv(a.gradeProDB) - gv(b.gradeProDB));
        case 'gradeProK': return dir * (gv(a.gradeProK) - gv(b.gradeProK));
        case 'gradeProP': return dir * (gv(a.gradeProP) - gv(b.gradeProP));
        case 'coachName': return dir * ((a.coachName ?? '').localeCompare(b.coachName ?? ''));
        case 'coachArchetype': return dir * ((a.coachArchetype ?? '').localeCompare(b.coachArchetype ?? ''));
        case 'coachLevel': return dir * ((a.coachLevel ?? -1) - (b.coachLevel ?? -1));
        default: return 0;
      }
    });
    return filtered;
  }, [stats, conferenceFilter, recruitTypeFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  if (loading) return <div className="p-8" style={{ color: 'var(--ocean-400)' }}>Loading…</div>;

  if (fatalError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-2xl font-bold" style={{ color: '#f87171' }}>Server error</h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--ocean-300)' }}>{fatalError}</p>
        <p className="mt-6 text-xs" style={{ color: 'var(--ocean-500)' }}>
          If you just cloned the repo, close this window and double-click <code>setup.bat</code> first.
        </p>
      </div>
    );
  }

  if (!seasons.length) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--ocean-100)' }}>No seasons imported yet</h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--ocean-400)' }}>
          Import your CFB 27 dynasty save to see team overalls, recruiting ranks, transfers, and more.
        </p>
        <Link
          href="/import"
          className="mt-8 inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: 'var(--ocean-600)' }}
        >
          Import a save file
        </Link>
      </div>
    );
  }

  const xpPositions = [
    ['QB', settings?.xpQB], ['HB', settings?.xpHB], ['WR', settings?.xpWR], ['TE', settings?.xpTE],
    ['T', settings?.xpT], ['G', settings?.xpG], ['C', settings?.xpC],
    ['DE', settings?.xpDE], ['DT', settings?.xpDT], ['OLB', settings?.xpOLB], ['MLB', settings?.xpMLB],
    ['CB', settings?.xpCB], ['FS', settings?.xpFS], ['SS', settings?.xpSS],
    ['K', settings?.xpK], ['P', settings?.xpP],
  ] as const;

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-5">
      {/* Settings panel */}
      {settings && (
        <div
          className="mb-4 rounded-lg border px-4 py-3"
          style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}
        >
          <div className="mb-2 flex items-center gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--ocean-400)' }}>Dynasty Settings</h2>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
            <SettingPill label="Difficulty" value={settings.skillLevel?.replace('_', ' ') ?? '—'} />
            <SettingPill label="CPU Transfer %" value={`${settings.cpuTransferChance ?? '—'}%`} />
            <SettingPill label="User Transfer %" value={`${settings.userTransferChance ?? '—'}%`} />
            <SettingPill label="Max Transfers/Team" value={String(settings.maxTransfersPerTeam ?? '—')} />
            <SettingPill label="Recruit Flipping" value={settings.recruitFlipping ? 'ON' : 'OFF'} />
            <SettingPill label="CPU Progression" value={settings.progressionFreq ?? '—'} />
            <SettingPill label="Talent Speed" value={settings.talentProgressSpeed ?? '—'} />
            <SettingPill label="Manual XP Penalty" value={`${settings.xpPenalty ?? '—'}%`} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-semibold uppercase" style={{ color: 'var(--ocean-500)' }}>XP Sliders</span>
            {xpPositions.map(([pos, val]) => (
              <span
                key={pos}
                className="rounded px-1.5 py-0.5 text-xs tabular-nums"
                style={{
                  background: val !== 100 ? 'rgba(29,78,216,0.12)' : 'var(--ocean-800)',
                  color: val !== 100 ? '#1D4ED8' : 'var(--ocean-400)',
                }}
              >
                {pos} {val ?? '—'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Controls bar */}
      <div
        className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
        style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}
      >
        {/* View — far left */}
        <ControlGroup label="View">
          <Select value={viewMode} onChange={(v) => setViewMode(v as ViewMode)}>
            <option value="default">Default</option>
            <option value="grades">Grades</option>
            <option value="coaches">Coaches</option>
          </Select>
        </ControlGroup>

        {/* Grade sub-buttons */}
        {showGrades && (
          <div className="flex gap-px rounded-md border overflow-hidden" style={{ borderColor: 'var(--ocean-700)' }}>
            {(['all', 'program', 'school', 'pro'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setGradeTab(tab)}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: gradeTab === tab ? 'var(--ocean-600)' : 'var(--ocean-800)',
                  color: gradeTab === tab ? '#fff' : 'var(--ocean-400)',
                }}
              >
                {tab === 'all' ? 'All' : tab === 'program' ? 'Program' : tab === 'school' ? 'School' : 'Pro Potential'}
              </button>
            ))}
          </div>
        )}

        <div style={{ width: 1, height: 24, background: 'var(--ocean-700)', flexShrink: 0 }} />

        <ControlGroup label="Season">
          <Select value={seasonId} onChange={setSeasonId}>
            {seasons.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
        </ControlGroup>

        <ControlGroup label="Compare">
          <Select value={compareSeasonId} onChange={setCompareSeasonId}>
            <option value="">None</option>
            {seasons.filter((s) => s.id !== seasonId).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
        </ControlGroup>

        <ControlGroup label="Conference">
          <Select value={conferenceFilter} onChange={setConferenceFilter}>
            <option value="All">All</option>
            <option value="Power 4">Power 4</option>
            <option value="Group of 5">Group of 5</option>
            <option disabled>──────────</option>
            {conferences.filter((c) => !['All', 'Power 4', 'Group of 5'].includes(c)).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </ControlGroup>

        <ControlGroup label="Recruits">
          <Select value={recruitTypeFilter} onChange={(v) => setRecruitTypeFilter(v as 'all' | 'hs' | 'transfer')}>
            <option value="all">All</option>
            <option value="hs">High School</option>
            <option value="transfer">Transfers</option>
          </Select>
        </ControlGroup>

        {!showGrades && !showCoach && (
          <span className="hidden xl:block text-xs tabular-nums" style={{ color: 'var(--ocean-600)', opacity: 0.45 }}>
            ★★★★★ = 5pts &nbsp;·&nbsp; ★★★★ = 3pts &nbsp;·&nbsp; ★★★ = 1pt
          </span>
        )}

        <div className="ml-auto flex items-center gap-4 text-xs" style={{ color: 'var(--ocean-400)' }}>
          <span>{rows.length} teams</span>
          <a
            href="/api/export?type=stats"
            download
            className="rounded px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--ocean-800)', color: 'var(--ocean-300)', border: '1px solid var(--ocean-700)' }}
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Balance Score Chart toggle */}
      <div className="mb-3 flex items-center gap-3">
        <button
          onClick={() => setShowBalanceChart((v) => !v)}
          className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            background: showBalanceChart ? 'var(--ocean-700)' : 'var(--ocean-900)',
            borderColor: 'var(--ocean-700)',
            color: showBalanceChart ? 'var(--ocean-100)' : 'var(--ocean-400)',
          }}
        >
          {showBalanceChart ? '▼' : '▶'} Balance Score History
        </button>
      </div>

      {/* Balance Score Line Chart */}
      {showBalanceChart && (
        <BalanceChart
          seasons={seasons}
          allSeasonStats={allSeasonStats}
          chartTeams={chartTeams}
          setChartTeams={setChartTeams}
          currentStats={stats}
        />
      )}

      {/* Balance score tooltip */}
      {balTooltip && <BalanceTooltip stat={balTooltip.stat} x={balTooltip.x} y={balTooltip.y} />}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--ocean-800)' }}>
        <table className="w-full border-collapse text-sm">
          <thead>
            {/* Group header row */}
            <tr style={{ background: 'var(--ocean-800)', borderBottom: '1px solid var(--ocean-700)' }}>
              <GH colSpan={4} />
              <GH colSpan={2} label="Ratings" bl />
              {!showGrades && !showCoach && <>
                <GH colSpan={3} label="Rankings" bl />
                <GH colSpan={1} label="Balance" bl />
                <GH colSpan={6} label="Class" bl />
                <GH colSpan={3} label="Transfers" bl />
                <GH colSpan={3} label="Volume" bl />
              </>}
              {showCoach && <>
                <GH colSpan={2} label="Rankings" bl />
                <GH colSpan={3} label="Coaching" bl />
              </>}
              {showGrades && gradeTab === 'all'     && <>
                <GH colSpan={1}  label="Avg"           bl />
                <GH colSpan={5}  label="Program"       />
                <GH colSpan={6}  label="School"        />
                <GH colSpan={10} label="Pro Potential" />
              </>}
              {showGrades && gradeTab === 'program' && <GH colSpan={6}  label="Program"       bl />}
              {showGrades && gradeTab === 'school'  && <GH colSpan={6}  label="School"        bl />}
              {showGrades && gradeTab === 'pro'     && <GH colSpan={10} label="Pro Potential" bl />}
            </tr>
            {/* Column headers */}
            <tr style={{ background: 'var(--ocean-900)' }}>
              <th className="w-10 px-2 py-2.5" />
              <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide w-8" style={{ color: 'var(--ocean-500)' }}>#</th>
              <Th label="Team"    k="name"          sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <Th label="Conf"    k="conference"    sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              <Th label="OVR"     k="overall"       sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} borderLeft />
              <Th label="Prestige" k="prestige"     sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              {/* Rankings: default only */}
              {!showGrades && !showCoach && <>
                <Th label="Nat"    k="teamRank"       sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} borderLeft />
                <Th label="Recr"   k="recruitingRank" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Record" k="record"          sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              </>}
              {!showGrades && !showCoach && <Th label="Bal" k="balanceScore" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} borderLeft />}
              {/* Class: default only */}
              {!showGrades && !showCoach && <>
                <Th label="★5" k="fiveStars"  sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} borderLeft />
                <Th label="★4" k="fourStars"  sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="★3" k="threeStars" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="★2" k="twoStars"   sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="★1" k="oneStars"   sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Pts" k="points"    sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              </>}
              {/* Transfers: default only */}
              {!showGrades && !showCoach && <>
                <Th label="In"  k="transfersIn"  sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} borderLeft />
                <Th label="Out" k="transfersOut" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Net" k="netTransfers" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              </>}
              {/* Volume: default only */}
              {!showGrades && !showCoach && <>
                <Th label="Signed" k="recruitCount"     sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} borderLeft />
                <Th label="HS"     k="hsRecruits"       sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="XFER"   k="transferRecruits" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              </>}
              {/* Grades view */}
              {showGrades && gradeTab === 'all' && <>
                <Th label="Avg"  k="avgGrade"            sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} borderLeft />
                <Th label="Atm"  k="gradeAtmosphere"     sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} borderLeft />
                <Th label="Brd"  k="gradeBrand"          sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Bdg"  k="gradeBudget"         sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Trd"  k="gradeTraditions"     sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Cfg"  k="gradeConference"     sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Fac"  k="gradeFacilities"     sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} borderLeft />
                <Th label="Acd"  k="gradeAcademic"       sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Cmp"  k="gradeCampus"         sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Chp"  k="gradeChampion"       sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="CSt"  k="gradeCoachStability" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="CPr"  k="gradeCoachPrestige"  sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="QB"   k="gradeProQB"          sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} borderLeft />
                <Th label="RB"   k="gradeProRB"          sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="WR"   k="gradeProWR"          sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="TE"   k="gradeProTE"          sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="OL"   k="gradeProOL"          sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="DL"   k="gradeProDL"          sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="LB"   k="gradeProLB"          sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="DB"   k="gradeProDB"          sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="K"    k="gradeProK"           sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="P"    k="gradeProP"           sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              </>}
              {showGrades && gradeTab === 'program' && <>
                <Th label="Avg"    k="avgGrade"          sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} borderLeft />
                <Th label="Atm"    k="gradeAtmosphere"   sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Brand"  k="gradeBrand"        sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Budget" k="gradeBudget"       sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Trad"   k="gradeTraditions"   sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Conf"   k="gradeConference"   sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              </>}
              {showGrades && gradeTab === 'school' && <>
                <Th label="Facilities"  k="gradeFacilities"    sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} borderLeft />
                <Th label="Academic"    k="gradeAcademic"      sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Campus"      k="gradeCampus"        sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Champ"       k="gradeChampion"      sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Coach Stab"  k="gradeCoachStability" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Coach Pres"  k="gradeCoachPrestige" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              </>}
              {showGrades && gradeTab === 'pro' && <>
                <Th label="QB" k="gradeProQB" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} borderLeft />
                <Th label="RB" k="gradeProRB" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="WR" k="gradeProWR" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="TE" k="gradeProTE" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="OL" k="gradeProOL" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="DL" k="gradeProDL" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="LB" k="gradeProLB" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="DB" k="gradeProDB" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="K"  k="gradeProK"  sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="P"  k="gradeProP"  sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              </>}
              {/* Coaches view */}
              {showCoach && <>
                <Th label="Nat"    k="teamRank"       sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} borderLeft />
                <Th label="Record" k="record"          sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Head Coach" k="coachName"   sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} borderLeft />
                <Th label="Archetype"  k="coachArchetype" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                <Th label="Level"      k="coachLevel"    sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
              </>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isHS = recruitTypeFilter === 'hs';
              const isXfer = recruitTypeFilter === 'transfer';
              const s5 = isHS ? r.fiveStarsHS : isXfer ? r.fiveStarsXfer : r.fiveStars;
              const s4 = isHS ? r.fourStarsHS : isXfer ? r.fourStarsXfer : r.fourStars;
              const s3 = isHS ? r.threeStarsHS : isXfer ? r.threeStarsXfer : r.threeStars;
              const s2 = isHS ? r.twoStarsHS : isXfer ? r.twoStarsXfer : r.twoStars;
              const s1 = isHS ? r.oneStarsHS : isXfer ? r.oneStarsXfer : r.oneStars;
              const net = (r.transfersIn ?? 0) - (r.transfersOut ?? 0);
              const rowBg = i % 2 === 0 ? 'var(--ocean-900)' : 'var(--ocean-800)';
              const BL = '1px solid var(--ocean-700)';
              return (
              <tr
                key={r.id}
                className="transition-colors"
                style={{ background: rowBg }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#EBF2FF'}
                onMouseLeave={(e) => e.currentTarget.style.background = rowBg}
              >
                {/* Logo */}
                <td className="px-2 py-1.5">
                  {r.team.logoUrl
                    ? <div style={{ width: 26, height: 26 }}><img src={r.team.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
                    : <div style={{ width: 26, height: 26, borderRadius: 4, background: 'var(--ocean-700)' }} />}
                </td>
                {/* # rank */}
                <td className="px-1 py-1.5 text-center tabular-nums text-xs" style={{ color: 'var(--ocean-500)', minWidth: 28 }}>{i + 1}</td>
                {/* Identity */}
                <td className="px-3 py-1.5 font-bold" style={{ color: 'var(--ocean-100)' }}>{r.team.name}</td>
                <td className="px-3 py-1.5 text-xs" style={{ color: 'var(--ocean-400)' }}>{r.team.conference}</td>
                {/* Ratings */}
                <td className="px-3 py-1.5 tabular-nums font-semibold" style={{ color: ovrColor(r.overall), borderLeft: BL }}>{r.overall ?? '—'}</td>
                <td className="px-3 py-1.5 tabular-nums" style={{ color: 'var(--ocean-200)' }}>{r.prestige ?? '—'}</td>
                {/* Rankings (default) */}
                {!showGrades && !showCoach && (() => {
                  const cmp = compareMap.get(r.team.id);
                  const rankArrow = (cur: number | null, prev: number | null, lower: boolean) => {
                    if (cur == null || prev == null || cur === prev) return null;
                    const better = lower ? cur < prev : cur > prev;
                    return <span style={{ fontSize: 9, marginLeft: 2, color: better ? 'var(--data-green)' : 'var(--data-red)' }}>{better ? '▲' : '▼'}</span>;
                  };
                  return <>
                    <td className="px-3 py-1.5 tabular-nums" style={{ color: 'var(--ocean-200)', borderLeft: BL }}>
                      {r.teamRank ?? '—'}{rankArrow(r.teamRank, cmp?.teamRank ?? null, true)}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums" style={{ color: 'var(--ocean-200)' }}>
                      {r.recruitingRank ?? '—'}{rankArrow(r.recruitingRank, cmp?.recruitingRank ?? null, true)}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums" style={{ color: 'var(--ocean-200)' }}>{r.wins ?? 0}-{r.losses ?? 0}</td>
                  </>;
                })()}
                {/* Balance score (default) */}
                {!showGrades && !showCoach && (
                  <td
                    className="px-3 py-1.5 tabular-nums font-semibold"
                    style={{ color: balanceColor(r.balanceScore), borderLeft: BL, cursor: r.balanceScore != null ? 'default' : undefined }}
                    onMouseEnter={r.balanceScore != null ? (e) => setBalTooltip({ stat: r, x: e.clientX, y: e.clientY }) : undefined}
                    onMouseMove={r.balanceScore != null ? (e) => setBalTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : t) : undefined}
                    onMouseLeave={r.balanceScore != null ? () => setBalTooltip(null) : undefined}
                  >
                    {r.balanceScore != null ? r.balanceScore : '—'}
                  </td>
                )}
                {/* Class (default) */}
                {!showGrades && !showCoach && <>
                  <td className="px-3 py-1.5 tabular-nums font-medium" style={{ color: 'var(--ocean-200)', borderLeft: BL }}>{s5 || '—'}</td>
                  <td className="px-3 py-1.5 tabular-nums" style={{ color: 'var(--ocean-200)' }}>{s4 || '—'}</td>
                  <td className="px-3 py-1.5 tabular-nums" style={{ color: 'var(--ocean-200)' }}>{s3 || '—'}</td>
                  <td className="px-3 py-1.5 tabular-nums" style={{ color: 'var(--ocean-200)' }}>{s2 || '—'}</td>
                  <td className="px-3 py-1.5 tabular-nums" style={{ color: 'var(--ocean-200)' }}>{s1 || '—'}</td>
                  <td className="px-3 py-1.5 tabular-nums font-semibold" style={{ color: 'var(--ocean-100)' }}>{(s5 ?? 0) * 5 + (s4 ?? 0) * 3 + (s3 ?? 0) || '—'}</td>
                </>}
                {/* Transfers (default) */}
                {!showGrades && !showCoach && <>
                  <td className="px-3 py-1.5 tabular-nums" style={{ color: 'var(--data-green)', borderLeft: BL }}>{r.transfersIn ?? '—'}</td>
                  <td className="px-3 py-1.5 tabular-nums" style={{ color: 'var(--data-red)' }}>{r.transfersOut ?? '—'}</td>
                  <td className="px-3 py-1.5 tabular-nums font-semibold" style={{ color: netColor(net) }}>{formatNet(net)}</td>
                </>}
                {/* Volume (default) */}
                {!showGrades && !showCoach && <>
                  <td className="px-3 py-1.5 tabular-nums font-medium" style={{ color: 'var(--ocean-200)', borderLeft: BL }}>
                    {isHS ? (r.hsRecruits ?? '—') : isXfer ? (r.transferRecruits ?? '—') : (r.recruitCount ?? '—')}
                  </td>
                  <td className="px-3 py-1.5 tabular-nums" style={{ color: 'var(--ocean-300)' }}>{r.hsRecruits ?? '—'}</td>
                  <td className="px-3 py-1.5 tabular-nums" style={{ color: 'var(--ocean-300)' }}>{r.transferRecruits ?? '—'}</td>
                </>}
                {/* Grades: All */}
                {showGrades && gradeTab === 'all' && <>
                  <td className="px-2 py-1.5 tabular-nums font-semibold text-xs" style={{ color: gradeColor(r.avgGrade), borderLeft: BL }}>{r.avgGrade?.toFixed(1) ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)', borderLeft: BL }}>{r.gradeAtmosphere ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeBrand ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeBudget ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeTraditions ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeConference ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)', borderLeft: BL }}>{r.gradeFacilities ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeAcademic ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeCampus ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeChampion ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeCoachStability ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeCoachPrestige ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)', borderLeft: BL }}>{r.gradeProQB ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeProRB ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeProWR ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeProTE ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeProOL ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeProDL ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeProLB ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeProDB ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeProK ?? '—'}</td>
                  <td className="px-2 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeProP ?? '—'}</td>
                </>}
                {/* Grades: Program */}
                {showGrades && gradeTab === 'program' && <>
                  <td className="px-3 py-1.5 tabular-nums font-semibold" style={{ color: gradeColor(r.avgGrade), borderLeft: BL }}>{r.avgGrade?.toFixed(1) ?? '—'}</td>
                  <td className="px-3 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeAtmosphere ?? '—'}</td>
                  <td className="px-3 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeBrand ?? '—'}</td>
                  <td className="px-3 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeBudget ?? '—'}</td>
                  <td className="px-3 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeTraditions ?? '—'}</td>
                  <td className="px-3 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeConference ?? '—'}</td>
                </>}
                {/* Grades: School */}
                {showGrades && gradeTab === 'school' && <>
                  <td className="px-3 py-1.5 text-xs" style={{ color: 'var(--ocean-200)', borderLeft: BL }}>
                    {r.gradeFacilities ?? '—'}{r.facilitiesScore != null ? ` (${r.facilitiesScore})` : ''}
                  </td>
                  <td className="px-3 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeAcademic ?? '—'}</td>
                  <td className="px-3 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeCampus ?? '—'}</td>
                  <td className="px-3 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeChampion ?? '—'}</td>
                  <td className="px-3 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeCoachStability ?? '—'}</td>
                  <td className="px-3 py-1.5 text-xs" style={{ color: 'var(--ocean-200)' }}>{r.gradeCoachPrestige ?? '—'}</td>
                </>}
                {/* Grades: Pro */}
                {showGrades && gradeTab === 'pro' && <>
                  {([r.gradeProQB,r.gradeProRB,r.gradeProWR,r.gradeProTE,r.gradeProOL,r.gradeProDL,r.gradeProLB,r.gradeProDB,r.gradeProK,r.gradeProP] as (string|null)[]).map((g, gi) => (
                    <td key={gi} className="px-3 py-1.5 text-xs" style={{ color: 'var(--ocean-200)', ...(gi === 0 ? { borderLeft: BL } : {}) }}>{g ?? '—'}</td>
                  ))}
                </>}
                {/* Coaches */}
                {showCoach && <>
                  <td className="px-3 py-1.5 tabular-nums" style={{ color: 'var(--ocean-200)', borderLeft: BL }}>{r.teamRank ?? '—'}</td>
                  <td className="px-3 py-1.5 tabular-nums" style={{ color: 'var(--ocean-200)' }}>{r.wins ?? 0}-{r.losses ?? 0}</td>
                  <td className="px-3 py-1.5 text-xs font-medium" style={{ color: 'var(--ocean-100)', borderLeft: BL }}>{r.coachName ?? '—'}</td>
                  <td className="px-3 py-1.5 text-xs" style={{ color: 'var(--ocean-300)' }}>{r.coachArchetype ?? '—'}</td>
                  <td className="px-3 py-1.5 tabular-nums text-xs font-semibold" style={{ color: 'var(--ocean-200)' }}>{r.coachLevel ?? '—'}</td>
                </>}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const GRADE_VAL: Record<string, number> = {
  'A+': 4.3, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0,
};
function gv(g: string | null): number { return g != null ? (GRADE_VAL[g] ?? -1) : -1; }

function netColor(n: number): string {
  if (n > 0) return 'var(--data-green)';
  if (n < 0) return 'var(--data-red)';
  return 'var(--ocean-500)';
}

function formatNet(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

function ovrColor(ovr: number | null): string {
  if (ovr == null) return 'var(--ocean-500)';
  if (ovr >= 88) return 'var(--data-green)';
  if (ovr >= 80) return 'var(--data-blue)';
  if (ovr >= 72) return 'var(--data-amber)';
  return 'var(--data-red)';
}

function balanceColor(score: number | null): string {
  if (score == null) return 'var(--ocean-500)';
  if (score >= 80) return 'var(--data-green)';
  if (score >= 60) return 'var(--data-blue)';
  if (score >= 40) return 'var(--data-amber)';
  return 'var(--data-red)';
}

function gradeColor(avg: number | null): string {
  if (avg == null) return 'var(--ocean-500)';
  if (avg >= 3.7) return 'var(--data-green)';
  if (avg >= 3.0) return 'var(--data-blue)';
  if (avg >= 2.0) return 'var(--data-amber)';
  return 'var(--data-red)';
}

function SettingPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span style={{ color: 'var(--ocean-500)' }}>{label}:</span>
      <span className="font-medium" style={{ color: 'var(--ocean-200)' }}>{value}</span>
    </span>
  );
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-500)' }}>{label}</span>
      {children}
    </div>
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border px-2.5 py-1.5 text-sm font-medium outline-none"
      style={{
        background: 'var(--ocean-800)',
        borderColor: 'var(--ocean-700)',
        color: 'var(--ocean-100)',
      }}
    >
      {children}
    </select>
  );
}

function GH({ colSpan, label, bl }: { colSpan: number; label?: string; bl?: boolean }) {
  return (
    <th
      colSpan={colSpan}
      style={{
        padding: '3px 12px',
        textAlign: 'left',
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--ocean-500)',
        borderLeft: bl ? '2px solid var(--ocean-700)' : undefined,
      }}
    >
      {label ?? ''}
    </th>
  );
}

const BALANCE_GRADES: { key: keyof TeamStat; label: string }[] = [
  { key: 'gradeAtmosphere', label: 'Atmosphere' },
  { key: 'gradeBrand',      label: 'Brand' },
  { key: 'gradeBudget',     label: 'Budget' },
  { key: 'gradeTraditions', label: 'Traditions' },
  { key: 'gradeConference', label: 'Conference' },
  { key: 'gradeFacilities', label: 'Facilities' },
];

function BalanceTooltip({ stat, x, y }: { stat: TeamStat; x: number; y: number }) {
  const entries = BALANCE_GRADES.map(({ key, label }) => ({
    label,
    grade: stat[key] as string | null,
    val: gv(stat[key] as string | null),
  })).filter((e) => e.grade != null);

  const vals = entries.map((e) => e.val);
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const min = Math.min(...vals);
  const max = Math.max(...vals);

  const left = x + 14;
  const top = y - 8;

  return (
    <div
      style={{
        position: 'fixed', left, top, zIndex: 9999, pointerEvents: 'none',
        background: 'var(--ocean-900)', border: '1px solid var(--ocean-700)',
        borderRadius: 8, padding: '10px 14px', minWidth: 180,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ocean-400)', marginBottom: 8 }}>
        Program Balance
      </div>
      {entries.map(({ label, grade, val }) => {
        const isWeak   = val === min && max - min >= 0.6;
        const isStrong = val === max && max - min >= 0.6;
        const diff = val - avg;
        const color = isWeak ? 'var(--data-red)' : isStrong ? 'var(--data-green)' : 'var(--ocean-300)';
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--ocean-400)' }}>
              {isWeak   && <span style={{ color: 'var(--data-red)',   marginRight: 4 }}>↓</span>}
              {isStrong && <span style={{ color: 'var(--data-green)', marginRight: 4 }}>↑</span>}
              {!isWeak && !isStrong && <span style={{ marginRight: 20 }} />}
              {label}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'right' }}>
                {grade}
              </span>
              <span style={{ fontSize: '0.65rem', color: diff > 0.15 ? 'var(--data-green)' : diff < -0.15 ? 'var(--data-red)' : 'var(--ocean-600)', fontVariantNumeric: 'tabular-nums', minWidth: 32, textAlign: 'right' }}>
                {diff > 0.05 ? `+${diff.toFixed(1)}` : diff < -0.05 ? diff.toFixed(1) : '±0'}
              </span>
            </div>
          </div>
        );
      })}
      <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--ocean-800)', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--ocean-500)' }}>
        <span>Score</span>
        <span style={{ fontWeight: 700, color: balanceColor(stat.balanceScore) }}>{stat.balanceScore ?? '—'} / 100</span>
      </div>
    </div>
  );
}

// 10-team distinct palette for chart lines (#6)
const CHART_PALETTE = [
  '#2196f3', '#f95d6a', '#ffa600', '#57a773', '#a05195',
  '#003f5c', '#ff7c43', '#665191', '#009688', '#e91e63',
];

type BalanceChartProps = {
  seasons: Season[];
  allSeasonStats: Map<string, TeamStat[]>;
  chartTeams: Set<string>;
  setChartTeams: React.Dispatch<React.SetStateAction<Set<string>>>;
  currentStats: TeamStat[];
};

function BalanceChart({ seasons, allSeasonStats, chartTeams, setChartTeams, currentStats }: BalanceChartProps) {
  // Build sorted season list (signing_day only, chronological for chart)
  const sdSeasons = [...seasons].filter((s) => s.snapshot === 'signing_day').sort((a, b) => a.year - b.year);

  // Gather all team names with balance scores across loaded seasons
  const teamSet = new Set<string>();
  for (const [, stats] of allSeasonStats) {
    for (const s of stats) {
      if (s.balanceScore != null) teamSet.add(s.team.name);
    }
  }
  const allTeams = [...teamSet].sort();

  // Default: top 6 teams by current season balance score
  const defaultTeams = React.useMemo(() => {
    return [...currentStats]
      .filter((s) => s.balanceScore != null)
      .sort((a, b) => (b.balanceScore ?? 0) - (a.balanceScore ?? 0))
      .slice(0, 6)
      .map((s) => s.team.name);
  }, [currentStats]);

  const activeTeams = chartTeams.size > 0 ? [...chartTeams] : defaultTeams;

  // Chart data: for each active team, array of { year, score } per signing_day season
  const seriesData = activeTeams.map((teamName) => {
    const points = sdSeasons.map((s) => {
      const stats = allSeasonStats.get(s.id) ?? [];
      const teamStat = stats.find((t) => t.team.name === teamName);
      return { year: s.year, score: teamStat?.balanceScore ?? null };
    });
    return { teamName, points };
  });

  // SVG chart dimensions
  const W = 720, H = 260, PAD = { t: 16, r: 16, b: 36, l: 44 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;

  const yearCount = sdSeasons.length;
  const xScale = (i: number) => yearCount <= 1 ? chartW / 2 : (i / (yearCount - 1)) * chartW;
  const yScale = (v: number) => chartH - (v / 100) * chartH;

  const yTicks = [0, 25, 50, 75, 100];

  const loaded = sdSeasons.every((s) => allSeasonStats.has(s.id));

  return (
    <div className="mb-4 rounded-lg border p-4" style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-400)' }}>Teams</span>
        {allTeams.slice(0, 20).map((name, i) => {
          const active = activeTeams.includes(name);
          const colorIdx = activeTeams.indexOf(name);
          return (
            <button
              key={name}
              onClick={() => setChartTeams((prev) => {
                const next = new Set(prev.size === 0 ? defaultTeams : [...prev]);
                next.has(name) ? next.delete(name) : next.add(name);
                return next;
              })}
              className="rounded px-2 py-0.5 text-xs font-medium transition-opacity"
              style={{
                background: active ? (CHART_PALETTE[colorIdx % CHART_PALETTE.length] + '22') : 'var(--ocean-800)',
                color: active ? CHART_PALETTE[colorIdx % CHART_PALETTE.length] : 'var(--ocean-500)',
                border: `1px solid ${active ? CHART_PALETTE[colorIdx % CHART_PALETTE.length] : 'var(--ocean-700)'}`,
              }}
            >
              {name}
            </button>
          );
        })}
      </div>
      {!loaded ? (
        <p style={{ color: 'var(--ocean-500)', fontSize: '0.8rem' }}>Loading season data…</p>
      ) : sdSeasons.length < 2 ? (
        <p style={{ color: 'var(--ocean-500)', fontSize: '0.8rem' }}>Import at least 2 Signing Day seasons to view chart.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ fontFamily: 'inherit' }}>
            {/* Y grid + labels */}
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={PAD.l} x2={PAD.l + chartW} y1={PAD.t + yScale(v)} y2={PAD.t + yScale(v)}
                  stroke="var(--ocean-800)" strokeWidth={1} />
                <text x={PAD.l - 6} y={PAD.t + yScale(v) + 4} textAnchor="end"
                  style={{ fontSize: 10, fill: 'var(--ocean-500)' }}>{v}</text>
              </g>
            ))}
            {/* X axis labels */}
            {sdSeasons.map((s, i) => (
              <text key={s.id} x={PAD.l + xScale(i)} y={H - PAD.b + 18} textAnchor="middle"
                style={{ fontSize: 10, fill: 'var(--ocean-500)' }}>{s.year}</text>
            ))}
            {/* Series lines */}
            {seriesData.map(({ teamName, points }, si) => {
              const color = CHART_PALETTE[si % CHART_PALETTE.length];
              const validPoints = points.filter((p) => p.score != null);
              if (validPoints.length < 2) return null;
              const d = validPoints.map((p, pi) => {
                const xi = sdSeasons.findIndex((s) => s.year === p.year);
                const x = PAD.l + xScale(xi);
                const y = PAD.t + yScale(p.score!);
                return `${pi === 0 ? 'M' : 'L'}${x},${y}`;
              }).join(' ');
              return (
                <g key={teamName}>
                  <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
                  {validPoints.map((p) => {
                    const xi = sdSeasons.findIndex((s) => s.year === p.year);
                    return (
                      <circle key={p.year} cx={PAD.l + xScale(xi)} cy={PAD.t + yScale(p.score!)} r={3}
                        fill={color} />
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}

function Th({ label, k, sortKey, sortDir, onClick, borderLeft }: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  onClick: (k: SortKey) => void;
  borderLeft?: boolean;
}) {
  const active = sortKey === k;
  return (
    <th
      onClick={() => onClick(k)}
      className="cursor-pointer select-none whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide transition-colors"
      style={{
        color: active ? 'var(--ocean-100)' : 'var(--ocean-500)',
        borderLeft: borderLeft ? '2px solid var(--ocean-700)' : undefined,
      }}
    >
      {label}{active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  );
}
