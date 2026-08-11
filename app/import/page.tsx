'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { safeJson } from '@/lib/safeFetch';

type SaveFile = { name: string; path: string };
type UploadedSave = { name: string; url: string };
type CloudWorkflowResult = { importResult: ImportResult; modLogs: { type: 'nsd' | 'tw' | 'rebalance' | 'pipeline' | 'fang' | 'realignment'; data: Record<string, unknown> }[]; downloadPath: string };
type CloudJob = { state: 'queued' | 'running' | 'complete' | 'failed'; result?: CloudWorkflowResult; error?: string };
type Season = { id: string; year: number; label: string };
type ImportResult = {
  seasonYear: number;
  snapshot: 'preseason' | 'signing_day';
  teamsImported: number;
  teamsSkipped: string[];
  unsignedWritten?: number;
};
type ImportPackageResult = { ok: true; seasons: number; teams: number };

// ── Mod settings (read from localStorage) ─────────────────

type Pos = 'QB'|'HB'|'FB'|'WR'|'TE'|'LT'|'LG'|'C'|'RG'|'RT'|'EDGE'|'DT'|'LB'|'CB'|'S'|'K'|'P';
type NsdSettings = { enabled: boolean; signingLimit: number; finalRosterLimit: number; classTarget: number; preferredByPos?: Record<Pos,number>; hardMaxByPos?: Record<Pos,number> };
type TwCheckOverride = { min: number; max: number };
type TwSettings = { enabled: boolean; thresholdOverrides?: Record<string, TwCheckOverride>; severeThresholdOverrides?: Record<string, number>; enableTier2?: boolean; prestigeGapCap?: number; allowTopTwoException?: boolean; zeroNil?: boolean };
type RebalanceSettings = { enabled: boolean };
type PipelineSettings = { enabled: boolean; [key: string]: unknown };
type FangSettings = { enabled: boolean; fileName?: string; config?: Record<string, unknown> | null };
type RealignmentSettings = { enabled: boolean; [key: string]: unknown };

function readNsd(): NsdSettings {
  try {
    const s = JSON.parse(localStorage.getItem('gc_mod_nsd') ?? '{}');
    return { enabled: s.enabled ?? false, signingLimit: s.signingLimit ?? 35, finalRosterLimit: s.finalRosterLimit ?? 95, classTarget: s.classTarget ?? 25, preferredByPos: s.preferredByPos, hardMaxByPos: s.hardMaxByPos };
  } catch { return { enabled: false, signingLimit: 35, finalRosterLimit: 95, classTarget: 25 }; }
}
function readTw(): TwSettings {
  try { return JSON.parse(localStorage.getItem('gc_mod_tw') ?? '{}'); }
  catch { return { enabled: false }; }
}
function readRebalance(): RebalanceSettings {
  try { return { enabled: Boolean(JSON.parse(localStorage.getItem('gc_mod_rb') ?? 'false')) }; }
  catch { return { enabled: false }; }
}
function readPipeline(): PipelineSettings {
  try { return JSON.parse(localStorage.getItem('gc_mod_pipeline') ?? '{}'); }
  catch { return { enabled: false }; }
}
function readFang(): FangSettings { try { return JSON.parse(localStorage.getItem('gc_mod_fang') ?? '{}'); } catch { return { enabled: false }; } }
function readRealignment(): RealignmentSettings { try { return JSON.parse(localStorage.getItem('gc_mod_realignment') ?? '{}'); } catch { return { enabled: false }; } }

// ── Page ───────────────────────────────────────────────────

