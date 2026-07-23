'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { safeJson } from '@/lib/safeFetch';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

type HistoryRow = {
  overall: number | null;
  prestige: number | null;
  prestigeRank: number | null;
  teamRank: number | null;
  wins: number | null;
  losses: number | null;
  recruitingRank: number | null;
  transfersIn: number | null;
  transfersOut: number | null;
  recruitCount: number | null;
  fiveStars: number | null;
  fourStars: number | null;
  threeStars: number | null;
  twoStars: number | null;
  oneStars: number | null;
  avgGrade: number | null;
  facilitiesScore: number | null;
  gradeAtmosphere: string | null;
  gradeBrand: string | null;
  gradeBudget: string | null;
  gradeTraditions: string | null;
  gradeConference: string | null;
  gradeFacilities: string | null;
  gradeAcademic: string | null;
  gradeCampus: string | null;
  gradeCoachStability: string | null;
  gradeCoachPrestige: string | null;
  gradeChampion: string | null;
  gradeProQB: string | null; gradeProRB: string | null; gradeProWR: string | null;
  gradeProTE: string | null; gradeProOL: string | null; gradeProDL: string | null;
  gradeProLB: string | null; gradeProDB: string | null; gradeProK: string | null; gradeProP: string | null;
  team: { id: string; name: string; conference: string };
  season: { id: string; year: number };
};

type SeasonSetting = {
  seasonId: string;
  year: number;
  unsignedHSFiveStar: number | null;
  unsignedHSFourStar: number | null;
  unsignedHSThreeStar: number | null;
  unsignedXferFiveStar: number | null;
  unsignedXferFourStar: number | null;
  unsignedXferThreeStar: number | null;
};

const GRADE_NUM: Record<string, number> = {
  'A+': 4.3, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0,
};

const LINE_INDICATORS = [
  { key: 'overall', label: 'Overall Rating' },
  { key: 'prestige', label: 'Prestige' },
  { key: 'prestigeRank', label: 'Prestige Rank' },
  { key: 'teamRank', label: 'National Rank' },
  { key: 'wins', label: 'Wins' },
  { key: 'losses', label: 'Losses' },
  { key: 'recruitingRank', label: 'Recruiting Class Rank' },
  { key: 'transfersIn', label: 'Transfers In' },
  { key: 'transfersOut', label: 'Transfers Out' },
  { key: 'recruitCount', label: 'Recruits Signed' },
  { key: 'fiveStars', label: '5-Star Recruits' },
  { key: 'fourStars', label: '4-Star Recruits' },
  { key: 'threeStars', label: '3-Star Recruits' },
  { key: 'twoStars', label: '2-Star Recruits' },
  { key: 'oneStars', label: '1-Star Recruits' },
  { key: 'netTransfers', label: 'Net Transfers (In − Out)' },
  { key: 'avgGrade', label: 'Avg School Grade' },
  { key: 'facilitiesScore', label: 'Facilities Score (0–100)' },
  { key: 'gradeAtmosphere', label: 'Stadium Atmosphere Grade' },
  { key: 'gradeBrand', label: 'Brand Exposure Grade' },
  { key: 'gradeBudget', label: 'Program Budget Grade' },
  { key: 'gradeTraditions', label: 'Program Traditions Grade' },
  { key: 'gradeConference', label: 'Conference Prestige Grade' },
  { key: 'gradeFacilities', label: 'Athletic Facilities Grade' },
  { key: 'gradeAcademic', label: 'Academic Prestige Grade' },
  { key: 'gradeCampus', label: 'Campus Lifestyle Grade' },
  { key: 'gradeChampion', label: 'Championship Contender Grade' },
  { key: 'gradeCoachStability', label: 'Coach Stability Grade' },
  { key: 'gradeCoachPrestige', label: 'Coach Prestige Grade' },
  { key: 'gradeProQB', label: 'Pro Potential: QB' },
  { key: 'gradeProRB', label: 'Pro Potential: RB' },
  { key: 'gradeProWR', label: 'Pro Potential: WR' },
  { key: 'gradeProTE', label: 'Pro Potential: TE' },
  { key: 'gradeProOL', label: 'Pro Potential: OL' },
  { key: 'gradeProDL', label: 'Pro Potential: DL' },
  { key: 'gradeProLB', label: 'Pro Potential: LB' },
  { key: 'gradeProDB', label: 'Pro Potential: DB' },
  { key: 'gradeProK', label: 'Pro Potential: K' },
  { key: 'gradeProP', label: 'Pro Potential: P' },
] as const;
type IndicatorKey = (typeof LINE_INDICATORS)[number]['key'];

