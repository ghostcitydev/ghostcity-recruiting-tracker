'use client';

import { useEffect, useRef, useState } from 'react';

// ── Constants ───────────────────────────────────────────────

const LS_NSD = 'gc_mod_nsd';
const LS_TW  = 'gc_mod_tw';
const LS_RB  = 'gc_mod_rb';
const LS_PIPELINE = 'gc_mod_pipeline';
const LS_FANG = 'gc_mod_fang';

// NSD position keys (PocketScout)
const NSD_POSITIONS = ['QB','HB','FB','WR','TE','LT','LG','C','RG','RT','EDGE','DT','LB','CB','S','K','P'] as const;
type NsdPos = typeof NSD_POSITIONS[number];

const NSD_PREFERRED_DEFAULTS: Record<NsdPos, number> = {
  QB:4, HB:5, FB:2, WR:8, TE:5, LT:4, LG:4, C:4, RG:4, RT:4, EDGE:7, DT:6, LB:8, CB:8, S:6, K:1, P:1,
};
const NSD_HARD_MAX_DEFAULTS: Record<NsdPos, number> = {
  QB:5, HB:7, FB:3, WR:11, TE:7, LT:6, LG:6, C:5, RG:6, RT:6, EDGE:9, DT:8, LB:10, CB:11, S:8, K:2, P:2,
};

// Transfer Wave check groups (must match redistribution.js CHECKS exactly)
const TW_CHECKS = ['QB','HB','FB','WR','TE','OT','Guards','C','DE','DT','LOLB','MLB','ROLB','CB','FS','SS','K','P'] as const;
type TwCheck = typeof TW_CHECKS[number];

const TW_CHECK_LABELS: Record<TwCheck, string> = {
  QB:'QB', HB:'HB', FB:'FB', WR:'WR', TE:'TE',
  OT:'OT (LT+RT)', Guards:'Guards (LG+RG)', C:'C',
  DE:'DE (LE+RE)', DT:'DT',
  LOLB:'LOLB', MLB:'MLB', ROLB:'ROLB',
  CB:'CB', FS:'FS', SS:'SS', K:'K', P:'P',
};

// Defaults from redistribution.js CHECKS
const TW_MIN_DEFAULTS: Record<TwCheck, number> = {
  QB:2, HB:4, FB:1, WR:7, TE:3, OT:5, Guards:5, C:1, DE:5, DT:3, LOLB:3, MLB:3, ROLB:3, CB:5, FS:2, SS:2, K:1, P:1,
};
const TW_MAX_DEFAULTS: Record<TwCheck, number> = {
  QB:3, HB:6, FB:2, WR:8, TE:5, OT:6, Guards:6, C:2, DE:6, DT:4, LOLB:3, MLB:4, ROLB:3, CB:6, FS:3, SS:3, K:2, P:2,
};
// Defaults from redistribution.js DEFAULT_SEVERE_THRESHOLDS
const TW_SEVERE_DEFAULTS: Record<TwCheck, number> = {
  QB:2, HB:2, FB:0, WR:2, TE:2, OT:2, Guards:2, C:2, DE:2, DT:2, LOLB:2, MLB:2, ROLB:2, CB:2, FS:2, SS:2, K:0, P:0,
};

// ── Types ───────────────────────────────────────────────────

type NsdSettings = {
  enabled: boolean;
  signingLimit: number;
  finalRosterLimit: number;
  classTarget: number;
  preferredByPos: Record<NsdPos, number>;
  hardMaxByPos: Record<NsdPos, number>;
  showAdvanced: boolean;
};

type TwCheckOverride = { min: number; max: number };
type TwSettings = {
  enabled: boolean;
  thresholdOverrides: Record<TwCheck, TwCheckOverride>;
  severeThresholdOverrides: Record<TwCheck, number>;
  enableTier2: boolean;
  prestigeGapCap: number;
  allowTopTwoException: boolean;
  zeroNil: boolean;
  showPositions: boolean;
  showSevere: boolean;
};
type PipelineSettings = {
  enabled: boolean; preset: 'rosterDriven'|'blueChipFocused'|'coachLegacy'|'grounded'|'custom';
  wRoster: number; wStar: number; wCoach: number; wGeo: number; decay: number; geoRadius: number; maxPipelines: number;
  coachRampMode: 'ramp'|'full'; coachRampSeasons: number; coachInclude: { HeadCoach: boolean; OffensiveCoordinator: boolean; DefensiveCoordinator: boolean };
  academyMode: boolean; academyTargetCount: number; academyUniform: boolean; academyUniformTier: string; academyExempt: boolean;
  showAdvanced: boolean;
};
type FangSettings = { enabled: boolean; fileName: string; config: Record<string, unknown> | null };
const PIPELINE_DEFAULTS: PipelineSettings = { enabled:false, preset:'rosterDriven', wRoster:.35,wStar:.35,wCoach:.2,wGeo:.1,decay:.75,geoRadius:300,maxPipelines:10,coachRampMode:'ramp',coachRampSeasons:3,coachInclude:{HeadCoach:true,OffensiveCoordinator:true,DefensiveCoordinator:true},academyMode:false,academyTargetCount:42,academyUniform:true,academyUniformTier:'Respected',academyExempt:true,showAdvanced:false };