export default function ImportPage() {
  const [saves, setSaves] = useState<SaveFile[]>([]);
  const [saveDir, setSaveDir] = useState('');
  const [defaultDir, setDefaultDir] = useState('');
  const [isDefaultDir, setIsDefaultDir] = useState(true);
  const [selectedPath, setSelectedPath] = useState('');
  const [cloudMode, setCloudMode] = useState(false);
  const [uploadedSave, setUploadedSave] = useState<UploadedSave | null>(null);
  const [uploadingSave, setUploadingSave] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [cloudDownloadPath, setCloudDownloadPath] = useState('');
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const importPackageInputRef = useRef<HTMLInputElement>(null);
  const [loadError, setLoadError] = useState('');
  const [snapshot, setSnapshot] = useState<'signing_day' | 'preseason'>('signing_day');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [showFolderEdit, setShowFolderEdit] = useState(false);
  const [folderInput, setFolderInput] = useState('');
  const [folderSaving, setFolderSaving] = useState(false);
  const [folderError, setFolderError] = useState('');
  const [packageBusy, setPackageBusy] = useState(false);
  const [packageMessage, setPackageMessage] = useState('');
  const [packageError, setPackageError] = useState('');

  // Mod state
  const [nsd, setNsd] = useState<NsdSettings>({ enabled: false, signingLimit: 35, finalRosterLimit: 95, classTarget: 25 });
  const [tw, setTw] = useState<TwSettings>({ enabled: false });
  const [rebalance, setRebalance] = useState<RebalanceSettings>({ enabled: false });
  const [pipeline, setPipeline] = useState<PipelineSettings>({ enabled: false });
  const [fang, setFang] = useState<FangSettings>({ enabled: false });
  const [realignment, setRealignment] = useState<RealignmentSettings>({ enabled: false });
  const [modsMounted, setModsMounted] = useState(false);

  // Import flow
  type FlowState = 'idle' | 'running_mod' | 'running_import' | 'running_cloud' | 'done' | 'error';
  const [flow, setFlow] = useState<FlowState>('idle');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [modStatus, setModStatus] = useState('Running selected mod…');
  const [modLogs, setModLogs] = useState<{ type: 'nsd' | 'tw' | 'rebalance' | 'pipeline' | 'fang' | 'realignment'; data: Record<string, unknown> }[]>([]);

  const router = useRouter();

  function loadSeasons() {
    safeJson<Season[]>('/api/seasons').then((res) => {
      if (res.ok) setSeasons(res.data ?? []);
      else setLoadError(res.error ?? 'Failed to load seasons');
    });
  }

  function loadSaves() {
    return safeJson<{ dir: string; defaultDir: string; isDefault: boolean; saves: SaveFile[]; error?: string }>('/api/saves').then((res) => {
      if (!res.ok) { setLoadError(res.error ?? 'Failed to load saves'); return; }
      const data = res.data;
      if (!data) return;
      setSaveDir(data.dir);
      setDefaultDir(data.defaultDir);
      setIsDefaultDir(data.isDefault);
      setSaves(data.saves);
      setSelectedPath(data.saves.length ? data.saves[0].path : '');
      setLoadError(data.error ?? '');
    });
  }

  useEffect(() => {
    setCloudMode(false);
    loadSaves();
    loadSeasons();
    setNsd(readNsd());
    setTw(readTw());
    setRebalance(readRebalance());
    setPipeline(readPipeline());
    setFang(readFang());
    setRealignment(readRealignment());
    setModsMounted(true);
  }, []);

  async function uploadCloudSave(file: File) {
    setUploadingSave(true); setUploadError(''); setUploadedSave(null);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'dynasty-save';
      const blob = await upload(`dynasty-uploads/${Date.now()}-${safeName}`, file, {
        access: 'private',
        handleUploadUrl: '/api/uploads/dynasty',
      });
      setUploadedSave({ name: file.name, url: blob.url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Unable to upload the dynasty save.');
    } finally {
      setUploadingSave(false);
    }
  }

  async function saveFolder() {
    setFolderSaving(true); setFolderError('');
    try {
      const res = await fetch('/api/app-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saveDir: folderInput.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) { setFolderError(data.error ?? 'Failed to save folder'); return; }
      setShowFolderEdit(false);
      await loadSaves();
    } catch (e) {
      setFolderError(e instanceof Error ? e.message : 'Failed to save folder');
    } finally {
      setFolderSaving(false);
    }
  }

  async function resetFolder() {
    setFolderSaving(true); setFolderError('');
    try {
      await fetch('/api/app-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ saveDir: null }) });
      setShowFolderEdit(false);
      await loadSaves();
    } finally { setFolderSaving(false); }
  }

  async function restoreImportPackage(file: File) {
    setPackageBusy(true); setPackageMessage(''); setPackageError('');
    try {
      const packageData = JSON.parse(await file.text());
      const response = await safeJson<ImportPackageResult>('/api/import-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packageData),
      });
      if (!response.ok || !response.data) throw new Error(response.error ?? 'Could not restore imports.');
      setPackageMessage(`Restored ${response.data.seasons} season${response.data.seasons === 1 ? '' : 's'} from ${file.name}.`);
      await loadSeasons();
    } catch (err) {
      setPackageError(err instanceof Error ? err.message : 'Could not read that imports package.');
    } finally {
      setPackageBusy(false);
      if (importPackageInputRef.current) importPackageInputRef.current.value = '';
    }
  }

  async function runImport() {
    if (cloudMode) {
      const response = await safeJson<CloudWorkflowResult | { jobId: string }>('/api/cloud/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blobUrl: uploadedSave?.url,
          snapshot,
          mods: { fang, tw, rebalance, pipeline, nsd, realignment },
        }),
      });
      if (!response.ok || !response.data) throw new Error(response.error || 'Cloud processing failed');
      let cloud: CloudWorkflowResult;
      if ('jobId' in response.data) {
        const jobId = response.data.jobId;
        while (true) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          const job = await safeJson<CloudJob>(`/api/cloud/process?jobId=${encodeURIComponent(jobId)}`);
          if (!job.ok || !job.data) throw new Error(job.error || 'Cloud processing status could not be read');
          if (job.data.state === 'failed') throw new Error(job.data.error || 'Cloud processing failed');
          if (job.data.state === 'complete' && job.data.result) { cloud = job.data.result; break; }
        }
      } else cloud = response.data;
      setModLogs(cloud.modLogs ?? []);
      setCloudDownloadPath(cloud.downloadPath ?? '');
      return cloud.importResult;
    }
    const response = await safeJson<ImportResult>('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cloudMode ? { blobUrl: uploadedSave?.url, snapshot } : { path: selectedPath, snapshot }),
    });
    if (!response.ok || !response.data) throw new Error(response.error || 'Import failed');
    return response.data;
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (cloudMode ? !uploadedSave : !selectedPath) return;
    setError(''); setResult(null); setModLogs([]);

    const nsdActive = nsd.enabled && snapshot === 'signing_day';
    const twActive  = tw.enabled  && snapshot === 'preseason';
    const rebalanceActive = rebalance.enabled && snapshot === 'preseason';
    const pipelineActive = pipeline.enabled && snapshot === 'preseason';
    const fangActive = fang.enabled && snapshot === 'preseason';
    const realignmentActive = realignment.enabled && snapshot === 'signing_day';

    try {
      if (cloudMode) {
        setFlow('running_cloud');
        const importResult = await runImport();
        setResult(importResult);
        setFlow('done');
        return;
      }
      // Preseason order: Fang, Pipelines, Transfer Wave, Rebalance, then import.
      if (fangActive) {
        if (!fang.config) throw new Error("Fang's Recruiting Generator is enabled, but no settings JSON is loaded in Toolbox.");
        setModStatus("Running Fang's Recruiting Generator…");
        setFlow('running_mod');
        const fangRes = await fetch('/api/mods/fang', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savePath: selectedPath, settings: fang.config }) });
        const fangData = await fangRes.json();
        if (!fangRes.ok) throw new Error(fangData.error ?? "Fang's Recruiting Generator failed");
        setModLogs((logs) => [...logs, { type: 'fang', data: { ...(fangData.result ?? {}), log: fangData.log ?? [] } }]);
      }
      if (pipelineActive) {
        setModStatus('Running Dynamic Recruiting Pipelines…');
        setFlow('running_mod');
        const pipelineRes = await fetch('/api/mods/pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savePath: selectedPath, settings: pipeline }) });
        const pipelineData = await pipelineRes.json();
        if (!pipelineRes.ok) throw new Error(pipelineData.error ?? 'Pipeline Tool failed');
        setModLogs((logs) => [...logs, { type: 'pipeline', data: pipelineData.result ?? {} }]);
      }

      // Transfer Wave: run natively, reimport automatically
      if (twActive) {
        setModStatus('Running Transfer Wave engine…');
        setFlow('running_mod');
        const twRes = await fetch('/api/mods/transfer-wave-run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reimport: false,
            savePath: selectedPath,
            settings: {
              thresholdOverrides: tw.thresholdOverrides,
              severeThresholdOverrides: tw.severeThresholdOverrides,
              enableTier2: tw.enableTier2,
              prestigeGapCap: tw.prestigeGapCap,
              allowTopTwoException: tw.allowTopTwoException,
              zeroNil: tw.zeroNil,
            },
          }),
        });
        const twData = await twRes.json();
        if (!twRes.ok) throw new Error(twData.error ?? 'Transfer Wave failed');
        setModLogs((logs) => [...logs, { type: 'tw', data: { ...(twData.modResult ?? {}), log: twData.log ?? [] } }]);
      }


      if (rebalanceActive) {
        setModStatus('Running CFB Rebalance…');
        setFlow('running_mod');
        const rebalanceRes = await fetch('/api/mods/rebalance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ savePath: selectedPath }) });
        const rebalanceData = await rebalanceRes.json();
        if (!rebalanceRes.ok) throw new Error(rebalanceData.error ?? 'CFB Rebalance failed');
        setModLogs((logs) => [...logs, { type: 'rebalance', data: rebalanceData.result ?? {} }]);
      }
      // NSD mod: run automatically
      if (nsdActive) {
        setModStatus('Running NSD Assign…');
        setFlow('running_mod');
        const modRes = await fetch('/api/mods/nsd-assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bypassWeekRequirement: false,
            reimport: false,
            savePath: selectedPath,
            placementSettings: {
              signingLimit: nsd.signingLimit,
              finalRosterLimit: nsd.finalRosterLimit,
              classTarget: nsd.classTarget,
              ...(nsd.preferredByPos ? { preferredCountByPosition: nsd.preferredByPos } : {}),
              ...(nsd.hardMaxByPos ? { hardMaximumByPosition: nsd.hardMaxByPos } : {}),
            },
          }),
        });
        const modData = await modRes.json();
        if (!modRes.ok) throw new Error(modData.error ?? 'NSD mod failed');
        setModLogs((logs) => [...logs, { type: 'nsd', data: modData.modResult ?? {} }]);
      }
      if (realignmentActive) {
        setModStatus('Generating conference realignment recommendations…');
        setFlow('running_mod');
        const realignmentRes = await fetch('/api/mods/realignment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ savePath: selectedPath, settings: realignment }),
        });
        const realignmentData = await realignmentRes.json();
        if (!realignmentRes.ok) throw new Error(realignmentData.error ?? 'Conference realignment recommendations failed');
        setModLogs((logs) => [...logs, { type: 'realignment', data: realignmentData.result ?? {} }]);
      }

      // Import the (now-modified) save
      setFlow('running_import');
      const importResult = await runImport();
      setResult(importResult);
      setFlow('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setFlow('error');
    }
  }

  function reset() { setFlow('idle'); setResult(null); setError(''); setModLogs([]); setCloudDownloadPath(''); }

  // Which mods are active for the selected snapshot — only after localStorage loads
  const nsdActive = modsMounted && nsd.enabled && snapshot === 'signing_day';
  const twActive  = modsMounted && tw.enabled  && snapshot === 'preseason';
  const rebalanceActive = modsMounted && rebalance.enabled && snapshot === 'preseason';
  const pipelineActive = modsMounted && pipeline.enabled && snapshot === 'preseason';
  const fangActive = modsMounted && fang.enabled && snapshot === 'preseason';
  const realignmentActive = modsMounted && realignment.enabled && snapshot === 'signing_day';
  const anyModActive = nsdActive || twActive || rebalanceActive || pipelineActive || fangActive || realignmentActive;

  const isIdle = flow === 'idle';

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-xl font-bold" style={{ color: 'var(--ocean-100)' }}>Import Dynasty Save</h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--ocean-400)' }}>
        Select a dynasty save file below. Import twice per season: once at{' '}
        <strong style={{ color: 'var(--ocean-200)' }}>Preseason</strong> and once after{' '}
        <strong style={{ color: 'var(--ocean-200)' }}>National Signing Day</strong>.
      </p>

      {/* Active mods banner */}
      {anyModActive && isIdle && (
        <div
          className="mt-4 rounded-lg px-4 py-3 space-y-1.5"
          style={{ background: 'var(--ocean-800)', border: '1px solid var(--ocean-700)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-400)' }}>Active mods for this import</p>
          {fangActive && (
            <p className="text-xs" style={{ color: 'var(--ocean-200)' }}>
              <span className="inline-block w-2 h-2 rounded-sm mr-2 align-middle" style={{ background: 'var(--ocean-400)' }} />
              <strong>Fang's Recruiting Generator</strong>
              <span style={{ color: 'var(--ocean-400)' }}> — runs last among enabled Preseason mods, immediately before import.</span>
            </p>
          )}
          {nsdActive && (
            <p className="text-xs" style={{ color: 'var(--ocean-200)' }}>
              <span className="inline-block w-2 h-2 rounded-sm mr-2 align-middle" style={{ background: 'var(--ocean-400)' }} />
              <strong>NSD: Assign Unsigned Players</strong>
              <span style={{ color: 'var(--ocean-400)' }}> — will run before importing, then save will be reimported.</span>
            </p>
          )}
          {realignmentActive && (
            <p className="text-xs" style={{ color: 'var(--ocean-200)' }}>
              <span className="inline-block w-2 h-2 rounded-sm mr-2 align-middle" style={{ background: 'var(--ocean-400)' }} />
              <strong>Dynamic Conference Realignment</strong>
              <span style={{ color: 'var(--ocean-400)' }}> — runs after NSD as a recommendation only. Apply moves through Custom Conferences during the offseason.</span>
            </p>
          )}
          {twActive && (
            <p className="text-xs" style={{ color: 'var(--ocean-200)' }}>
              <span className="inline-block w-2 h-2 rounded-sm mr-2 align-middle" style={{ background: 'var(--ocean-400)' }} />
              <strong>Preseason Transfer Wave</strong>
              <span style={{ color: 'var(--ocean-400)' }}> — runs second-to-last among enabled Preseason mods, immediately before Fang when enabled.</span>
            </p>
          )}
          {rebalanceActive && (
            <p className="text-xs" style={{ color: 'var(--ocean-200)' }}>
              <span className="inline-block w-2 h-2 rounded-sm mr-2 align-middle" style={{ background: 'var(--ocean-400)' }} />
              <strong>CFB Rebalance</strong>
              <span style={{ color: 'var(--ocean-400)' }}> — runs before Pipelines, Transfer Wave, Fang, and import. A backup is created beside the save first.</span>
            </p>
          )}
          {pipelineActive && (
            <p className="text-xs" style={{ color: 'var(--ocean-200)' }}>
              <span className="inline-block w-2 h-2 rounded-sm mr-2 align-middle" style={{ background: 'var(--ocean-400)' }} />
              <strong>Dynamic Recruiting Pipelines</strong>
              <span style={{ color: 'var(--ocean-400)' }}> — runs after Rebalance and before Transfer Wave, Fang, and import.</span>
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleImport} className="mt-6 flex flex-col gap-4">
        {/* Save file */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-500)' }}>
            Save File
          </label>
          {cloudMode ? (
            <div className="rounded-lg border px-4 py-3" style={{ borderColor: 'var(--ocean-700)', background: 'var(--ocean-900)' }}>
              <input
                ref={uploadInputRef}
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadCloudSave(file);
                  event.currentTarget.value = '';
                }}
              />
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" disabled={!isIdle || uploadingSave} onClick={() => uploadInputRef.current?.click()} className="rounded px-3 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ background: 'var(--ocean-600)' }}>
                  {uploadingSave ? 'Uploading save…' : uploadedSave ? 'Choose another save' : 'Choose dynasty save'}
                </button>
                <span className="text-sm" style={{ color: uploadedSave ? 'var(--ocean-200)' : 'var(--ocean-400)' }}>
                  {uploadedSave ? `Ready: ${uploadedSave.name}` : 'Your save is uploaded privately for this import.'}
                </span>
              </div>
              {uploadError && <p className="mt-2 text-xs" style={{ color: '#fca5a5' }}>{uploadError}</p>}
              <p className="mt-2 text-xs" style={{ color: 'var(--ocean-500)' }}>Your save stays private. Enabled mods run in the secure processing worker, then you can download the updated save.</p>
            </div>
          ) : saves.length > 0 ? (
            <select
              value={selectedPath}
              onChange={(e) => setSelectedPath(e.target.value)}
              disabled={!isIdle}
              className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none"
              style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-700)', color: 'var(--ocean-100)' }}
            >
              {saves.map((s) => <option key={s.path} value={s.path}>{s.name}</option>)}
            </select>
          ) : (
            <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'var(--ocean-700)', background: 'var(--ocean-900)', color: 'var(--ocean-400)' }}>
              {loadError || 'No dynasty save files found'}
            </div>
          )}
          {!showFolderEdit ? (
            <p className="mt-1.5 text-xs" style={{ color: 'var(--ocean-500)' }}>
              Looking in: {saveDir}
              {!isDefaultDir && <span style={{ color: 'var(--ocean-400)' }}> (custom)</span>}
              {' · '}
              <button type="button" onClick={() => { setFolderInput(saveDir); setFolderError(''); setShowFolderEdit(true); }} className="underline hover:opacity-80">
                Change
              </button>
            </p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              <input
                type="text"
                value={folderInput}
                onChange={(e) => setFolderInput(e.target.value)}
                placeholder={defaultDir}
                className="w-full rounded-lg border px-3 py-2 text-xs outline-none"
                style={{ background: 'var(--ocean-900)', borderColor: 'var(--ocean-700)', color: 'var(--ocean-100)' }}
              />
              <div className="flex items-center gap-3 text-xs">
                <button type="button" onClick={saveFolder} disabled={folderSaving} className="rounded px-3 py-1.5 font-medium text-white disabled:opacity-40" style={{ background: 'var(--ocean-600)' }}>Save</button>
                {!isDefaultDir && (
                  <button type="button" onClick={resetFolder} disabled={folderSaving} className="underline hover:opacity-80 disabled:opacity-40" style={{ color: 'var(--ocean-400)' }}>Reset to default</button>
                )}
                <button type="button" onClick={() => { setShowFolderEdit(false); setFolderError(''); }} className="underline hover:opacity-80" style={{ color: 'var(--ocean-400)' }}>Cancel</button>
              </div>
              {folderError && <p style={{ color: '#fca5a5' }}>{folderError}</p>}
            </div>
          )}
        </div>

        {/* Snapshot type */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-500)' }}>
            Snapshot Type
          </label>
          <div className="flex gap-3">
            {(['signing_day', 'preseason'] as const).map((s) => (
              <button
                key={s}
                type="button"
                disabled={!isIdle}
                onClick={() => setSnapshot(s)}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  background: snapshot === s ? 'var(--ocean-600)' : 'var(--ocean-900)',
                  borderColor: snapshot === s ? 'var(--ocean-500)' : 'var(--ocean-700)',
                  color: snapshot === s ? '#fff' : 'var(--ocean-400)',
                }}
              >
                {s === 'signing_day' ? 'Signing Day' : 'Preseason'}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs" style={{ color: 'var(--ocean-500)' }}>
            {snapshot === 'signing_day'
              ? 'Import after National Signing Day to capture final class commitments.'
              : 'Import at season start to capture preseason roster and pipeline state.'}
          </p>
        </div>

        {/* Submit / flow state */}
        {flow === 'idle' && (
          <button
            type="submit"
            disabled={cloudMode ? !uploadedSave : !selectedPath}
            className="self-start rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ background: 'var(--ocean-600)' }}
          >
            {fangActive
              ? (pipelineActive || twActive || rebalanceActive ? 'Run Fang + Mods + Import' : 'Run Fang + Import')
              : nsdActive && realignmentActive
              ? 'Run NSD + Realignment + Import'
              : realignmentActive
              ? 'Run Realignment + Import'
              : pipelineActive && twActive && rebalanceActive
              ? 'Run Pipelines + Transfer Wave + Rebalance + Import'
              : pipelineActive && rebalanceActive
              ? 'Run Pipelines + Rebalance + Import'
              : pipelineActive
              ? 'Run Pipeline Tool + Import'
              : rebalanceActive && twActive
              ? 'Run Transfer Wave + Rebalance + Import'
              : rebalanceActive
              ? 'Run CFB Rebalance + Import'
              : nsdActive && twActive
              ? 'Run Mods + Import'
              : nsdActive
              ? 'Run NSD Assign + Import'
              : twActive
              ? 'Run Transfer Wave + Import'
              : 'Import Save'}
          </button>
        )}


        {flow === 'running_mod' && (
          <p className="text-sm" style={{ color: 'var(--ocean-400)' }}>
            ⏳ {modStatus}
          </p>
        )}
        {flow === 'running_import' && (
          <p className="text-sm" style={{ color: 'var(--ocean-400)' }}>
            {modLogs.length ? '⏳ Mod complete — importing save…' : '⏳ Importing…'}
          </p>
        )}
        {flow === 'running_cloud' && (
          <p className="text-sm" style={{ color: 'var(--ocean-400)' }}>
            ⏳ Processing and importing your save securely…
          </p>
        )}

        {flow === 'error' && (
          <div className="space-y-3">
            <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#FCA5A5', background: 'rgba(220,38,38,0.08)', color: '#f87171' }}>
              {error}
            </div>
            <button type="button" onClick={reset} className="rounded px-3 py-1.5 text-sm" style={{ background: 'var(--ocean-800)', color: 'var(--ocean-300)' }}>
              Back
            </button>
          </div>
        )}

        {flow === 'done' && result && (
          <div className="space-y-3">
            {/* Import summary */}
            <div className="rounded-lg border px-4 py-3 text-sm space-y-1.5" style={{ borderColor: 'var(--ocean-700)', background: 'var(--ocean-900)', color: 'var(--ocean-200)' }}>
              <p><span style={{ color: '#4ade80' }}>✓</span> Imported <strong style={{ color: 'var(--ocean-100)' }}>Season {result.seasonYear} — {result.snapshot === 'preseason' ? 'Preseason' : 'Signing Day'}</strong> · {result.teamsImported} teams updated in Ghost City.</p>
              {result.snapshot === 'signing_day' && (
                <p className="text-xs" style={{ color: result.unsignedWritten > 0 ? 'var(--ocean-400)' : 'var(--ocean-600)' }}>
                  {result.unsignedWritten > 0
                    ? `${result.unsignedWritten} unsigned recruit records saved`
                    : 'No unsigned recruits found in this save (all may have signed or been assigned)'}
                </p>
              )}
              {result.teamsSkipped.length > 0 && (
                <p className="text-xs" style={{ color: 'var(--ocean-400)' }}>Skipped: {result.teamsSkipped.join(', ')}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button onClick={() => router.push('/')} className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--ocean-600)' }}>
                  View Dashboard
                </button>
                {cloudDownloadPath && (
                  <a href={`/api/cloud/download?path=${encodeURIComponent(cloudDownloadPath)}`} className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: 'var(--ocean-500)' }}>
                    Download Updated Save
                  </a>
                )}
                <button type="button" onClick={reset} className="rounded-lg px-4 py-2 text-sm font-medium" style={{ background: 'var(--ocean-800)', color: 'var(--ocean-300)', border: '1px solid var(--ocean-700)' }}>
                  Import Another
                </button>
              </div>
            </div>

            {/* Mod log */}
            {modLogs.map((log, index) => <ModLogPanel key={`${log.type}-${index}`} log={log} />)}
          </div>
        )}
      </form>

      {/* Season management */}
      <div className="mt-10 border-t pt-8" style={{ borderColor: 'var(--ocean-800)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--ocean-400)' }}>Imported Seasons</h2>
              <p className="mt-1 text-xs" style={{ color: 'var(--ocean-500)' }}>Save this tracker history before switching dynasties or starting fresh.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href="/api/import-package" className="rounded px-3 py-1 text-xs font-medium" style={{ background: 'var(--ocean-800)', color: 'var(--ocean-300)', border: '1px solid var(--ocean-700)' }}>
                Export Imports
              </a>
              <input
                ref={importPackageInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void restoreImportPackage(file);
                }}
              />
              <button type="button" disabled={packageBusy} onClick={() => importPackageInputRef.current?.click()} className="rounded px-3 py-1 text-xs font-medium disabled:opacity-40" style={{ background: 'var(--ocean-800)', color: 'var(--ocean-300)', border: '1px solid var(--ocean-700)' }}>
                {packageBusy ? 'Restoring…' : 'Restore Imports'}
              </button>
            {confirmDeleteAll ? (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--ocean-400)' }}>Delete all seasons?</span>
                <button
                  onClick={async () => {
                    setConfirmDeleteAll(false);
                    for (const s of seasons) {
                      await fetch('/api/seasons', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seasonId: s.id }) });
                    }
                    loadSeasons();
                  }}
                  className="rounded px-2.5 py-1 text-xs font-medium"
                  style={{ background: '#DC2626', color: '#fff' }}
                >
                  Yes, delete all
                </button>
                <button onClick={() => setConfirmDeleteAll(false)} className="rounded px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--ocean-800)', color: 'var(--ocean-400)', border: '1px solid var(--ocean-700)' }}>
                  Cancel
                </button>
              </div>
            ) : seasons.length > 0 ? (
              <button onClick={() => { setConfirmDeleteAll(true); setConfirmDeleteId(null); }} className="rounded px-3 py-1 text-xs font-medium" style={{ background: '#DC2626', color: '#fff' }}>
                Delete All
              </button>
            ) : null}
            </div>
          </div>
          {packageMessage && <p className="mt-3 text-xs" style={{ color: '#4ade80' }}>{packageMessage}</p>}
          {packageError && <p className="mt-3 text-xs" style={{ color: '#f87171' }}>{packageError}</p>}
          <div className="mt-3 flex flex-col gap-2">
            {seasons.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border px-4 py-2.5" style={{ borderColor: 'var(--ocean-800)', background: 'var(--ocean-900)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--ocean-200)' }}>{s.label}</span>
                {confirmDeleteId === s.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--ocean-400)' }}>Delete all data?</span>
                    <button
                      onClick={async () => {
                        setConfirmDeleteId(null);
                        await fetch('/api/seasons', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seasonId: s.id }) });
                        loadSeasons();
                      }}
                      className="rounded px-2.5 py-1 text-xs font-medium"
                      style={{ background: '#DC2626', color: '#fff' }}
                    >
                      Yes, delete
                    </button>
                    <button onClick={() => setConfirmDeleteId(null)} className="rounded px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--ocean-800)', color: 'var(--ocean-400)', border: '1px solid var(--ocean-700)' }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDeleteId(s.id)} className="rounded px-3 py-1 text-xs font-medium" style={{ background: '#DC2626', color: '#fff' }}>
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
      </div>
    </div>
  );
}

