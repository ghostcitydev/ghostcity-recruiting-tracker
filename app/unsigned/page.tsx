'use client';

import { useEffect, useMemo, useState } from 'react';

type Season = { id: string; year: number; label: string };
type SeasonSettings = {
  unsignedTotal: number | null;
  unsignedFiveStar: number | null;
  unsignedFourStar: number | null;
  unsignedThreeStar: number | null;
  unsignedTwoStar: number | null;
  unsignedOneStar: number | null;
  unsignedHS: number | null;
  unsignedTransfer: number | null;
  unsignedHSFiveStar: number | null;
  unsignedHSFourStar: number | null;
  unsignedHSThreeStar: number | null;
  unsignedHSTwoStar: number | null;
  unsignedHSOneStar: number | null;
  unsignedXferFiveStar: number | null;
  unsignedXferFourStar: number | null;
  unsignedXferThreeStar: number | null;
  unsignedXferTwoStar: number | null;
  unsignedXferOneStar: number | null;
};

type UnsignedSeason = {
  year: number;
  label: string;
  settings: SeasonSettings | null;
};

const STAR_COLORS = {
  fiveStar: '#fbbf24',
  fourStar: '#a78bfa',
  threeStar: '#60a5fa',
  twoStar: '#34d399',
  oneStar: '#94a3b8',
};