const COLORS = ['#003f5c', '#006b71', '#009446', '#65a31c', '#b1aa00', '#ffa600'];

const STAR_COLORS = {
  fiveStars: '#003f5c',
  fourStars: '#006b71',
  threeStars: '#009446',
  twoStars:  '#65a31c',
  oneStars:  '#b1aa00',
};

const OVR_BANDS = [
  { label: '90–99', min: 90, max: 99, color: '#003f5c' },
  { label: '80–89', min: 80, max: 89, color: '#006b71' },
  { label: '70–79', min: 70, max: 79, color: '#009446' },
  { label: '60–69', min: 60, max: 69, color: '#b1aa00' },
  { label: '<60',   min: 0,  max: 59, color: '#ffa600' },
];

const AXIS_STYLE = {
  ticks: { color: '#666', font: { family: 'Inter, system-ui, sans-serif', size: 11 } },
  grid: { color: 'rgba(160,160,160,0.3)', borderDash: [2, 4] as [number, number] },
};
const LEGEND_STYLE = {
  position: 'bottom' as const,
  align: 'start' as const,
  labels: { color: '#333', boxWidth: 8, boxHeight: 8, padding: 14, font: { size: 11, family: 'Inter, system-ui, sans-serif' } },
};

const PRESTIGE_BANDS = [
  { label: 'Elite (9–10)',     min: 9,  max: 10,  color: '#003f5c' },
  { label: 'High (7–8)',       min: 7,  max: 8,   color: '#006b71' },
  { label: 'Mid (5–6)',        min: 5,  max: 6,   color: '#009446' },
  { label: 'Low (3–4)',        min: 3,  max: 4,   color: '#b1aa00' },
  { label: 'Bottom (1–2)',     min: 1,  max: 2,   color: '#ffa600' },
];

type ChartMode = 'line' | 'composition' | 'ovr-bands' | 'unsigned-national' | 'net-transfers-national' | 'star-access-national';
const NATIONAL_MODES: ChartMode[] = ['ovr-bands', 'unsigned-national', 'net-transfers-national'];
const REVERSED_INDICATORS = new Set(['recruitingRank', 'prestigeRank', 'teamRank']);

type PanelConfig = { mode: ChartMode; indicator: IndicatorKey };

const DEFAULT_PANELS: PanelConfig[] = [
  { mode: 'line', indicator: 'overall' },
  { mode: 'line', indicator: 'wins' },
  { mode: 'line', indicator: 'teamRank' },
  { mode: 'ovr-bands', indicator: 'overall' },
];