// ── Mod log panel ──────────────────────────────────────────

function ModLogPanel({ log }: { log: { type: 'nsd' | 'tw' | 'rebalance' | 'pipeline' | 'fang' | 'realignment'; data: Record<string, unknown> } }) {
  const d = log.data;

  if (log.type === 'realignment') {
    const moves = Array.isArray(d.summary) ? d.summary as [string, string][] : [];
    return (
      <div className="rounded-lg border px-4 py-3 text-xs space-y-2" style={{ borderColor: 'var(--ocean-700)', background: 'var(--ocean-900)' }}>
        <p className="font-semibold" style={{ color: 'var(--ocean-100)' }}>DYNAMIC CONFERENCE REALIGNMENT</p>
        <p style={{ color: 'var(--ocean-300)' }}>Season {String(d.season ?? '—')} · {moves.length} recommended conference move{moves.length === 1 ? '' : 's'}.</p>
        {moves.length > 0 ? <div className="flex flex-wrap gap-2">{moves.map(([conference, team], index) => <span key={`${conference}-${team}-${index}`} className="rounded px-2 py-1" style={{ background: 'var(--ocean-800)', color: 'var(--ocean-300)' }}>{team} → {conference}</span>)}</div> : <p style={{ color: 'var(--ocean-500)' }}>No moves met the current thresholds.</p>}
        <p style={{ color: '#fbbf24' }}>⚠ Recommendations only — RLT did not alter your save. Apply any accepted moves in CFB 27’s Custom Conferences during the offseason.</p>
      </div>
    );
  }

  if (log.type === 'fang') return (
    <div className="rounded-lg border px-4 py-3 text-xs space-y-2" style={{ borderColor: 'var(--ocean-700)', background: 'var(--ocean-900)' }}>
      <p className="font-semibold" style={{ color: 'var(--ocean-100)' }}>FANG'S RECRUITING GENERATOR</p>
      <p style={{ color: 'var(--ocean-300)' }}>{Number(d.candidates ?? 0)} recruit candidates processed · {Number(d.named ?? 0)} names · {Number(d.sized ?? 0)} sizes · {Number(d.portraits ?? 0)} portraits</p>
      <p style={{ color: 'var(--ocean-600)' }}>Backup created: {String(d.backupPath ?? 'not reported')}</p>
    </div>
  );

  if (log.type === 'pipeline') return (
    <div className="rounded-lg border px-4 py-3 text-xs space-y-1" style={{ borderColor: 'var(--ocean-700)', background: 'var(--ocean-900)' }}>
      <p className="font-semibold" style={{ color: 'var(--ocean-100)' }}>DYNAMIC RECRUITING PIPELINES</p>
      <p style={{ color: 'var(--ocean-300)' }}>{Number(d.teamsUpdated ?? 0)} teams recomputed{Number(d.academyTeams ?? 0) ? ` · ${Number(d.academyTeams)} academy team(s)` : ''}</p>
    </div>
  );

  if (log.type === 'rebalance') {
    const groups = Array.isArray(d.groups) ? d.groups as { label: string; moves: number; unresolved: string[] }[] : [];
    return (
      <div className="rounded-lg border px-4 py-3 space-y-3 text-xs" style={{ borderColor: 'var(--ocean-700)', background: 'var(--ocean-900)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-400)' }}>CFB Rebalance — Mod Log</p>
        <p style={{ color: 'var(--ocean-200)' }}>Changed <strong>{Number(d.totalMoves ?? 0)}</strong> position slots across <strong>{Number(d.teamsChanged ?? 0)}</strong> of {Number(d.teamsProcessed ?? 0)} teams.</p>
        <div className="space-y-1" style={{ color: 'var(--ocean-400)' }}>
          {groups.map((group) => <p key={group.label}>{group.label}: {group.moves} change{group.moves === 1 ? '' : 's'}{group.unresolved?.length ? ` · still short: ${group.unresolved.join(', ')}` : ''}</p>)}
        </div>
        <p style={{ color: 'var(--ocean-600)' }}>Backup created: {String(d.backupPath ?? 'not reported')}</p>
      </div>
    );
  }

  if (log.type === 'nsd') {
    const assigned     = Number(d.transfersAssigned ?? 0);
    const candidates   = Number(d.zeroOfferTransfers ?? 0);
    const onRoster     = Number(d.playersMovedToRoster ?? 0);
    const unassigned   = Number(d.transfersLeftUnassigned ?? 0);
    const dealbreakers = Number(d.recruitingDealbreakersCleared ?? 0);
    const warnings     = Array.isArray(d.rosterSyncWarnings) ? d.rosterSyncWarnings as string[] : [];

    return (
      <div className="rounded-lg border px-4 py-3 space-y-3 text-xs" style={{ borderColor: 'var(--ocean-700)', background: 'var(--ocean-900)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-400)' }}>NSD Assign — Mod Log</p>

        {/* Zero-candidates notice */}
        {candidates === 0 && (
          <p className="rounded px-3 py-2 text-xs" style={{ background: 'var(--ocean-800)', color: 'var(--ocean-400)' }}>
            ℹ No unsigned transfers found — all may already be assigned, or this save is not at the correct week (OffSeason, Week 6).
          </p>
        )}

        {/* Key numbers */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Candidates', value: candidates },
            { label: 'Assigned', value: assigned, accent: assigned > 0 },
            { label: 'Placed on Roster', value: onRoster, accent: onRoster > 0 },
            { label: 'Left Unassigned', value: unassigned },
          ].map(({ label, value, accent }) => (
            <div key={label} className="rounded p-2 text-center" style={{ background: 'var(--ocean-800)' }}>
              <div className="text-lg font-bold tabular-nums" style={{ color: accent ? 'var(--ocean-100)' : 'var(--ocean-400)' }}>{value}</div>
              <div style={{ color: 'var(--ocean-500)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Placement breakdown */}
        <div className="space-y-1" style={{ color: 'var(--ocean-400)' }}>
          {Number(d.previousSchoolCount) > 0 && <p>↩ {String(d.previousSchoolCount)} returned to previous school</p>}
          {Number(d.smartPlacementCount) > 0 && <p>🎯 {String(d.smartPlacementCount)} placed via smart depth fit</p>}
          {Number(d.favoriteWalkOnCount) > 0 && <p>🚶 {String(d.favoriteWalkOnCount)} placed as walk-ons at favorite school</p>}
          {dealbreakers > 0 && <p>🧹 {dealbreakers} recruiting dealbreakers cleared</p>}
          {d.baseNilPlayersReset != null && Number(d.baseNilPlayersReset) > 0 && <p>💰 {String(d.baseNilPlayersReset)} NIL base values reset</p>}
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="rounded p-2 space-y-1" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
            {warnings.map((w, i) => (
              <p key={i} style={{ color: '#fbbf24' }}>⚠ {w}</p>
            ))}
          </div>
        )}

        <p style={{ color: 'var(--ocean-600)' }}>Save file was modified in place and reimported — all pages now reflect the updated roster.</p>
      </div>
    );
  }

  // Transfer Wave log
  const totalMoves  = Number(d.totalMoves ?? 0);
  const tier1       = Number(d.tier1Count ?? 0);
  const tier2       = Number(d.tier2Count ?? 0);
  const teams       = Number(d.affectedTeamCount ?? 0);
  const byCheck     = d.byCheck && typeof d.byCheck === 'object' ? d.byCheck as Record<string, number> : {};
  const ovrBuckets  = d.ovrBuckets && typeof d.ovrBuckets === 'object' ? d.ovrBuckets as Record<string, number> : {};

  return (
    <div className="rounded-lg border px-4 py-3 space-y-3 text-xs" style={{ borderColor: 'var(--ocean-700)', background: 'var(--ocean-900)' }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-400)' }}>Transfer Wave — Mod Log</p>

      {/* Key numbers */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Moves', value: totalMoves, accent: true },
          { label: 'Tier 1', value: tier1 },
          { label: 'Tier 2', value: tier2 },
          { label: 'Teams Affected', value: teams },
        ].map(({ label, value, accent }) => (
          <div key={label} className="rounded p-2 text-center" style={{ background: 'var(--ocean-800)' }}>
            <div className="text-lg font-bold tabular-nums" style={{ color: accent ? 'var(--ocean-100)' : 'var(--ocean-400)' }}>{value}</div>
            <div style={{ color: 'var(--ocean-500)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* OVR breakdown */}
      {Object.keys(ovrBuckets).length > 0 && (
        <div>
          <p className="mb-1.5 font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-500)' }}>OVR Distribution</p>
          <div className="flex gap-3 flex-wrap">
            {[
              { key: 'under60', label: '<60' },
              { key: 'r60to70', label: '60–70' },
              { key: 'r70to80', label: '70–80' },
              { key: 'r80plus', label: '80+' },
            ].map(({ key, label }) => ovrBuckets[key] != null && (
              <span key={key} className="rounded px-2 py-0.5" style={{ background: 'var(--ocean-800)', color: 'var(--ocean-300)' }}>
                {label}: <strong>{ovrBuckets[key]}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* By position */}
      {Object.keys(byCheck).length > 0 && (
        <div>
          <p className="mb-1.5 font-semibold uppercase tracking-wide" style={{ color: 'var(--ocean-500)' }}>Moves by Position</p>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(byCheck).map(([pos, count]) => (
              <span key={pos} className="rounded px-2 py-0.5" style={{ background: 'var(--ocean-800)', color: 'var(--ocean-300)' }}>
                {pos}: <strong style={{ color: 'var(--ocean-100)' }}>{count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Live log */}
      {Array.isArray(d.log) && (d.log as string[]).length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs" style={{ color: 'var(--ocean-500)' }}>Show run log ({(d.log as string[]).length} lines)</summary>
          <div className="mt-2 rounded p-2 text-xs font-mono space-y-0.5 overflow-x-auto" style={{ background: 'var(--ocean-800)', color: 'var(--ocean-400)', maxHeight: 200, overflowY: 'auto' }}>
            {(d.log as string[]).map((line, i) => <div key={i}>{line}</div>)}
          </div>
        </details>
      )}

      <p style={{ color: 'var(--ocean-600)' }}>Save file was modified by Transfer Wave and reimported — Players page now reflects updated rosters.</p>
    </div>
  );
}
