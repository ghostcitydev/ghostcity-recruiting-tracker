'use client';

import { useEffect, useMemo, useState } from 'react';

// ─── Types ────────────────────────────────────────────────

type NilResetResult = { resetCount: number; skippedCount: number };
type TeamPrestige = { name: string; prestige: number; rank: number };
type TeamGrade = { name: string; rank: number; avgGrade: string | null; avgStatic: string | null; avgDerived: string | null };
type PrestigeResult = { changedCount: number; totalTeams: number };
type GradeResult = { mode: string; teamsUpdated: number; fieldsUpdated: number };
type HistoryResult = { teamsZeroed: number; fieldsZeroed: number; coachesZeroed: number; coachFieldsZeroed: number; proTeamsReset: number; proFieldsReset: number };

const GRADE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Aplus', label: 'A+' }, { value: 'A', label: 'A' }, { value: 'Aminus', label: 'A-' },
  { value: 'Bplus', label: 'B+' }, { value: 'B', label: 'B' }, { value: 'Bminus', label: 'B-' },
  { value: 'Cplus', label: 'C+' }, { value: 'C', label: 'C' }, { value: 'Cminus', label: 'C-' },
  { value: 'Dplus', label: 'D+' }, { value: 'D', label: 'D' }, { value: 'Dminus', label: 'D-' },
  { value: 'F', label: 'F' },
];
const GRADE_ORDER_UI = ['F','Dminus','D','Dplus','Cminus','C','Cplus','Bminus','B','Bplus','Aminus','A','Aplus'];
const GRADE_LABEL = (v: string | null) => v ? (GRADE_OPTIONS.find(o => o.value === v)?.label ?? v) : '—';
function gradeRangePreview(mid: string, halfDev: number): string {
  const midTier = GRADE_ORDER_UI.indexOf(mid);
  if (midTier < 0) return '';
  const lo = Math.max(0, midTier - halfDev);
  const hi = Math.min(GRADE_ORDER_UI.length - 1, midTier + halfDev);
  const count = hi - lo + 1;
  return `${GRADE_LABEL(GRADE_ORDER_UI[lo])} – ${GRADE_LABEL(GRADE_ORDER_UI[hi])} (${count} grades)`;
}

// ─── Page ──────────────────────────────────────────────────

export default function ToolboxPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8 space-y-6">
      <h1 style={{ fontFamily: 'Franchise, sans-serif', fontSize: '2rem', color: 'var(--ocean-100)', letterSpacing: '0.02em' }}>
        Toolbox
      </h1>
      <NilResetCard />
      <ProgramSetupCard />
      <RebalanceRostersCard />
    </div>
  );
}

type RebalanceResult = {
  playersEdited: number;
  relevantWrites: number;
  floorWrites: number;
  floorValue: number;
  unknownPositions: string[];
};