const NSD_DEFAULTS: NsdSettings = {
  enabled: false,
  signingLimit: 35,
  finalRosterLimit: 95,
  classTarget: 25,
  preferredByPos: { ...NSD_PREFERRED_DEFAULTS },
  hardMaxByPos: { ...NSD_HARD_MAX_DEFAULTS },
  showAdvanced: false,
};

function makeTwDefaults(): TwSettings {
  const thresholdOverrides = {} as Record<TwCheck, TwCheckOverride>;
  const severeThresholdOverrides = {} as Record<TwCheck, number>;
  for (const k of TW_CHECKS) {
    thresholdOverrides[k] = { min: TW_MIN_DEFAULTS[k], max: TW_MAX_DEFAULTS[k] };
    severeThresholdOverrides[k] = TW_SEVERE_DEFAULTS[k];
  }
  return { enabled: false, thresholdOverrides, severeThresholdOverrides, enableTier2: true, prestigeGapCap: 3, allowTopTwoException: true, zeroNil: true, showPositions: false, showSevere: false };
}

// ── localStorage helpers ────────────────────────────────────

function loadNsd(): NsdSettings {
  try {
    const s = JSON.parse(localStorage.getItem(LS_NSD) ?? '{}');
    return {
      ...NSD_DEFAULTS,
      ...s,
      preferredByPos: { ...NSD_PREFERRED_DEFAULTS, ...(s.preferredByPos ?? {}) },
      hardMaxByPos: { ...NSD_HARD_MAX_DEFAULTS, ...(s.hardMaxByPos ?? {}) },
    };
  } catch { return { ...NSD_DEFAULTS, preferredByPos: { ...NSD_PREFERRED_DEFAULTS }, hardMaxByPos: { ...NSD_HARD_MAX_DEFAULTS } }; }
}

function loadTw(): TwSettings {
  try {
    const defaults = makeTwDefaults();
    const raw = localStorage.getItem(LS_TW);
    if (!raw) return defaults;
    const s = JSON.parse(raw);
    // If stored data is in old format (has thresholdByPos), discard and use defaults
    if (s.thresholdByPos) { localStorage.removeItem(LS_TW); return defaults; }
    const thresholdOverrides = { ...defaults.thresholdOverrides };
    const severeThresholdOverrides = { ...defaults.severeThresholdOverrides };
    if (s.thresholdOverrides) {
      for (const k of TW_CHECKS) {
        if (s.thresholdOverrides[k]) thresholdOverrides[k] = { min: s.thresholdOverrides[k].min ?? TW_MIN_DEFAULTS[k], max: s.thresholdOverrides[k].max ?? TW_MAX_DEFAULTS[k] };
      }
    }
    if (s.severeThresholdOverrides) {
      for (const k of TW_CHECKS) {
        if (s.severeThresholdOverrides[k] != null) severeThresholdOverrides[k] = s.severeThresholdOverrides[k];
      }
    }
    return { ...defaults, ...s, thresholdOverrides, severeThresholdOverrides };
  } catch { return makeTwDefaults(); }
}

function saveNsd(s: NsdSettings) { localStorage.setItem(LS_NSD, JSON.stringify(s)); }
function saveTw(s: TwSettings)   { localStorage.setItem(LS_TW,  JSON.stringify(s)); }
function loadPipeline(): PipelineSettings { try { const s=JSON.parse(localStorage.getItem(LS_PIPELINE) ?? '{}'); return { ...PIPELINE_DEFAULTS, ...s, coachInclude:{...PIPELINE_DEFAULTS.coachInclude,...(s.coachInclude??{})} }; } catch { return PIPELINE_DEFAULTS; } }
function savePipeline(s: PipelineSettings) { localStorage.setItem(LS_PIPELINE, JSON.stringify(s)); }
function loadFang(): FangSettings { try { const s = JSON.parse(localStorage.getItem(LS_FANG) ?? '{}'); return { enabled: Boolean(s.enabled), fileName: String(s.fileName ?? ''), config: s.config && typeof s.config === 'object' ? s.config : null }; } catch { return { enabled: false, fileName: '', config: null }; } }
function saveFang(s: FangSettings) { localStorage.setItem(LS_FANG, JSON.stringify(s)); }

