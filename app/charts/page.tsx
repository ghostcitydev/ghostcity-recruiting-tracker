'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type HistoryRow = {
  overall: number | null;
  prestige: number | null;
  recruitingRank: number | null;
  transfersIn: number | null;
  transfersOut: number | null;
  recruitCount: number | null;
  fiveStars: number | null;
  fourStars: number | null;
  team: { id: string; name: string; conference: string };
  season: { id: string; year: number };
};

const INDICATORS = [
  { key: 'overall', label: 'Overall Rating' },
  { key: 'prestige', label: 'Prestige' },
  { key: 'recruitingRank', label: 'Recruiting Class Rank' },
  { key: 'transfersIn', label: 'Transfers In' },
  { key: 'transfersOut', label: 'Transfers Out' },
  { key: 'recruitCount', label: 'Recruits Signed' },
  { key: 'fiveStars', label: '5-Star Recruits' },
  { key: 'fourStars', label: '4-Star Recruits' },
] as const;
type IndicatorKey = (typeof INDICATORS)[number]['key'];

const COLORS = ['#34d399', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#fb7185', '#22d3ee', '#f97316'];

export default function ChartsPage() {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [indicator, setIndicator] = useState<IndicatorKey>('overall');
  const [conferenceFilter, setConferenceFilter] = useState('All');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/history').then((r) => r.json()).then((data: HistoryRow[]) => {
      setHistory(data);
      setLoading(false);
    });
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

  const chartData = useMemo(() => {
    const datasets = selectedTeams.map((teamId, i) => {
      const teamRows = history.filter((h) => h.team.id === teamId);
      const teamName = teamRows[0]?.team.name ?? teamId;
      const data = seasonYears.map((year) => {
        const row = teamRows.find((r) => r.season.year === year);
        return row ? (row[indicator] as number | null) : null;
      });
      return {
        label: teamName,
        data,
        borderColor: COLORS[i % COLORS.length],
        backgroundColor: COLORS[i % COLORS.length],
        spanGaps: true,
        tension: 0.25,
      };
    });
    return { labels: seasonYears, datasets };
  }, [selectedTeams, history, seasonYears, indicator]);

  function toggleTeam(id: string) {
    setSelectedTeams((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  if (loading) return <div className="p-8" style={{ color: 'var(--ocean-400)' }}>Loading…</div>;

  if (!history.length) {
    return <div className="mx-auto max-w-2xl px-6 py-20 text-center" style={{ color: 'var(--ocean-400)' }}>No data yet — import a save first.</div>;
  }

  const indicatorLabel = INDICATORS.find((i) => i.key === indicator)?.label ?? indicator;

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-5">
      <div
        className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3"
        style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-500)' }}>Indicator</span>
          <select
            value={indicator}
            onChange={(e) => setIndicator(e.target.value as IndicatorKey)}
            className="rounded-md border px-2.5 py-1.5 text-sm font-medium outline-none"
            style={{ background: 'var(--ocean-800)', borderColor: 'var(--ocean-700)', color: 'var(--ocean-100)' }}
          >
            {INDICATORS.map((i) => (
              <option key={i.key} value={i.key}>{i.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-500)' }}>Conference</span>
          <select
            value={conferenceFilter}
            onChange={(e) => setConferenceFilter(e.target.value)}
            className="rounded-md border px-2.5 py-1.5 text-sm font-medium outline-none"
            style={{ background: 'var(--ocean-800)', borderColor: 'var(--ocean-700)', color: 'var(--ocean-100)' }}
          >
            {conferences.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        <div
          className="rounded-lg border p-5"
          style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--ocean-300)' }}>{indicatorLabel} by Season</h2>
          <Line
            data={chartData}
            options={{
              responsive: true,
              scales: {
                x: {
                  ticks: { color: '#5a9ad4' },
                  grid: { color: 'rgba(19,45,84,0.8)' },
                },
                y: {
                  reverse: indicator === 'recruitingRank',
                  ticks: { color: '#5a9ad4' },
                  grid: { color: 'rgba(19,45,84,0.8)' },
                },
              },
              plugins: {
                legend: { labels: { color: '#b8d8f2' } },
              },
            }}
          />
        </div>

        <div
          className="rounded-lg border p-4"
          style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}
        >
          <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--ocean-300)' }}>Teams</h2>
          <div className="flex max-h-[500px] flex-col gap-1 overflow-y-auto text-sm">
            {teamsInConference.map(([id, name]) => (
              <label key={id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 transition-colors" style={{ color: 'var(--ocean-200)' }}>
                <input
                  type="checkbox"
                  checked={selectedTeams.includes(id)}
                  onChange={() => toggleTeam(id)}
                  className="accent-blue-500"
                />
                {name}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