export default function UnsignedPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [data, setData] = useState<Map<string, SeasonSettings>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/seasons')
      .then((r) => r.json())
      .then(async (seasons: Season[]) => {
        setSeasons(seasons);
        const map = new Map<string, SeasonSettings>();
        for (const s of seasons) {
          const res = await fetch(`/api/settings?seasonId=${s.id}`);
          const settings = await res.json();
          if (settings) map.set(s.id, settings);
        }
        setData(map);
        setLoading(false);
      });
  }, []);

  const rows: UnsignedSeason[] = useMemo(() => {
    return seasons.map((s) => ({
      year: s.year,
      label: s.label,
      settings: data.get(s.id) ?? null,
    })).sort((a, b) => a.year - b.year);
  }, [seasons, data]);

  if (loading) return <div className="p-8" style={{ color: 'var(--ocean-400)' }}>Loading…</div>;

  if (!rows.length || !rows.some((r) => r.settings)) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center" style={{ color: 'var(--ocean-400)' }}>
        No data yet — import a save first.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--ocean-100)' }}>Unsigned Recruits & Transfers</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--ocean-400)' }}>
            Tracks the number of recruits and transfers still uncommitted at the time of each import.
            High unsigned counts — especially among top-rated prospects — may indicate AI recruiting logic issues.
          </p>
        </div>
        <a
          href="/api/export?type=unsigned"
          download
          className="shrink-0 rounded px-2.5 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
          style={{ background: 'var(--ocean-800)', color: 'var(--ocean-300)', border: '1px solid var(--ocean-700)' }}
        >
          Export CSV
        </a>
      </div>

      {/* Summary table */}
      <div
        className="overflow-x-auto rounded-lg border"
        style={{ borderColor: 'var(--ocean-800)' }}
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr style={{ background: 'var(--ocean-900)', borderBottom: '1px solid var(--ocean-800)' }}>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-400)' }} rowSpan={2}>Season</th>
              <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-400)' }} rowSpan={2}>Total</th>
              <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide border-l" style={{ color: '#60a5fa', borderColor: 'var(--ocean-700)' }} colSpan={6}>High School / JUCO</th>
              <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide border-l" style={{ color: '#a78bfa', borderColor: 'var(--ocean-700)' }} colSpan={6}>Transfer Portal</th>
            </tr>
            <tr style={{ background: 'var(--ocean-900)' }}>
              <th className="px-4 py-2 text-right text-xs font-semibold border-l" style={{ color: 'var(--ocean-400)', borderColor: 'var(--ocean-700)' }}>Total</th>
              <th className="px-4 py-2 text-right text-xs font-semibold" style={{ color: STAR_COLORS.fiveStar }}>★5</th>
              <th className="px-4 py-2 text-right text-xs font-semibold" style={{ color: STAR_COLORS.fourStar }}>★4</th>
              <th className="px-4 py-2 text-right text-xs font-semibold" style={{ color: STAR_COLORS.threeStar }}>★3</th>
              <th className="px-4 py-2 text-right text-xs font-semibold" style={{ color: STAR_COLORS.twoStar }}>★2</th>
              <th className="px-4 py-2 text-right text-xs font-semibold" style={{ color: STAR_COLORS.oneStar }}>★1</th>
              <th className="px-4 py-2 text-right text-xs font-semibold border-l" style={{ color: 'var(--ocean-400)', borderColor: 'var(--ocean-700)' }}>Total</th>
              <th className="px-4 py-2 text-right text-xs font-semibold" style={{ color: STAR_COLORS.fiveStar }}>★5</th>
              <th className="px-4 py-2 text-right text-xs font-semibold" style={{ color: STAR_COLORS.fourStar }}>★4</th>
              <th className="px-4 py-2 text-right text-xs font-semibold" style={{ color: STAR_COLORS.threeStar }}>★3</th>
              <th className="px-4 py-2 text-right text-xs font-semibold" style={{ color: STAR_COLORS.twoStar }}>★2</th>
              <th className="px-4 py-2 text-right text-xs font-semibold" style={{ color: STAR_COLORS.oneStar }}>★1</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const s = r.settings;
              if (!s) return null;
              return (
                <tr
                  key={r.year}
                  style={{ background: i % 2 === 0 ? 'var(--ocean-950)' : 'rgba(13,31,60,0.5)' }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--ocean-100)' }}>{r.label}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold" style={{ color: 'var(--ocean-200)' }}>{s.unsignedTotal ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium border-l" style={{ color: '#60a5fa', borderColor: 'var(--ocean-800)' }}>{s.unsignedHS ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: STAR_COLORS.fiveStar }}>{s.unsignedHSFiveStar ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: STAR_COLORS.fourStar }}>{s.unsignedHSFourStar ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: STAR_COLORS.threeStar }}>{s.unsignedHSThreeStar ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: STAR_COLORS.twoStar }}>{s.unsignedHSTwoStar ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: STAR_COLORS.oneStar }}>{s.unsignedHSOneStar ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium border-l" style={{ color: '#a78bfa', borderColor: 'var(--ocean-800)' }}>{s.unsignedTransfer ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: STAR_COLORS.fiveStar }}>{s.unsignedXferFiveStar ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: STAR_COLORS.fourStar }}>{s.unsignedXferFourStar ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: STAR_COLORS.threeStar }}>{s.unsignedXferThreeStar ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: STAR_COLORS.twoStar }}>{s.unsignedXferTwoStar ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums" style={{ color: STAR_COLORS.oneStar }}>{s.unsignedXferOneStar ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Visual breakdown */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {rows.map((r) => {
          const s = r.settings;
          if (!s) return null;
          const total = s.unsignedTotal ?? 0;
          if (total === 0) return null;
          const segments = [
            { label: '5★', count: s.unsignedFiveStar ?? 0, color: STAR_COLORS.fiveStar },
            { label: '4★', count: s.unsignedFourStar ?? 0, color: STAR_COLORS.fourStar },
            { label: '3★', count: s.unsignedThreeStar ?? 0, color: STAR_COLORS.threeStar },
            { label: '2★', count: s.unsignedTwoStar ?? 0, color: STAR_COLORS.twoStar },
            { label: '1★', count: s.unsignedOneStar ?? 0, color: STAR_COLORS.oneStar },
          ];
          return (
            <div
              key={r.year}
              className="rounded-lg border p-4"
              style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-800)' }}
            >
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--ocean-200)' }}>{r.label}</h3>
                <span className="text-xs" style={{ color: 'var(--ocean-400)' }}>{total} unsigned</span>
              </div>
              {/* Stacked bar */}
              <div className="flex h-6 overflow-hidden rounded">
                {segments.map((seg) =>
                  seg.count > 0 ? (
                    <div
                      key={seg.label}
                      className="flex items-center justify-center text-xs font-bold"
                      style={{
                        width: `${(seg.count / total) * 100}%`,
                        background: seg.color,
                        color: '#0a1628',
                        minWidth: seg.count > 0 ? 20 : 0,
                      }}
                    >
                      {seg.count}
                    </div>
                  ) : null,
                )}
              </div>
              <div className="mt-2 flex gap-3 text-xs">
                {segments.map((seg) => (
                  <span key={seg.label} className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: seg.color }} />
                    <span style={{ color: 'var(--ocean-400)' }}>{seg.label}: {seg.count}</span>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-4 text-xs" style={{ color: 'var(--ocean-400)' }}>
                <span>HS: {s.unsignedHS ?? 0}</span>
                <span>Transfer: {s.unsignedTransfer ?? 0}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