// ── Page ───────────────────────────────────────────────────

export default function ToolboxPage() {
  return (
    <div className="mx-auto max-w-[860px] px-6 py-8 space-y-4">
      <div>
        <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ocean-100)' }}>Mods</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--ocean-400)' }}>
          Enable mods and configure their settings here. Active mods run automatically during import on the{' '}
          <strong style={{ color: 'var(--ocean-300)' }}>Import</strong> page — no separate run step needed.
        </p>
      </div>
      <NsdModCard />
      <FangModCard />
      <TwModCard />
      <RbModCard />
      <PipelineModCard />
    </div>
  );
}

function FangModCard() {
  const [s, setS] = useState<FangSettings>({ enabled: false, fileName: '', config: null });
  const [mounted, setMounted] = useState(false);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { setS(loadFang()); setMounted(true); }, []);
  if (!mounted) return <ModCardSkeleton />;
  const update = (patch: Partial<FangSettings>) => { const next = { ...s, ...patch }; setS(next); saveFang(next); };
  const chooseFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const config = JSON.parse(String(reader.result));
        if (config?.schema !== 'recruit-overhaul-27-settings-config') throw new Error('That is not an RO27 settings export.');
        setFileError(''); update({ config, fileName: file.name });
      } catch (error) { setFileError(error instanceof Error ? error.message : 'Could not read JSON settings.'); }
    };
    reader.readAsText(file);
  };
  return <ModCard enabled={s.enabled} onToggle={(enabled) => update({ enabled })} title="Fang's Recruiting Generator" author="Fang / RO27 Official V3.4" snapshot="preseason" description="Regenerates preseason recruits using Fang's selected settings profile. It runs first, then Transfer Wave, Rebalance, Pipelines, and the Ghost City import." warning="Exit the dynasty to the main menu before running; the game can remain open. A fresh RLT Backup is created before changes.">
    <Section label="Settings JSON">
      <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={(event) => chooseFile(event.target.files?.[0])} className="hidden" />
      <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded px-3 py-1.5 text-xs font-semibold" style={{ background: 'var(--ocean-700)', color: 'var(--ocean-100)', border: '1px solid var(--ocean-600)', cursor: 'pointer' }}>Browse…</button>
      <p className="mt-2 text-xs" style={{ color: s.config ? '#4ade80' : 'var(--ocean-500)' }}>{s.config ? `✓ ${s.fileName} loaded` : 'Choose a Fang/RO27 settings export. The supplied Default.ro27-settings.json works here.'}</p>
      {fileError && <p className="mt-1 text-xs" style={{ color: '#f87171' }}>{fileError}</p>}
    </Section>
  </ModCard>;
}

// ── NSD: Assign Unsigned Players ──────────────────────────

