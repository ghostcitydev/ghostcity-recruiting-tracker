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
    // default-select first 5 teams whenever the conference filter changes
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

  if (loading) return <div className="p-6 text-zinc-400">Loading…</div>;

  if (!history.length) {
    return <div className="mx-auto max-w-2xl px-6 py-16 text-center text-zinc-400">No data yet — import a save first.</div>;
  }

  const indicatorLabel = INDICATORS.find((i) => i.key === indicator)?.label ?? indicator;

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div>
          <label className="mr-2 text-sm text-zinc-400">Indicator</label>
          <select
            value={indicator}
            onChange={(e) => setIndicator(e.target.value as IndicatorKey)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
          >
            {INDICATORS.map((i) => (
              <option key={i.key} value={i.key}>{i.label}</option>
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
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_240px]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">{indicatorLabel} by Season</h2>
          <Line
            data={chartData}
            options={{
              responsive: true,
              scales: {
                x: { ticks: { color: '#a1a1aa' }, grid: { color: '#27272a' } },
                y: {
                  reverse: indicator === 'recruitingRank',
                  ticks: { color: '#a1a1aa' },
                  grid: { color: '#27272a' },
                },
              },
              plugins: {
                legend: { labels: { color: '#d4d4d8' } },
              },
            }}
          />
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">Teams</h2>
          <div className="flex max-h-96 flex-col gap-1 overflow-y-auto text-sm">
            {teamsInConference.map(([id, name]) => (
              <label key={id} className="flex items-center gap-2 text-zinc-300">
                <input type="checkbox" checked={selectedTeams.includes(id)} onChange={() => toggleTeam(id)} />
                {name}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