function RebalanceRostersCard() {
  const [mode, setMode] = useState<'fixed' | 'tighten'>('fixed');
  const [fixedValue, setFixedValue] = useState(75);
  const [midpoint, setMidpoint] = useState(75);
  const [maxDeviation, setMaxDeviation] = useState(8);
  const [floor, setFloor] = useState(40);

  const [state, setState] = useState<'idle' | 'confirm' | 'running' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<RebalanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setState('running'); setError(null);
    const payload = mode === 'fixed'
      ? { mode, value: fixedValue, floor }
      : { mode, midpoint, maxDeviation, floor };
    try {
      const res = await fetch('/api/toolbox/rebalance-rosters', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Request failed'); setState('error'); }
      else { setResult(data); setState('done'); }
    } catch (e: any) { setError(e?.message ?? 'Network error'); setState('error'); }
  }

  const summary = mode === 'fixed'
    ? `Position-relevant attributes → ${fixedValue}. Irrelevant attributes → ${floor}. OverallRating left alone (game re-derives via archetype formula).`
    : `Position-relevant attributes clamped within ±${maxDeviation} of ${midpoint}. Irrelevant attributes → ${floor}. OverallRating left alone.`;

  return (
    <Card>
      <SectionHeader
        title="Rebalance Rosters"
        description={
          <>
            Adjusts attribute ratings for every rostered player (skips free agents and unsigned recruits). Use in year zero to blunt the snowball effect after resetting history — elite rosters get pulled down, weak rosters get boosted up.
            <br /><br />
            <span style={{ color: 'var(--ocean-300)' }}>How it works:</span> per player, attributes are split into <em>position-relevant</em> (Throw* for QB, Kick* for K, etc. — plus universals like Speed/Awareness for everyone) and <em>irrelevant</em>. Relevant attributes are set to your target; irrelevant attributes are floored (default 40). <Field>OverallRating</Field> is written as a proxy (mean of relevant attributes); the game refines it via its archetype formula on next sim tick.
            <br /><br />
            <span style={{ color: '#f59e0b' }}>Timing matters.</span> The game recomputes team OVR once, between <em>Encourage Transfers</em> and <em>Preseason</em>. <strong>Run this tool before Encourage Transfers</strong> so that recompute uses your rebalanced player OVRs (which it combines with prestige scaling). Direct writes to team OVR fields get clobbered by that recompute — this tool intentionally doesn&apos;t attempt them.
          </>
        }
      />

      <div className="flex gap-2 flex-wrap">
        <ModeChip label="Fixed" active={mode === 'fixed'} onClick={() => setMode('fixed')} />
        <ModeChip label="Tighten toward mean" active={mode === 'tighten'} onClick={() => setMode('tighten')} />
      </div>

      {mode === 'fixed' && (
        <div className="flex items-center gap-3">
          <label className="text-sm" style={{ color: 'var(--ocean-300)' }}>Relevant target (0–99):</label>
          <input type="number" min={0} max={99} value={fixedValue}
            onChange={e => setFixedValue(Math.max(0, Math.min(99, parseInt(e.target.value) || 0)))}
            className="w-20 rounded-md px-2 py-1 text-sm" style={inputStyle} />
        </div>
      )}

      {mode === 'tighten' && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm" style={{ color: 'var(--ocean-300)' }}>Midpoint:</label>
            <input type="number" min={0} max={99} value={midpoint}
              onChange={e => setMidpoint(Math.max(0, Math.min(99, parseInt(e.target.value) || 0)))}
              className="w-20 rounded-md px-2 py-1 text-sm" style={inputStyle} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm" style={{ color: 'var(--ocean-300)' }}>Max deviation ±:</label>
            <input type="number" min={0} max={40} value={maxDeviation}
              onChange={e => setMaxDeviation(Math.max(0, Math.min(40, parseInt(e.target.value) || 0)))}
              className="w-20 rounded-md px-2 py-1 text-sm" style={inputStyle} />
          </div>
          <p className="text-xs" style={{ color: 'var(--ocean-500)' }}>
            Relevant range: [{Math.max(0, midpoint - maxDeviation)}, {Math.min(99, midpoint + maxDeviation)}]
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="text-sm" style={{ color: 'var(--ocean-300)' }}>Irrelevant floor (0–99):</label>
        <input type="number" min={0} max={99} value={floor}
          onChange={e => setFloor(Math.max(0, Math.min(99, parseInt(e.target.value) || 0)))}
          className="w-20 rounded-md px-2 py-1 text-sm" style={inputStyle} />
        <span className="text-xs" style={{ color: 'var(--ocean-500)' }}>
          e.g. Kick Power on a QB → {floor}
        </span>
      </div>

      <p className="text-xs" style={{ color: 'var(--ocean-500)' }}>{summary}</p>

      {state === 'idle' && <PrimaryButton onClick={() => setState('confirm')}>Rebalance Rosters</PrimaryButton>}
      {state === 'confirm' && (
        <ConfirmRow warning={`${summary} This modifies your save file directly and touches thousands of players.`}
          confirmLabel="Confirm — Rebalance" onConfirm={run} onCancel={() => setState('idle')} />
      )}
      {state === 'running' && <RunningText />}
      {state === 'done' && result && (
        <ResultRow color="#4ade80"
          message={`Done — ${result.playersEdited.toLocaleString()} players edited · ${result.relevantWrites.toLocaleString()} relevant writes · ${result.floorWrites.toLocaleString()} floored (→ ${result.floorValue})${result.unknownPositions.length ? ` · unknown positions: ${result.unknownPositions.join(', ')}` : ''}.`}
          onReset={() => { setState('idle'); setResult(null); }} />
      )}
      {state === 'error' && <ErrorRow error={error} onBack={() => { setState('idle'); setError(null); }} />}
    </Card>
  );
}

// ─── NIL Reset (unchanged) ────────────────────────────────

function NilResetCard() {
  const [state, setState] = useState<'idle' | 'confirm' | 'running' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<NilResetResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setState('running');
    setError(null);
    try {
      const res = await fetch('/api/toolbox/nil-reset', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Request failed'); setState('error'); }
      else { setResult(data); setState('done'); }
    } catch (e: any) { setError(e?.message ?? 'Network error'); setState('error'); }
  }

  return (
    <Card>
      <SectionHeader
        title="Zero NIL Demands"
        description={<>Sets <Field>BaseNILValue</Field> to 0 for all unsigned recruits. Run before recruiting season begins.</>}
      />
      {state === 'idle' && <PrimaryButton onClick={() => setState('confirm')}>Zero NIL Demands</PrimaryButton>}
      {state === 'confirm' && (
        <ConfirmRow
          warning="This will modify your save file directly. Proceed only if you're in pre-season."
          confirmLabel="Confirm — Zero All NIL Demands"
          onConfirm={run}
          onCancel={() => setState('idle')}
        />
      )}
      {state === 'running' && <RunningText />}
      {state === 'done' && result && (
        <ResultRow
          color="#4ade80"
          message={`Done — ${result.resetCount.toLocaleString()} recruits zeroed, ${result.skippedCount.toLocaleString()} already signed skipped.`}
          onReset={() => { setState('idle'); setResult(null); }}
        />
      )}
      {state === 'error' && <ErrorRow error={error} onBack={() => { setState('idle'); setError(null); }} />}
    </Card>
  );
}

// ─── Program Setup (combined) ─────────────────────────────

type Tab = 'grades' | 'prestige' | 'history';

function ProgramSetupCard() {
  const [tab, setTab] = useState<Tab>('grades');
  return (
    <Card>
      <SectionHeader
        title="Program Setup"
        description={
          <>
            Edit team fundamentals. <Field>School Grades</Field> is the primary lever — it composes into <Field>TeamPrestige</Field>, so changes stick across sim ticks. Use History to wipe legacy inputs first if you want a clean slate.
          </>
        }
      />
      <div className="flex gap-1" style={{ borderBottom: '1px solid var(--ocean-800)' }}>
        <TabButton active={tab === 'grades'} onClick={() => setTab('grades')}>School Grades</TabButton>
        <TabButton active={tab === 'prestige'} onClick={() => setTab('prestige')}>Prestige (direct)</TabButton>
        <TabButton active={tab === 'history'} onClick={() => setTab('history')}>History</TabButton>
      </div>
      {tab === 'grades' && <GradesPanel />}
      {tab === 'prestige' && <PrestigePanel />}
      {tab === 'history' && <HistoryPanel />}
    </Card>
  );
}

// ─── Grades Panel ─────────────────────────────────────────

type StaticMode = 'fixed' | 'tighten' | 'custom' | 'preserve' | 'defaults';
type DerivedMode = 'fixed' | 'tighten' | 'preserve' | 'defaults';

function GradesPanel() {
  const [teams, setTeams] = useState<TeamGrade[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Static group (Academic, Campus)
  const [staticMode, setStaticMode] = useState<StaticMode>('fixed');
  const [staticFixed, setStaticFixed] = useState('Cplus');
  const [staticMid, setStaticMid] = useState('Cplus');
  const [staticDev, setStaticDev] = useState(2); // ±tiers from midpoint (e.g. 2 = 5-grade band)
  const [staticCustom, setStaticCustom] = useState<Record<string, string>>({});

  // Derived group (8 fields sim recomputes)
  const [derivedMode, setDerivedMode] = useState<DerivedMode>('tighten');
  const [derivedFixed, setDerivedFixed] = useState('Cplus');
  const [derivedMid, setDerivedMid] = useState('Cplus');
  const [derivedDev, setDerivedDev] = useState(2); // ±tiers from midpoint

  const [state, setState] = useState<'idle' | 'confirm' | 'running' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  async function loadTeams() {
    setLoading(true); setLoadError(null);
    try {
      const res = await fetch('/api/toolbox/school-grades');
      const data = await res.json();
      if (!res.ok) setLoadError(data.error ?? 'Failed to load');
      else {
        setTeams(data.teams);
        const init: Record<string, string> = {};
        for (const t of data.teams as TeamGrade[]) init[t.name] = t.avgStatic ?? 'Cplus';
        setStaticCustom(init);
      }
    } catch (e: any) { setLoadError(e?.message ?? 'Network error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadTeams(); }, []);

  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    const f = filter.trim().toLowerCase();
    return f ? teams.filter(t => t.name.toLowerCase().includes(f)) : teams;
  }, [teams, filter]);

  function buildStaticOp() {
    if (staticMode === 'preserve') return null;
    if (staticMode === 'fixed') return { op: 'fixed', grade: staticFixed };
    if (staticMode === 'tighten') return { op: 'tighten', midGrade: staticMid, maxTierDeviation: staticDev };
    if (staticMode === 'defaults') return { op: 'defaults' };
    return { op: 'custom', values: staticCustom };
  }
  function buildDerivedOp() {
    if (derivedMode === 'preserve') return null;
    if (derivedMode === 'fixed') return { op: 'fixed', grade: derivedFixed };
    if (derivedMode === 'defaults') return { op: 'defaults' };
    return { op: 'tighten', midGrade: derivedMid, maxTierDeviation: derivedDev };
  }

  async function run() {
    setState('running'); setError(null);
    const payload = { static: buildStaticOp(), derived: buildDerivedOp() };
    try {
      const res = await fetch('/api/toolbox/school-grades', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Request failed'); setState('error'); }
      else { setResult(data); setState('done'); await loadTeams(); }
    } catch (e: any) { setError(e?.message ?? 'Network error'); setState('error'); }
  }

  const staticSummary = staticMode === 'preserve' ? 'leave unchanged'
    : staticMode === 'fixed' ? `set to ${GRADE_LABEL(staticFixed)}`
    : staticMode === 'tighten' ? `clamp to ${gradeRangePreview(staticMid, staticDev)} around ${GRADE_LABEL(staticMid)}`
    : staticMode === 'defaults' ? 'reset each school to year-zero game defaults'
    : `apply ${Object.keys(staticCustom).length} per-school values`;
  const derivedSummary = derivedMode === 'preserve' ? 'leave unchanged (sim will recompute anyway)'
    : derivedMode === 'fixed' ? `set to ${GRADE_LABEL(derivedFixed)} (sim may re-derive on next tick)`
    : derivedMode === 'defaults' ? 'reset each school to year-zero game defaults (sim may re-derive on next tick)'
    : `clamp to ${gradeRangePreview(derivedMid, derivedDev)} around ${GRADE_LABEL(derivedMid)}`;

  return (
    <PanelBody>
      <p className="text-sm" style={{ color: 'var(--ocean-400)' }}>
        Writes <Field>MySchoolTrackingTable</Field> grades. Split into two groups because only the static ones truly stick.
        <br />
        <span style={{ color: '#f59e0b' }}>Run in pre-season only</span> — same as <Field>Rebalance Rosters</Field>.
      </p>

      {/* Static group */}
      <div className="rounded-md p-3 space-y-3" style={{ border: '1px solid var(--ocean-800)', background: 'rgba(13,31,60,0.4)' }}>
        <div>
          <div className="text-sm font-semibold" style={{ color: 'var(--ocean-100)' }}>Static grades</div>
          <div className="text-xs" style={{ color: 'var(--ocean-500)' }}>Academic Prestige · Campus Lifestyle — sim never touches these</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ModeChip label="Fixed" active={staticMode === 'fixed'} onClick={() => setStaticMode('fixed')} />
          <ModeChip label="Tighten" active={staticMode === 'tighten'} onClick={() => setStaticMode('tighten')} />
          <ModeChip label="Custom per school" active={staticMode === 'custom'} onClick={() => setStaticMode('custom')} />
          <ModeChip label="Preserve" active={staticMode === 'preserve'} onClick={() => setStaticMode('preserve')} />
          <ModeChip label="↺ Reset to defaults" active={staticMode === 'defaults'} onClick={() => setStaticMode('defaults')} />
        </div>
        {staticMode === 'fixed' && (
          <div className="flex items-center gap-3">
            <label className="text-sm" style={{ color: 'var(--ocean-300)' }}>Grade:</label>
            <GradeSelect value={staticFixed} onChange={setStaticFixed} />
          </div>
        )}
        {staticMode === 'tighten' && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm" style={{ color: 'var(--ocean-300)' }}>Midpoint:</label>
              <GradeSelect value={staticMid} onChange={setStaticMid} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm" style={{ color: 'var(--ocean-300)' }}>±tiers from midpoint:</label>
              <input type="number" min={0} max={12} value={staticDev}
                onChange={e => setStaticDev(Math.max(0, Math.min(12, parseInt(e.target.value) || 0)))}
                className="w-16 rounded-md px-2 py-1 text-sm" style={inputStyle} />
            </div>
            <span className="text-xs" style={{ color: 'var(--ocean-500)' }}>
              Range: {gradeRangePreview(staticMid, staticDev)}
            </span>
          </div>
        )}
        {staticMode === 'custom' && (
          <CustomTeamTable
            filter={filter} setFilter={setFilter} loading={loading} loadError={loadError}
            rows={filteredTeams.map(t => ({ name: t.name, rank: t.rank, current: GRADE_LABEL(t.avgStatic) }))}
            renderInput={(name) => (
              <GradeSelect
                value={staticCustom[name] ?? 'Cplus'}
                onChange={v => setStaticCustom(prev => ({ ...prev, [name]: v }))}
              />
            )}
            currentHeader="Avg static grade"
          />
        )}
      </div>

      {/* Derived group */}
      <div className="rounded-md p-3 space-y-3" style={{ border: '1px solid var(--ocean-800)', background: 'rgba(13,31,60,0.4)' }}>
        <div>
          <div className="text-sm font-semibold" style={{ color: 'var(--ocean-100)' }}>Derived grades</div>
          <div className="text-xs" style={{ color: 'var(--ocean-500)' }}>
            Athletic Facilities · Brand · Championship Contender · Coach Prestige · Coach Stability · Conference · Program Tradition · Stadium Atmosphere
            — sim recomputes each tick from historical/current inputs
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ModeChip label="Fixed" active={derivedMode === 'fixed'} onClick={() => setDerivedMode('fixed')} />
          <ModeChip label="Tighten (based on existing)" active={derivedMode === 'tighten'} onClick={() => setDerivedMode('tighten')} />
          <ModeChip label="Preserve as-is" active={derivedMode === 'preserve'} onClick={() => setDerivedMode('preserve')} />
          <ModeChip label="↺ Reset to defaults" active={derivedMode === 'defaults'} onClick={() => setDerivedMode('defaults')} />
        </div>
        {derivedMode === 'fixed' && (
          <div className="flex items-center gap-3">
            <label className="text-sm" style={{ color: 'var(--ocean-300)' }}>Grade:</label>
            <GradeSelect value={derivedFixed} onChange={setDerivedFixed} />
          </div>
        )}
        {derivedMode === 'tighten' && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm" style={{ color: 'var(--ocean-300)' }}>Midpoint:</label>
              <GradeSelect value={derivedMid} onChange={setDerivedMid} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm" style={{ color: 'var(--ocean-300)' }}>±tiers from midpoint:</label>
              <input type="number" min={0} max={12} value={derivedDev}
                onChange={e => setDerivedDev(Math.max(0, Math.min(12, parseInt(e.target.value) || 0)))}
                className="w-16 rounded-md px-2 py-1 text-sm" style={inputStyle} />
            </div>
            <span className="text-xs" style={{ color: 'var(--ocean-500)' }}>
              Range: {gradeRangePreview(derivedMid, derivedDev)}
            </span>
          </div>
        )}
      </div>

      <p className="text-xs" style={{ color: 'var(--ocean-500)' }}>
        Static: {staticSummary}. Derived: {derivedSummary}.
      </p>

      {state === 'idle' && <PrimaryButton onClick={() => setState('confirm')}>Apply Grades</PrimaryButton>}
      {state === 'confirm' && (
        <ConfirmRow warning={`Static: ${staticSummary}. Derived: ${derivedSummary}. This modifies your save file directly.`}
          confirmLabel="Confirm — Apply Grades" onConfirm={run} onCancel={() => setState('idle')} />
      )}
      {state === 'running' && <RunningText />}
      {state === 'done' && result && (
        <ResultRow color="#4ade80"
          message={`Done — ${result.teamsUpdated.toLocaleString()} teams updated, ${result.fieldsUpdated.toLocaleString()} grade fields written.`}
          onReset={() => { setState('idle'); setResult(null); }} />
      )}
      {state === 'error' && <ErrorRow error={error} onBack={() => { setState('idle'); setError(null); }} />}
    </PanelBody>
  );
}

// ─── Prestige Panel (relocated) ───────────────────────────

function PrestigePanel() {
  const [teams, setTeams] = useState<TeamPrestige[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<'fixed' | 'tighten' | 'custom'>('fixed');
  const [fixedValue, setFixedValue] = useState(5);
  const [midpoint, setMidpoint] = useState(5);
  const [maxDeviation, setMaxDeviation] = useState(2);
  const [customValues, setCustomValues] = useState<Record<string, number>>({});

  const [state, setState] = useState<'idle' | 'confirm' | 'running' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<PrestigeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  async function loadTeams() {
    setLoading(true); setLoadError(null);
    try {
      const res = await fetch('/api/toolbox/prestige');
      const data = await res.json();
      if (!res.ok) setLoadError(data.error ?? 'Failed to load');
      else {
        setTeams(data.teams);
        const init: Record<string, number> = {};
        for (const t of data.teams as TeamPrestige[]) init[t.name] = t.prestige;
        setCustomValues(init);
      }
    } catch (e: any) { setLoadError(e?.message ?? 'Network error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadTeams(); }, []);

  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    const f = filter.trim().toLowerCase();
    return f ? teams.filter(t => t.name.toLowerCase().includes(f)) : teams;
  }, [teams, filter]);

  async function run() {
    setState('running'); setError(null);
    const payload = mode === 'fixed' ? { mode, value: fixedValue }
      : mode === 'tighten' ? { mode, midpoint, maxDeviation }
      : { mode, values: customValues };
    try {
      const res = await fetch('/api/toolbox/prestige', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Request failed'); setState('error'); }
      else { setResult(data); setState('done'); await loadTeams(); }
    } catch (e: any) { setError(e?.message ?? 'Network error'); setState('error'); }
  }

  const summary = mode === 'fixed' ? `Set every FBS team's prestige to ${fixedValue}.`
    : mode === 'tighten' ? `Clamp every prestige within ±${maxDeviation} of ${midpoint}.`
    : `Apply ${Object.keys(customValues).length} custom prestige values.`;

  return (
    <PanelBody>
      <p className="text-sm" style={{ color: 'var(--ocean-400)' }}>
        Direct edit of <Field>TeamPrestige</Field> (0–10) and recomputed <Field>PrestigeRank</Field>. Prestige gets recomputed from school grades each sim tick, so this typically doesn't stick — use School Grades for lasting changes.
      </p>

      <div className="flex gap-2 flex-wrap">
        <ModeChip label="Fixed" active={mode === 'fixed'} onClick={() => setMode('fixed')} />
        <ModeChip label="Tighten" active={mode === 'tighten'} onClick={() => setMode('tighten')} />
        <ModeChip label="Custom per school" active={mode === 'custom'} onClick={() => setMode('custom')} />
      </div>

      {mode === 'fixed' && (
        <div className="flex items-center gap-3">
          <label className="text-sm" style={{ color: 'var(--ocean-300)' }}>Prestige (0–10):</label>
          <input type="number" min={0} max={10} value={fixedValue}
            onChange={e => setFixedValue(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
            className="w-20 rounded-md px-2 py-1 text-sm" style={inputStyle} />
        </div>
      )}

      {mode === 'tighten' && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm" style={{ color: 'var(--ocean-300)' }}>Midpoint:</label>
            <input type="number" min={0} max={10} value={midpoint}
              onChange={e => setMidpoint(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
              className="w-20 rounded-md px-2 py-1 text-sm" style={inputStyle} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm" style={{ color: 'var(--ocean-300)' }}>Max deviation ±:</label>
            <input type="number" min={0} max={10} value={maxDeviation}
              onChange={e => setMaxDeviation(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
              className="w-20 rounded-md px-2 py-1 text-sm" style={inputStyle} />
          </div>
        </div>
      )}

      {mode === 'custom' && (
        <CustomTeamTable
          filter={filter} setFilter={setFilter} loading={loading} loadError={loadError}
          rows={filteredTeams.map(t => ({ name: t.name, rank: t.rank, current: String(t.prestige) }))}
          renderInput={(name) => (
            <input type="number" min={0} max={10}
              value={customValues[name] ?? 0}
              onChange={e => {
                const v = Math.max(0, Math.min(10, parseInt(e.target.value) || 0));
                setCustomValues(prev => ({ ...prev, [name]: v }));
              }}
              className="w-16 rounded px-2 py-0.5 text-sm" style={inputStyle} />
          )}
          currentHeader="Prestige"
        />
      )}

      <p className="text-xs" style={{ color: 'var(--ocean-500)' }}>{summary}</p>

      {state === 'idle' && <PrimaryButton onClick={() => setState('confirm')}>Apply Prestige</PrimaryButton>}
      {state === 'confirm' && (
        <ConfirmRow warning={`${summary} This modifies your save file directly.`}
          confirmLabel="Confirm — Apply Prestige" onConfirm={run} onCancel={() => setState('idle')} />
      )}
      {state === 'running' && <RunningText />}
      {state === 'done' && result && (
        <ResultRow color="#4ade80"
          message={`Done — ${result.changedCount.toLocaleString()} of ${result.totalTeams.toLocaleString()} teams updated.`}
          onReset={() => { setState('idle'); setResult(null); }} />
      )}
      {state === 'error' && <ErrorRow error={error} onBack={() => { setState('idle'); setError(null); }} />}
    </PanelBody>
  );
}

// ─── History Panel ────────────────────────────────────────

function HistoryPanel() {
  const [state, setState] = useState<'idle' | 'confirm' | 'running' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<HistoryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setState('running'); setError(null);
    try {
      const res = await fetch('/api/toolbox/history-reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Request failed'); setState('error'); }
      else { setResult(data); setState('done'); }
    } catch (e: any) { setError(e?.message ?? 'Network error'); setState('error'); }
  }

  return (
    <PanelBody>
      <p className="text-sm" style={{ color: 'var(--ocean-400)' }}>
        Zero every field in <Field>TeamHistoricalData</Field> and <Field>CareerCoachStats</Field> for every FBS team — wins, losses, championships, bowls, recruiting classes, accolades, drafted-player counts, coach career records. Also resets all 10 <Field>ProPotentialGrade</Field> position grades to C+ so every school starts on equal footing. Removes the historical anchor so future prestige/rank/coach-prestige/pro-potential calcs start from a clean slate.
      </p>
      <p className="text-xs" style={{ color: 'var(--ocean-500)' }}>
        Best combined with a School Grades reset — flatten history first, then set your target grade.
      </p>

      {state === 'idle' && <PrimaryButton onClick={() => setState('confirm')}>Nuke History</PrimaryButton>}
      {state === 'confirm' && (
        <ConfirmRow
          warning="Zero ALL historical fields for every FBS team. This modifies your save file directly."
          confirmLabel="Confirm — Nuke All History"
          onConfirm={run} onCancel={() => setState('idle')} />
      )}
      {state === 'running' && <RunningText />}
      {state === 'done' && result && (
        <ResultRow color="#4ade80"
          message={`Done — teams: ${result.teamsZeroed.toLocaleString()} rows / ${result.fieldsZeroed.toLocaleString()} fields · coaches: ${result.coachesZeroed.toLocaleString()} rows / ${result.coachFieldsZeroed.toLocaleString()} fields · pro potential: ${result.proTeamsReset.toLocaleString()} teams / ${result.proFieldsReset.toLocaleString()} fields.`}
          onReset={() => { setState('idle'); setResult(null); }} />
      )}
      {state === 'error' && <ErrorRow error={error} onBack={() => { setState('idle'); setError(null); }} />}
    </PanelBody>
  );
}

// ─── Shared components ────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: 'var(--ocean-950)', border: '1px solid var(--ocean-800)', color: 'var(--ocean-100)',
};

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-6 space-y-4" style={{ background: 'var(--ocean-900)', border: '1px solid var(--ocean-800)' }}>
      {children}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ocean-100)' }}>{title}</h2>
      <p className="mt-1 text-sm" style={{ color: 'var(--ocean-400)' }}>{description}</p>
    </div>
  );
}

function Field({ children }: { children: React.ReactNode }) {
  return <span style={{ color: '#f59e0b', fontFamily: 'inherit', fontWeight: 600 }}>{children}</span>;
}

function PanelBody({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4 pt-3">{children}</div>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 text-sm font-medium"
      style={{
        color: active ? 'var(--ocean-100)' : 'var(--ocean-400)',
        borderBottom: active ? '2px solid #f59e0b' : '2px solid transparent',
        marginBottom: '-1px',
      }}
    >
      {children}
    </button>
  );
}

function ModeChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md px-3 py-1.5 text-sm font-medium"
      style={{ background: active ? 'var(--ocean-700)' : 'var(--ocean-800)', color: active ? 'var(--ocean-100)' : 'var(--ocean-300)' }}
    >
      {label}
    </button>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="rounded-md px-4 py-2 text-sm font-medium"
      style={{ background: 'var(--ocean-700)', color: 'var(--ocean-100)' }}>
      {children}
    </button>
  );
}

function ConfirmRow({ warning, confirmLabel, onConfirm, onCancel }: {
  warning: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium" style={{ color: '#f59e0b' }}>{warning}</p>
      <div className="flex gap-3">
        <button onClick={onConfirm} className="rounded-md px-4 py-2 text-sm font-medium" style={{ background: '#dc2626', color: '#fff' }}>
          {confirmLabel}
        </button>
        <button onClick={onCancel} className="rounded-md px-4 py-2 text-sm font-medium" style={{ background: 'var(--ocean-800)', color: 'var(--ocean-300)' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function RunningText() {
  return <p className="text-sm" style={{ color: 'var(--ocean-400)' }}>Processing save file…</p>;
}

function ResultRow({ color, message, onReset }: { color: string; message: string; onReset: () => void }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium" style={{ color }}>{message}</p>
      <button onClick={onReset} className="rounded-md px-3 py-1.5 text-sm" style={{ background: 'var(--ocean-800)', color: 'var(--ocean-300)' }}>
        Reset
      </button>
    </div>
  );
}

function ErrorRow({ error, onBack }: { error: string | null; onBack: () => void }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium" style={{ color: '#f87171' }}>Error: {error}</p>
      <button onClick={onBack} className="rounded-md px-3 py-1.5 text-sm" style={{ background: 'var(--ocean-800)', color: 'var(--ocean-300)' }}>
        Back
      </button>
    </div>
  );
}

function GradeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="rounded-md px-2 py-0.5 text-sm" style={inputStyle}>
      {GRADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function CustomTeamTable({
  filter, setFilter, loading, loadError, rows, renderInput, currentHeader,
}: {
  filter: string; setFilter: (v: string) => void;
  loading: boolean; loadError: string | null;
  rows: { name: string; rank: number; current: string }[];
  renderInput: (name: string) => React.ReactNode;
  currentHeader: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input type="text" placeholder="Filter teams…"
          value={filter} onChange={e => setFilter(e.target.value)}
          className="w-64 rounded-md px-3 py-1.5 text-sm" style={inputStyle} />
        {loading && <span className="text-xs" style={{ color: 'var(--ocean-500)' }}>Loading…</span>}
        {loadError && <span className="text-xs" style={{ color: '#f87171' }}>{loadError}</span>}
      </div>
      <div className="max-h-96 overflow-y-auto rounded-md" style={{ border: '1px solid var(--ocean-800)' }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0" style={{ background: 'var(--ocean-950)' }}>
            <tr>
              <th className="px-3 py-2 text-left" style={{ color: 'var(--ocean-400)' }}>Rank</th>
              <th className="px-3 py-2 text-left" style={{ color: 'var(--ocean-400)' }}>Team</th>
              <th className="px-3 py-2 text-left" style={{ color: 'var(--ocean-400)' }}>{currentHeader}</th>
              <th className="px-3 py-2 text-left" style={{ color: 'var(--ocean-400)' }}>New</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.name} style={{ borderTop: '1px solid var(--ocean-800)' }}>
                <td className="px-3 py-1.5" style={{ color: 'var(--ocean-500)' }}>{r.rank}</td>
                <td className="px-3 py-1.5" style={{ color: 'var(--ocean-100)' }}>{r.name}</td>
                <td className="px-3 py-1.5" style={{ color: 'var(--ocean-400)' }}>{r.current}</td>
                <td className="px-3 py-1.5">{renderInput(r.name)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