function NsdModCard() {
  const [s, setS] = useState<NsdSettings>({ ...NSD_DEFAULTS, preferredByPos: { ...NSD_PREFERRED_DEFAULTS }, hardMaxByPos: { ...NSD_HARD_MAX_DEFAULTS } });
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setS(loadNsd()); setMounted(true); }, []);

  if (!mounted) return <ModCardSkeleton />;

  function update(patch: Partial<NsdSettings>) {
    const next = { ...s, ...patch };
    setS(next);
    saveNsd(next);
  }

  function updatePreferred(pos: NsdPos, val: number) {
    const next = { ...s, preferredByPos: { ...s.preferredByPos, [pos]: val } };
    setS(next); saveNsd(next);
  }

  function updateHardMax(pos: NsdPos, val: number) {
    const next = { ...s, hardMaxByPos: { ...s.hardMaxByPos, [pos]: val } };
    setS(next); saveNsd(next);
  }

  return (
    <ModCard
      enabled={s.enabled}
      onToggle={(v) => update({ enabled: v })}
      title="NSD: Assign Unsigned Players"
      author="PocketScout Utilities"
      snapshot="signing_day"
      description="On National Signing Day, assigns unsigned recruits to FBS schools that need depth by position. Runs before the Signing Day import — the modified save is reimported automatically."
      warning="Run once per NSD — running twice can create duplicate players. Exit the dynasty to the main menu before running; the game can remain open."
    >
      <Section label="Global Limits">
        <div className="grid grid-cols-3 gap-3">
          <NumberField
            label="Max signings / team"
            description="Default 35"
            value={s.signingLimit}
            min={1} max={35}
            onChange={(v) => update({ signingLimit: v })}
          />
          <NumberField
            label="Final roster limit"
            description="Default 95"
            value={s.finalRosterLimit}
            min={1} max={99}
            onChange={(v) => update({ finalRosterLimit: v })}
          />
          <NumberField
            label="Target class size"
            description="Default 25"
            value={s.classTarget}
            min={1} max={s.signingLimit}
            onChange={(v) => update({ classTarget: v })}
          />
        </div>
      </Section>

      {/* Per-position advanced */}
      <button
        type="button"
        onClick={() => update({ showAdvanced: !s.showAdvanced })}
        className="text-xs flex items-center gap-1"
        style={{ color: 'var(--ocean-400)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        <span style={{ fontSize: '0.6rem' }}>{s.showAdvanced ? '▼' : '▶'}</span>
        Per-position limits {s.showAdvanced ? '(hide)' : '(show)'}
      </button>

      {s.showAdvanced && (
        <Section label="Per-Position Limits">
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--ocean-500)', fontWeight: 600, borderBottom: '1px solid var(--ocean-800)' }}>Pos</th>
                  <th style={{ textAlign: 'center', padding: '4px 8px', color: 'var(--ocean-500)', fontWeight: 600, borderBottom: '1px solid var(--ocean-800)' }}>Preferred</th>
                  <th style={{ textAlign: 'center', padding: '4px 8px', color: 'var(--ocean-500)', fontWeight: 600, borderBottom: '1px solid var(--ocean-800)' }}>Hard Max</th>
                </tr>
              </thead>
              <tbody>
                {NSD_POSITIONS.map((pos) => (
                  <tr key={pos} style={{ borderBottom: '1px solid var(--ocean-800)' }}>
                    <td style={{ padding: '3px 8px', color: 'var(--ocean-300)', fontWeight: 600 }}>{pos}</td>
                    <td style={{ padding: '3px 8px', textAlign: 'center' }}>
                      <InlineNumber
                        value={s.preferredByPos[pos]}
                        min={0} max={20}
                        onChange={(v) => updatePreferred(pos, v)}
                        defaultVal={NSD_PREFERRED_DEFAULTS[pos]}
                      />
                    </td>
                    <td style={{ padding: '3px 8px', textAlign: 'center' }}>
                      <InlineNumber
                        value={s.hardMaxByPos[pos]}
                        min={0} max={30}
                        onChange={(v) => updateHardMax(pos, v)}
                        defaultVal={NSD_HARD_MAX_DEFAULTS[pos]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = { ...s, preferredByPos: { ...NSD_PREFERRED_DEFAULTS }, hardMaxByPos: { ...NSD_HARD_MAX_DEFAULTS } };
              setS(next); saveNsd(next);
            }}
            className="text-xs mt-2"
            style={{ color: 'var(--ocean-500)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            ↺ Reset to defaults
          </button>
        </Section>
      )}
    </ModCard>
  );
}

// ── Preseason Transfer Wave ────────────────────────────────

function TwModCard() {
  const [s, setS] = useState<TwSettings>(makeTwDefaults());
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setS(loadTw()); setMounted(true); }, []);

  if (!mounted) return <ModCardSkeleton />;

  function update(patch: Partial<TwSettings>) {
    const next = { ...s, ...patch };
    setS(next);
    saveTw(next);
  }

  function updateThreshold(key: TwCheck, field: 'min' | 'max', val: number) {
    const next = { ...s, thresholdOverrides: { ...s.thresholdOverrides, [key]: { ...s.thresholdOverrides[key], [field]: val } } };
    setS(next); saveTw(next);
  }

  function updateSevere(key: TwCheck, val: number) {
    const next = { ...s, severeThresholdOverrides: { ...s.severeThresholdOverrides, [key]: val } };
    setS(next); saveTw(next);
  }

  function resetDefaults() {
    const next = makeTwDefaults();
    next.enabled = s.enabled;
    setS(next); saveTw(next);
  }

  return (
    <ModCard
      enabled={s.enabled}
      onToggle={(v) => update({ enabled: v })}
      title="Preseason Transfer Wave"
      author="Balla's Transfer Wave V1.1.0 (native)"
      snapshot="preseason"
      description="Generates a realistic transfer portal wave in preseason. Runs the redistribution engine natively — no external app needed. Modifies the save file directly, then reimports automatically."
      warning="Game must be closed or at the main menu — not inside a dynasty — before running. Recommended for Year 2–3 and beyond, after the dynasty has had time to develop naturally."
    >
      {/* Global behavior */}
      <Section label="Wave Behavior">
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Prestige gap cap"
            description="Max prestige gap for Tier 2 placements before an enabled top-two exception. Default 3."
            value={s.prestigeGapCap}
            min={0} max={20}
            onChange={(v) => update({ prestigeGapCap: v })}
          />
          <Setting
            id="tw-top-two"
            label="Allow top-two destination exception"
            description="Allows a placement above the prestige cap only when the player would rank among the destination's top two at that position."
            checked={s.allowTopTwoException}
            onChange={(v) => update({ allowTopTwoException: v })}
          />
        </div>
        <div className="flex flex-wrap gap-4 mt-2">
          <Setting
            id="tw-tier2"
            label="Enable Tier 2 transfers"
            description="Move severe-surplus players to teams at/under max when needy slots are filled."
            checked={s.enableTier2}
            onChange={(v) => update({ enableTier2: v })}
          />
          <Setting
            id="tw-nil"
            label="Zero out NIL after wave"
            description="Resets BaseNILValue and CurrentNILCompensation to 0 on every moved player."
            checked={s.zeroNil}
            onChange={(v) => update({ zeroNil: v })}
          />
        </div>
      </Section>

      {/* Position min/max */}
      <button
        type="button"
        onClick={() => update({ showPositions: !s.showPositions })}
        className="text-xs flex items-center gap-1"
        style={{ color: 'var(--ocean-400)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
      >
        <span style={{ fontSize: '0.6rem' }}>{s.showPositions ? '▼' : '▶'}</span>
        Position min/max thresholds {s.showPositions ? '(hide)' : '(show)'}
      </button>

      {s.showPositions && (
        <Section label="Position Thresholds">
          <p className="text-xs mb-2" style={{ color: 'var(--ocean-500)' }}>
            Teams below min get Tier 1 fills. Teams above max are donors. Scheme adjustments (run/pass heavy, 3-4 defense) apply on top automatically.
          </p>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--ocean-500)', fontWeight: 600, borderBottom: '1px solid var(--ocean-800)' }}>Group</th>
                  <th style={{ textAlign: 'center', padding: '4px 8px', color: 'var(--ocean-500)', fontWeight: 600, borderBottom: '1px solid var(--ocean-800)' }}>Min</th>
                  <th style={{ textAlign: 'center', padding: '4px 8px', color: 'var(--ocean-500)', fontWeight: 600, borderBottom: '1px solid var(--ocean-800)' }}>Max</th>
                </tr>
              </thead>
              <tbody>
                {TW_CHECKS.map((key) => (
                  <tr key={key} style={{ borderBottom: '1px solid var(--ocean-800)' }}>
                    <td style={{ padding: '3px 8px', color: 'var(--ocean-300)', fontWeight: 600 }}>{TW_CHECK_LABELS[key]}</td>
                    <td style={{ padding: '3px 8px', textAlign: 'center' }}>
                      <InlineNumber value={s.thresholdOverrides[key].min} min={0} max={20} onChange={(v) => updateThreshold(key, 'min', v)} defaultVal={TW_MIN_DEFAULTS[key]} />
                    </td>
                    <td style={{ padding: '3px 8px', textAlign: 'center' }}>
                      <InlineNumber value={s.thresholdOverrides[key].max} min={0} max={20} onChange={(v) => updateThreshold(key, 'max', v)} defaultVal={TW_MAX_DEFAULTS[key]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Severe thresholds */}
      {s.enableTier2 && (
        <>
          <button
            type="button"
            onClick={() => update({ showSevere: !s.showSevere })}
            className="text-xs flex items-center gap-1"
            style={{ color: 'var(--ocean-400)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <span style={{ fontSize: '0.6rem' }}>{s.showSevere ? '▼' : '▶'}</span>
            Tier 2 severe thresholds {s.showSevere ? '(hide)' : '(show)'}
          </button>

          {s.showSevere && (
            <Section label="Severe Thresholds (Tier 2)">
              <p className="text-xs mb-2" style={{ color: 'var(--ocean-500)' }}>
                How far above max a team must be before Tier 2 treats them as a forced-release donor.
              </p>
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--ocean-500)', fontWeight: 600, borderBottom: '1px solid var(--ocean-800)' }}>Group</th>
                      <th style={{ textAlign: 'center', padding: '4px 8px', color: 'var(--ocean-500)', fontWeight: 600, borderBottom: '1px solid var(--ocean-800)' }}>Threshold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TW_CHECKS.map((key) => (
                      <tr key={key} style={{ borderBottom: '1px solid var(--ocean-800)' }}>
                        <td style={{ padding: '3px 8px', color: 'var(--ocean-300)', fontWeight: 600 }}>{TW_CHECK_LABELS[key]}</td>
                        <td style={{ padding: '3px 8px', textAlign: 'center' }}>
                          <InlineNumber value={s.severeThresholdOverrides[key]} min={0} max={10} onChange={(v) => updateSevere(key, v)} defaultVal={TW_SEVERE_DEFAULTS[key]} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </>
      )}

      <button type="button" onClick={resetDefaults} className="text-xs" style={{ color: 'var(--ocean-500)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
        ↺ Reset all to defaults
      </button>
    </ModCard>
  );
}

// ── CFB Rebalance Setup ────────────────────────────────────

function RbModCard() {
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'launching' | 'launched' | 'error'>('idle');
  const [errorMsg] = useState('');

  useEffect(() => {
    try { setEnabled(JSON.parse(localStorage.getItem(LS_RB) ?? 'false')); } catch { /* ignore */ }
    setMounted(true);
  }, []);

  if (!mounted) return <ModCardSkeleton />;

  function toggle(v: boolean) {
    setEnabled(v);
    localStorage.setItem(LS_RB, JSON.stringify(v));
  }

  function launch() {
    // Rebalance is now invoked by the Import workflow, after Transfer Wave.
    setStatus('launched');
  }

  return (
    <ModCard
      enabled={enabled}
      onToggle={toggle}
      title="CFB Rebalance Setup"
      author="Dogsh*t"
      snapshot="preseason"
      description="Rebalances duplicate position slots (LT↔RT, LG↔RG, WLB↔SLB, etc.) in the save file. Run this after the Transfer Wave completes, before re-importing."
      warning="Exit the dynasty to the main menu before running; the game can remain open. Run AFTER the Transfer Wave."
    >
      <p className="text-xs" style={{ color: 'var(--ocean-400)' }}>
        Enable it here, then use Import to run it after Transfer Wave and before the save is re-imported.
      </p>
      <div className="hidden">
        <button
          type="button"
          onClick={launch}
          disabled={status === 'launching'}
          className="rounded px-4 py-1.5 text-sm font-semibold transition-opacity"
          style={{
            background: 'var(--ocean-600)', color: '#fff',
            opacity: status === 'launching' ? 0.5 : 1,
            cursor: status === 'launching' ? 'not-allowed' : 'pointer',
            border: 'none',
          }}
        >
          {status === 'launching' ? 'Launching…' : 'Launch CFB Rebalance'}
        </button>
        {status === 'launched' && (
          <span className="text-xs" style={{ color: '#4ade80' }}>✓ Launched — close it when done, then re-import.</span>
        )}
        {status === 'error' && (
          <span className="text-xs" style={{ color: '#f87171' }}>Error: {errorMsg}</span>
        )}
      </div>
    </ModCard>
  );
}

// ── Shared components ──────────────────────────────────────

function ModCardSkeleton() {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--ocean-900)', border: '1px solid var(--ocean-700)', height: 88 }}
    />
  );
}

function ModCard({
  enabled, onToggle, title, author, snapshot, description, warning, children,
}: {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  title: string;
  author: string;
  snapshot: 'signing_day' | 'preseason';
  description: string;
  warning?: string;
  children?: React.ReactNode;
}) {
  const snapshotLabel = snapshot === 'signing_day' ? 'Signing Day' : 'Preseason';
  const snapshotColor = snapshot === 'signing_day' ? '#60a5fa' : '#4ade80';

  return (
    <div
      className="rounded-xl p-5 space-y-3"
      style={{
        background: 'var(--ocean-900)',
        border: `1px solid var(--ocean-700)`,
        transition: 'border-color 0.15s',
      }}
    >
      {/* Header */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          style={{ width: 16, height: 16, marginTop: 3, accentColor: 'var(--ocean-500)', cursor: 'pointer', flexShrink: 0 }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: '0.975rem', fontWeight: 700, color: 'var(--ocean-100)' }}>{title}</span>
            <span
              className="rounded px-1.5 py-0.5 text-xs font-semibold"
              style={{ background: `${snapshotColor}20`, color: snapshotColor, border: `1px solid ${snapshotColor}40` }}
            >
              {snapshotLabel}
            </span>
            {enabled && (
              <span className="rounded px-1.5 py-0.5 text-xs font-semibold"
                style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
                ON
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--ocean-600)' }}>by {author}</p>
        </div>
      </label>

      {/* Description */}
      <p className="text-sm leading-relaxed pl-7" style={{ color: 'var(--ocean-400)' }}>{description}</p>

      {/* Settings + warning (only when enabled) */}
      {enabled && children && (
        <div className="pl-7 pt-3 space-y-4 border-t" style={{ borderColor: 'var(--ocean-800)' }}>
          {warning && (
            <p className="rounded-md border px-3 py-2 text-xs leading-relaxed" style={{ color: '#171717', background: '#fef3c7', borderColor: '#b8860b' }}>⚠ {warning}</p>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-600)' }}>{label}</p>
      {children}
    </div>
  );
}

function Setting({
  id, label, description, checked, onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-2.5 cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 14, height: 14, marginTop: 2, accentColor: 'var(--ocean-500)', cursor: 'pointer', flexShrink: 0 }}
      />
      <div>
        <div className="text-xs font-medium" style={{ color: 'var(--ocean-200)' }}>{label}</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--ocean-500)' }}>{description}</div>
      </div>
    </label>
  );
}

function NumberField({
  label, description, value, min, max, onChange,
}: {
  label: string;
  description: string;
  value: number | undefined;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const safeValue = value ?? min;
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ocean-300)' }}>{label}</label>
      <input
        type="number"
        value={safeValue}
        min={min}
        max={max}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
        className="w-full rounded border px-2 py-1.5 text-sm outline-none tabular-nums"
        style={{ background: 'var(--ocean-800)', borderColor: 'var(--ocean-700)', color: 'var(--ocean-100)' }}
      />
      <p className="text-xs mt-0.5" style={{ color: 'var(--ocean-600)' }}>{description}</p>
    </div>
  );
}

function InlineNumber({
  value, min, max, onChange, defaultVal,
}: {
  value: number | undefined; min: number; max: number;
  onChange: (v: number) => void;
  defaultVal: number;
}) {
  const safeValue = value ?? defaultVal;
  const isChanged = safeValue !== defaultVal;
  return (
    <input
      type="number"
      value={safeValue}
      min={min}
      max={max}
      onChange={(e) => {
        const n = parseInt(e.target.value, 10);
        if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
      }}
      className="rounded border text-center tabular-nums outline-none"
      style={{
        width: 48, padding: '2px 4px', fontSize: '0.72rem',
        background: 'var(--ocean-800)',
        borderColor: isChanged ? 'var(--ocean-600)' : 'var(--ocean-700)',
        color: isChanged ? 'var(--ocean-100)' : 'var(--ocean-300)',
      }}
    />
  );
}

function PipelineModCard() {
  const [s, setS] = useState<PipelineSettings>(PIPELINE_DEFAULTS);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setS(loadPipeline()); setMounted(true); }, []);
  if (!mounted) return <ModCardSkeleton />;
  const update = (patch: Partial<PipelineSettings>) => { const next={...s,...patch}; setS(next); savePipeline(next); };
  const preset = (name: PipelineSettings['preset']) => {
    const values = name === 'rosterDriven' ? [.35,.35,.2,.1] : name === 'blueChipFocused' ? [.2,.55,.15,.1] : name === 'coachLegacy' ? [.2,.25,.45,.1] : [.3,.25,.1,.35];
    update({ preset:name, wRoster:values[0], wStar:values[1], wCoach:values[2], wGeo:values[3] });
  };
  const weight = (key: 'wRoster'|'wStar'|'wCoach'|'wGeo', value: number) => update({ [key]: value, preset:'custom' } as Partial<PipelineSettings>);
  return <ModCard enabled={s.enabled} onToggle={(enabled) => update({ enabled })} title="Dynamic Recruiting Pipelines" author="Dynamic Recruiting Pipeline Tool v1.1.0" snapshot="preseason" description="Recomputes recruiting pipelines from roster makeup, star quality, coaches, geography, and prior pipelines. Runs after Transfer Wave and CFB Rebalance, then imports the updated pipeline data." warning="Exit the dynasty to the main menu before running; the game can remain open. A fresh Pipeline Backup is created before changes.">
    <Section label="Preset & Core Settings">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-xs font-medium mb-1" style={{color:'var(--ocean-300)'}}>Preset</label><select value={s.preset} onChange={e => preset(e.target.value as PipelineSettings['preset'])} className="w-full rounded border px-2 py-1.5 text-sm" style={{background:'var(--ocean-800)',borderColor:'var(--ocean-700)',color:'var(--ocean-100)'}}><option value="rosterDriven">Roster-driven</option><option value="blueChipFocused">Blue-chip focused</option><option value="coachLegacy">Coach-legacy</option><option value="grounded">Grounded</option><option value="custom">Custom</option></select></div>
        <NumberField label="Max pipelines" description="Regular-team ceiling (1–10)" value={s.maxPipelines} min={1} max={10} onChange={v=>update({maxPipelines:v})} />
      </div>
      <div className="grid grid-cols-4 gap-2 mt-3">{([['wRoster','Roster'],['wStar','Star'],['wCoach','Coach'],['wGeo','Geography']] as const).map(([key,label])=><div key={key}><label className="block text-xs mb-1" style={{color:'var(--ocean-400)'}}>{label}</label><input type="number" step="0.05" min="0" max="1" value={s[key]} onChange={e=>weight(key,Number(e.target.value))} className="w-full rounded border px-2 py-1 text-sm" style={{background:'var(--ocean-800)',borderColor:'var(--ocean-700)',color:'var(--ocean-100)'}} /></div>)}</div>
      <p className="text-xs mt-2" style={{color:'var(--ocean-500)'}}>Weights total {(s.wRoster+s.wStar+s.wCoach+s.wGeo).toFixed(2)} (recommended: 1.00).</p>
    </Section>
    <button type="button" onClick={()=>update({showAdvanced:!s.showAdvanced})} className="text-xs underline" style={{color:'var(--ocean-400)'}}>{s.showAdvanced ? 'Hide advanced settings' : 'Show advanced settings'}</button>
    {s.showAdvanced && <Section label="Advanced">
      <div className="grid grid-cols-3 gap-3"><NumberField label="Decay" description="Prior score retained (%)" value={Math.round(s.decay*100)} min={0} max={100} onChange={v=>update({decay:v/100})}/><NumberField label="Geography radius" description="Miles" value={s.geoRadius} min={50} max={1500} onChange={v=>update({geoRadius:v})}/><NumberField label="Coach ramp seasons" description="For gradual influence" value={s.coachRampSeasons} min={0} max={10} onChange={v=>update({coachRampSeasons:v})}/></div>
      <div className="mt-3 grid grid-cols-2 gap-3"><Setting id="pipe-ramp" label="Ramp coach influence" description="New coaches build influence gradually" checked={s.coachRampMode==='ramp'} onChange={v=>update({coachRampMode:v?'ramp':'full'})}/>{(['HeadCoach','OffensiveCoordinator','DefensiveCoordinator'] as const).map(k=><Setting key={k} id={`pipe-${k}`} label={k.replace(/([A-Z])/g,' $1').trim()} description="Include this staff role" checked={s.coachInclude[k]} onChange={v=>update({coachInclude:{...s.coachInclude,[k]:v}})}/>)}</div>
      <div className="mt-4 border-t pt-3" style={{borderColor:'var(--ocean-700)'}}><Setting id="pipe-academy" label="Academy mode" description="Optional wide national footprint for Army, Navy, and Air Force" checked={s.academyMode} onChange={v=>update({academyMode:v})}/>{s.academyMode && <div className="grid grid-cols-3 gap-3 mt-3"><NumberField label="Academy slots" description="Target footprint" value={s.academyTargetCount} min={1} max={42} onChange={v=>update({academyTargetCount:v})}/><div><label className="block text-xs mb-1" style={{color:'var(--ocean-400)'}}>Uniform tier</label><select value={s.academyUniformTier} onChange={e=>update({academyUniformTier:e.target.value})} className="w-full rounded border px-2 py-1.5 text-sm" style={{background:'var(--ocean-800)',borderColor:'var(--ocean-700)',color:'var(--ocean-100)'}}>{['NicheInterest','Respected','Popular','HouseholdName','CulturalPillar'].map(x=><option key={x}>{x}</option>)}</select></div><div className="space-y-2"><Setting id="pipe-uniform" label="Uniform tier" description="Use selected tier" checked={s.academyUniform} onChange={v=>update({academyUniform:v})}/><Setting id="pipe-exempt" label="Set once" description="Leave setup unchanged later" checked={s.academyExempt} onChange={v=>update({academyExempt:v})}/></div></div>}</div>
    </Section>}
  </ModCard>;
}