export default function ChartsPage() {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [settings, setSettings] = useState<SeasonSetting[]>([]);
  const [layout, setLayout] = useState<1 | 4>(1);
  const [panels, setPanels] = useState<PanelConfig[]>(DEFAULT_PANELS);
  const [conferenceFilter, setConferenceFilter] = useState('All');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [histRes, seasonsRes] = await Promise.all([
        safeJson<HistoryRow[]>('/api/history'),
        safeJson<{ id: string; year: number }[]>('/api/seasons'),
      ]);
      if (histRes.ok && histRes.data) setHistory(histRes.data);
      const seasons = seasonsRes.ok && seasonsRes.data ? seasonsRes.data : [];
      const settled = await Promise.all(
        seasons.map((s) =>
          safeJson<any>(`/api/settings?seasonId=${s.id}`).then((r) =>
            r.ok && r.data ? { ...r.data, seasonId: s.id, year: s.year } : null
          )
        )
      );
      setSettings(settled.filter(Boolean) as SeasonSetting[]);
      setLoading(false);
    })();
  }, []);

  const conferences = useMemo(() => {
    const set = new Set(history.map((h) => h.team.conference));
    return ['All', ...Array.from(set).sort()];
  }, [history]);

  const teamsInConference = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of history) {
      if (conferenceFilter === 'All' || h.team.conference === conferenceFilter) {
        map.set(h.team.id, h.team.name);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [history, conferenceFilter]);

  useEffect(() => {
    setSelectedTeams(teamsInConference.slice(0, 5).map(([id]) => id));
  }, [teamsInConference]);

  const seasonYears = useMemo(() => {
    const set = new Set(history.map((h) => h.season.year));
    return Array.from(set).sort((a, b) => a - b);
  }, [history]);

  const allSelected = selectedTeams.length === teamsInConference.length;
  function toggleSelectAll() {
    if (allSelected) setSelectedTeams([]);
    else setSelectedTeams(teamsInConference.map(([id]) => id));
  }
  function toggleTeam(id: string) {
    setSelectedTeams((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function updatePanel(i: number, patch: Partial<PanelConfig>) {
    setPanels(prev => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  const activePanels = panels.slice(0, layout);
  const anyPerTeam = activePanels.some(p => !NATIONAL_MODES.includes(p.mode));

  if (loading) return <div className="p-8" style={{ color: 'var(--ocean-400)' }}>Loading…</div>;
  if (!history.length) return <div className="mx-auto max-w-2xl px-6 py-20 text-center" style={{ color: 'var(--ocean-400)' }}>No data yet — import a save first.</div>;

  const gridClass = layout === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2';

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-5">
      {/* Global controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3" style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-500)' }}>Layout</span>
          <div className="flex gap-1">
            {[1, 4].map((n) => (
              <button key={n} onClick={() => setLayout(n as 1 | 4)}
                className="rounded px-2.5 py-1 text-xs font-medium"
                style={{
                  background: layout === n ? 'var(--ocean-700)' : 'var(--ocean-800)',
                  color: layout === n ? 'var(--ocean-100)' : 'var(--ocean-300)',
                  border: '1px solid var(--ocean-700)',
                }}>
                {n === 4 ? '2×2' : `${n}`}
              </button>
            ))}
          </div>
        </div>

        {anyPerTeam && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-500)' }}>Conference</span>
            <select value={conferenceFilter} onChange={(e) => setConferenceFilter(e.target.value)}
              className="rounded-md border px-2.5 py-1.5 text-sm font-medium outline-none"
              style={{ background: 'var(--ocean-800)', borderColor: 'var(--ocean-700)', color: 'var(--ocean-100)' }}>
              {conferences.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        <div className="ml-auto">
          <a href="/api/export?type=stats" download
            className="rounded px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--ocean-800)', color: 'var(--ocean-300)', border: '1px solid var(--ocean-700)' }}>
            Export CSV
          </a>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${anyPerTeam ? 'lg:grid-cols-[1fr_240px]' : ''}`}>
        <div className={`grid gap-4 ${gridClass}`}>
          {activePanels.map((panel, i) => (
            <ChartPanel
              key={i}
              panel={panel}
              onChange={(patch) => updatePanel(i, patch)}
              history={history}
              settings={settings}
              seasonYears={seasonYears}
              selectedTeams={selectedTeams}
              compact={layout > 1}
            />
          ))}
        </div>

        {anyPerTeam && (
          <div className="rounded-lg border p-4" style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}>
            <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--ocean-300)' }}>Teams</h2>
            <div className="flex max-h-[600px] flex-col gap-1 overflow-y-auto text-sm">
              <label className="flex cursor-pointer items-center gap-2 rounded border-b px-2 py-1.5 font-semibold" style={{ color: 'var(--ocean-100)', borderColor: 'var(--ocean-800)' }}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="accent-blue-500" />
                Select All
              </label>
              {teamsInConference.map(([id, name]) => (
                <label key={id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 transition-colors" style={{ color: 'var(--ocean-200)' }}>
                  <input type="checkbox" checked={selectedTeams.includes(id)} onChange={() => toggleTeam(id)} className="accent-blue-500" />
                  {name}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

function ChartPanel({
  panel, onChange, history, settings, seasonYears, selectedTeams, compact,
}: {
  panel: PanelConfig;
  onChange: (patch: Partial<PanelConfig>) => void;
  history: HistoryRow[];
  settings: SeasonSetting[];
  seasonYears: number[];
  selectedTeams: string[];
  compact: boolean;
}) {
  const isStarAccess = panel.mode === 'star-access-national';
  const chartHeight = compact ? (isStarAccess ? 510 : 260) : 580;
  const [starPrestigeFilter, setStarPrestigeFilter] = useState('All');

  const lineChartData = useMemo(() => {
    const datasets = selectedTeams.map((teamId, i) => {
      const teamRows = history.filter((h) => h.team.id === teamId);
      const teamName = teamRows[0]?.team.name ?? teamId;
      const data = seasonYears.map((year) => {
        const row = teamRows.find((r) => r.season.year === year);
        if (!row) return null;
        if (panel.indicator === 'netTransfers') return (row.transfersIn ?? 0) - (row.transfersOut ?? 0);
        const val = row[panel.indicator as keyof typeof row];
        if (typeof val === 'string') return GRADE_NUM[val] ?? null;
        return val as number | null;
      });
      return { label: teamName, data, borderColor: COLORS[i % COLORS.length], backgroundColor: COLORS[i % COLORS.length], spanGaps: true, tension: 0.25 };
    });
    return { labels: seasonYears, datasets };
  }, [selectedTeams, history, seasonYears, panel.indicator]);

  const compositionCharts = useMemo(() => {
    return selectedTeams.map((teamId) => {
      const teamRows = history.filter((h) => h.team.id === teamId);
      const teamName = teamRows[0]?.team.name ?? teamId;
      const starKeys = ['fiveStars', 'fourStars', 'threeStars', 'twoStars', 'oneStars'] as const;
      const starLabels = ['5★', '4★', '3★', '2★', '1★'];
      const datasets = starKeys.map((key, i) => ({
        label: starLabels[i],
        data: seasonYears.map((year) => {
          const row = teamRows.find((r) => r.season.year === year);
          return row ? (row[key] ?? 0) : 0;
        }),
        backgroundColor: STAR_COLORS[key],
      }));
      return { teamName, data: { labels: seasonYears, datasets } };
    });
  }, [selectedTeams, history, seasonYears]);

  const ovrBandsData = useMemo(() => ({
    labels: seasonYears,
    datasets: OVR_BANDS.map((band) => ({
      label: band.label,
      data: seasonYears.map((year) => {
        const rows = history.filter((h) => h.season.year === year && h.overall != null);
        return rows.filter((h) => h.overall! >= band.min && h.overall! <= band.max).length;
      }),
      backgroundColor: band.color,
    })),
  }), [history, seasonYears]);

  const unsignedNationalData = useMemo(() => {
    const sorted = [...settings].sort((a, b) => a.year - b.year);
    return {
      labels: sorted.map((s) => s.year),
      datasets: [
        { label: 'HS 5★',   data: sorted.map((s) => s.unsignedHSFiveStar ?? 0),   backgroundColor: '#003f5c', stack: 'hs' },
        { label: 'HS 4★',   data: sorted.map((s) => s.unsignedHSFourStar ?? 0),   backgroundColor: '#006b71', stack: 'hs' },
        { label: 'HS 3★',   data: sorted.map((s) => s.unsignedHSThreeStar ?? 0),  backgroundColor: '#009446', stack: 'hs' },
        { label: 'Xfer 5★', data: sorted.map((s) => s.unsignedXferFiveStar ?? 0), backgroundColor: 'rgba(0,63,92,0.5)', stack: 'xfer' },
        { label: 'Xfer 4★', data: sorted.map((s) => s.unsignedXferFourStar ?? 0), backgroundColor: 'rgba(0,107,113,0.5)', stack: 'xfer' },
        { label: 'Xfer 3★', data: sorted.map((s) => s.unsignedXferThreeStar ?? 0),backgroundColor: 'rgba(0,148,70,0.5)', stack: 'xfer' },
      ],
    };
  }, [settings]);

  const netTransfersNationalData = useMemo(() => ({
    labels: seasonYears,
    datasets: [
      {
        label: 'Transfers In',
        data: seasonYears.map((year) =>
          history.filter((h) => h.season.year === year).reduce((s, h) => s + (h.transfersIn ?? 0), 0)
        ),
        backgroundColor: '#009446',
      },
      {
        label: 'Transfers Out',
        data: seasonYears.map((year) =>
          history.filter((h) => h.season.year === year).reduce((s, h) => s + (h.transfersOut ?? 0), 0)
        ),
        backgroundColor: '#ffa600',
      },
    ],
  }), [history, seasonYears]);

  const indicatorLabel = LINE_INDICATORS.find((i) => i.key === panel.indicator)?.label ?? panel.indicator;

  const chartTitle =
    panel.mode === 'line' ? indicatorLabel
    : panel.mode === 'composition' ? 'Recruit Composition by Star'
    : panel.mode === 'ovr-bands' ? 'OVR Band Distribution'
    : panel.mode === 'unsigned-national' ? 'Unsigned Recruits — National'
    : panel.mode === 'net-transfers-national' ? 'Transfer Volume — National'
    : 'Star Recruiting Reach by Prestige';

  const starKeys = ['fiveStars', 'fourStars', 'threeStars', 'twoStars', 'oneStars'] as const;
  const starLabels = ['5★', '4★', '3★', '2★', '1★'];
  const starColours = [STAR_COLORS.fiveStars, STAR_COLORS.fourStars, STAR_COLORS.threeStars, STAR_COLORS.twoStars, STAR_COLORS.oneStars];

  const starAccessLineData = useMemo(() => {
    const band = PRESTIGE_BANDS.find(b => b.label === starPrestigeFilter);
    const filterFn = (h: HistoryRow) => {
      if (!band) return true;
      const p = h.prestige ?? 0;
      return p >= band.min && p <= band.max;
    };
    const datasets = starKeys.map((key, ki) => ({
      label: starLabels[ki],
      data: seasonYears.map((year) =>
        history.filter(h => h.season.year === year && filterFn(h)).filter(h => (h[key] ?? 0) >= 1).length
      ),
      borderColor: starColours[ki],
      backgroundColor: starColours[ki],
      spanGaps: true,
      tension: 0.25,
      pointRadius: 3,
    }));
    return { labels: seasonYears, datasets };
  }, [history, seasonYears, starPrestigeFilter]);

  // [yearIdx][starKeyIdx] → sorted team names for star access tooltip
  const starAccessTeams = useMemo(() => {
    const band = PRESTIGE_BANDS.find(b => b.label === starPrestigeFilter);
    const filterFn = (h: HistoryRow) => {
      if (!band) return true;
      const p = h.prestige ?? 0;
      return p >= band.min && p <= band.max;
    };
    return seasonYears.map((year) =>
      starKeys.map((key) =>
        history
          .filter(h => h.season.year === year && filterFn(h) && (h[key] ?? 0) >= 1)
          .map(h => h.team.name)
          .sort()
      )
    );
  }, [history, seasonYears, starPrestigeFilter]);

  const starAccessBarData = useMemo(() => {
    const recentYear = seasonYears.length ? Math.max(...seasonYears) : 0;
    const recentRows = history.filter(h => h.season.year === recentYear);
    const datasets = PRESTIGE_BANDS.map((band) => ({
      label: band.label,
      data: starKeys.map((key) => {
        const inBand = recentRows.filter(h => { const p = h.prestige ?? 0; return p >= band.min && p <= band.max; });
        return inBand.filter(h => (h[key] ?? 0) >= 1).length;
      }),
      backgroundColor: band.color,
      stack: 'prestige',
    }));
    return { labels: starLabels, datasets };
  }, [history, seasonYears]);

  const selStyle = { background: 'var(--ocean-800)', borderColor: 'var(--ocean-700)', color: 'var(--ocean-200)' };

  return (
    <div className="rounded-lg border p-4" style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-700)' }}>
      {/* Panel header: title left, controls right */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--ocean-700)' }}>
        <h3 className="text-base font-semibold" style={{ color: 'var(--ocean-100)' }}>
          {chartTitle}
        </h3>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {panel.mode === 'star-access-national' && (
            <select value={starPrestigeFilter} onChange={(e) => setStarPrestigeFilter(e.target.value)}
              className="rounded border px-2 py-1 text-xs font-medium outline-none" style={selStyle}>
              <option value="All">All Prestige</option>
              {PRESTIGE_BANDS.map(b => <option key={b.label} value={b.label}>{b.label}</option>)}
            </select>
          )}
          {panel.mode === 'line' && (
            <select value={panel.indicator} onChange={(e) => onChange({ indicator: e.target.value as IndicatorKey })}
              className="rounded border px-2 py-1 text-xs font-medium outline-none" style={selStyle}>
              {LINE_INDICATORS.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
            </select>
          )}
          <select value={panel.mode} onChange={(e) => onChange({ mode: e.target.value as ChartMode })}
            className="rounded border px-2 py-1 text-xs font-medium outline-none" style={selStyle}>
            <option value="line">Trend Line</option>
            <option value="composition">Recruit Composition</option>
            <option disabled>──────────</option>
            <option value="ovr-bands">Nat: OVR Bands</option>
            <option value="unsigned-national">Nat: Unsigned Recruits</option>
            <option value="net-transfers-national">Nat: Net Transfers</option>
            <option value="star-access-national">Nat: Star Recruiting Reach</option>
          </select>
        </div>
      </div>

      <div style={{ height: chartHeight }}>
        {panel.mode === 'line' && (
          <Line data={lineChartData} options={{
            responsive: true, maintainAspectRatio: false,
            scales: {
              x: AXIS_STYLE,
              y: { reverse: REVERSED_INDICATORS.has(panel.indicator), ...AXIS_STYLE },
            },
            plugins: { legend: { ...LEGEND_STYLE, display: selectedTeams.length <= 20 } },
          }} />
        )}

        {panel.mode === 'composition' && (
          compositionCharts.length === 0 ? (
            <div className="grid h-full place-items-center text-sm" style={{ color: 'var(--ocean-400)' }}>Select teams to see composition</div>
          ) : (
            <div className="flex h-full flex-col gap-2 overflow-y-auto pr-1">
              {compositionCharts.map(({ teamName, data }) => (
                <div key={teamName}>
                  <div className="mb-1 text-xs" style={{ color: 'var(--ocean-300)' }}>{teamName}</div>
                  <div style={{ height: compact ? 100 : 140 }}>
                    <Bar data={data} options={{
                      responsive: true, maintainAspectRatio: false,
                      scales: {
                        x: { stacked: true, ...AXIS_STYLE },
                        y: { stacked: true, ...AXIS_STYLE, ticks: { ...AXIS_STYLE.ticks, stepSize: 1 } },
                      },
                      plugins: { legend: LEGEND_STYLE },
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {panel.mode === 'ovr-bands' && (
          <Bar data={ovrBandsData} options={{
            responsive: true, maintainAspectRatio: false,
            scales: {
              x: { stacked: true, ...AXIS_STYLE },
              y: { stacked: true, ...AXIS_STYLE },
            },
            plugins: { legend: LEGEND_STYLE },
          }} />
        )}

        {panel.mode === 'unsigned-national' && (
          settings.length === 0 ? (
            <div className="grid h-full place-items-center text-sm" style={{ color: 'var(--ocean-400)' }}>No unsigned data — import a save first.</div>
          ) : (
            <Bar data={unsignedNationalData} options={{
              responsive: true, maintainAspectRatio: false,
              scales: { x: AXIS_STYLE, y: AXIS_STYLE },
              plugins: { legend: LEGEND_STYLE },
            }} />
          )
        )}

        {panel.mode === 'net-transfers-national' && (
          <Bar data={netTransfersNationalData} options={{
            responsive: true, maintainAspectRatio: false,
            scales: { x: AXIS_STYLE, y: AXIS_STYLE },
            plugins: { legend: LEGEND_STYLE },
          }} />
        )}

        {panel.mode === 'star-access-national' && (
          seasonYears.length === 0 ? (
            <div className="grid h-full place-items-center text-sm" style={{ color: 'var(--ocean-400)' }}>No data — import a save first.</div>
          ) : (
            <div className="flex h-full flex-col gap-2">
              {/* Line: time series — teams with ≥1 of each star */}
              <div>
                <div className="mb-1 text-xs font-medium" style={{ color: 'var(--ocean-400)' }}>
                  Teams with ≥1 recruit at each star level — over time
                  {starPrestigeFilter !== 'All' && <span className="ml-2" style={{ color: 'var(--ocean-600)' }}>{starPrestigeFilter}</span>}
                </div>
                <div style={{ height: compact ? 200 : 260 }}>
                  <Line data={starAccessLineData} options={{
                    responsive: true, maintainAspectRatio: false,
                    scales: { x: AXIS_STYLE, y: { ...AXIS_STYLE, ticks: { ...AXIS_STYLE.ticks, stepSize: 1 } } },
                    plugins: {
                      legend: LEGEND_STYLE,
                      tooltip: {
                        callbacks: {
                          afterLabel: (ctx) => {
                            const teams = starAccessTeams[ctx.dataIndex]?.[ctx.datasetIndex] ?? [];
                            return teams.length ? teams.join(', ') : '';
                          },
                        },
                      },
                    },
                  }} />
                </div>
              </div>
              {/* Bar: stacked by prestige for most recent season */}
              <div>
                <div className="mb-1 text-xs font-medium" style={{ color: 'var(--ocean-400)' }}>
                  Teams recruiting each star tier — by prestige (most recent season)
                </div>
                <div style={{ height: compact ? 200 : 260 }}>
                  <Bar data={starAccessBarData} options={{
                    responsive: true, maintainAspectRatio: false,
                    scales: {
                      x: AXIS_STYLE,
                      y: { ...AXIS_STYLE, stacked: true, ticks: { ...AXIS_STYLE.ticks, stepSize: 1 } },
                    },
                    plugins: { legend: LEGEND_STYLE },
                  }} />
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
