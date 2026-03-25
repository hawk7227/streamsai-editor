"use client"

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_STEPS,
  loadPipelineState,
  savePipelineState,
  type IntentFields,
  type OutputMode,
  type PipelinePreset,
  type PipelineState,
  type PipelineStep,
  type RealismFields,
  type RealismMode,
  type SceneFields,
  type StepStatus,
  type StudioMode,
} from '@/lib/pipeline-state'
import {
  createJob,
  runOrchestrator,
  storeJob,
  type GenerationJob,
  type JobMode,
  type JobSource,
} from '@/lib/generation-job'
import { parseGuidanceFile, type ParsedGuidance } from '@/lib/guidance-parser'
import { detectConflicts, applyGuidanceResolution, type Conflict, type ConflictReport, type ConflictSide } from '@/lib/conflict-engine'
import { ConflictModal } from '@/components/pipeline/ConflictModal'

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  bg:        '#02050b',
  surface:   '#06090f',
  rail:      '#04060f',
  border:    'rgba(255,255,255,0.07)',
  borderHi:  'rgba(255,255,255,0.12)',
  accent:    '#44c3a6',
  accentDim: 'rgba(68,195,166,0.15)',
  accentBdr: 'rgba(68,195,166,0.30)',
  text:      '#e8f0ff',
  textDim:   'rgba(255,255,255,0.45)',
  textFaint: 'rgba(255,255,255,0.22)',
  danger:    '#ef4444',
  dangerDim: 'rgba(239,68,68,0.12)',
  dangerBdr: 'rgba(239,68,68,0.30)',
  warn:      '#f59e0b',
  warnDim:   'rgba(245,158,11,0.12)',
  warnBdr:   'rgba(245,158,11,0.30)',
  done:      '#22c55e',
  purple:    '#8b5cf6',
  purpleDim: 'rgba(139,92,246,0.18)',
  purpleBdr: 'rgba(139,92,246,0.35)',
}

const STEP_STATUS_COLOR: Record<StepStatus, string> = {
  idle:    C.textFaint,
  queue:   C.textDim,
  running: C.accent,
  done:    C.done,
  failed:  C.danger,
}
const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  idle:    '',
  queue:   'QUEUE',
  running: 'RUN',
  done:    'DONE',
  failed:  'FAIL',
}

// ─── Auto-save hook (3s debounce) ─────────────────────────────────────────────
function useAutoSave(state: PipelineState, onSaved: (s: PipelineState) => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const saved = savePipelineState(state)
      onSaved(saved)
    }, 3000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [
    state.activeName, state.outputMode, state.studioMode, state.activeModel,
    state.intent, state.scene, state.realism,
    state.finalPrompt, state.pipelinePrompt,
    state.guidanceFileName, state.guidanceContent,
    state.conflictResolutions, state.steps, state.presets,
  ])
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const [state, setState] = useState<PipelineState>(() => loadPipelineState())
  const [saveFlash, setSaveFlash] = useState(false)
  const [nameInput, setNameInput] = useState(() => loadPipelineState().activeName)
  const [presetOpen, setPresetOpen] = useState(false)

  // Guidance doc parsed in memory (not persisted — only metadata persisted)
  const [parsedGuidance, setParsedGuidance] = useState<ParsedGuidance | null>(null)
  const [guidanceParsing, setGuidanceParsing] = useState(false)
  const [guidanceError, setGuidanceError] = useState<string | null>(null)

  // Conflict state
  const [conflictReport, setConflictReport] = useState<ConflictReport | null>(null)
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [pendingJobTrigger, setPendingJobTrigger] = useState<{ source: JobSource; mode: JobMode } | null>(null)

  // Active job display
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-save
  useAutoSave(state, (saved) => {
    setState(saved)
    setSaveFlash(true)
    setTimeout(() => setSaveFlash(false), 1400)
  })

  const update = useCallback((patch: Partial<PipelineState>) => {
    setState(prev => ({ ...prev, ...patch }))
  }, [])

  const updateIntent = useCallback((patch: Partial<IntentFields>) => {
    setState(prev => ({ ...prev, intent: { ...prev.intent, ...patch } }))
  }, [])

  const updateScene = useCallback((patch: Partial<SceneFields>) => {
    setState(prev => ({ ...prev, scene: { ...prev.scene, ...patch } }))
  }, [])

  const updateRealism = useCallback((patch: Partial<RealismFields>) => {
    setState(prev => ({ ...prev, realism: { ...prev.realism, ...patch } }))
  }, [])

  // ── Re-run conflict detection whenever guidance or state changes ──
  useEffect(() => {
    if (!parsedGuidance) { setConflictReport(null); return }
    const report = detectConflicts(state, parsedGuidance, state.conflictResolutions)
    setConflictReport(report)
  }, [parsedGuidance, state.realism, state.intent, state.scene, state.pipelinePrompt, state.finalPrompt, state.conflictResolutions])

  // ── Guidance file upload ──
  const handleGuidanceUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setGuidanceParsing(true)
    setGuidanceError(null)
    try {
      const parsed = await parseGuidanceFile(file)
      setParsedGuidance(parsed)
      // Persist metadata + content to state (survives refresh)
      setState(prev => ({
        ...prev,
        guidanceFileName: parsed.fileName,
        guidanceContent: parsed.rawContent,
        guidanceRuleCount: parsed.rules.length,
        guidanceSummary: parsed.summary,
        conflictResolutions: {}, // reset resolutions when new doc uploaded
      }))
    } catch (err) {
      setGuidanceError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setGuidanceParsing(false)
    }
    // Reset input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const clearGuidance = useCallback(() => {
    setParsedGuidance(null)
    setConflictReport(null)
    update({
      guidanceFileName: null,
      guidanceContent: null,
      guidanceRuleCount: 0,
      guidanceSummary: null,
      conflictResolutions: {},
    })
  }, [update])

  // ── Restore parsed guidance from persisted content on mount ──
  useEffect(() => {
    if (state.guidanceContent && state.guidanceFileName && !parsedGuidance) {
      // Re-hydrate parsed guidance from stored content
      const restored: ParsedGuidance = {
        fileName: state.guidanceFileName,
        fileSize: 0,
        parsedAt: 0,
        rawContent: state.guidanceContent,
        rules: [],
        summary: state.guidanceSummary ?? '',
      }
      // Re-extract rules from stored content
      import('@/lib/guidance-parser').then(({ parseGuidanceFile: _ }) => {
        // Build a synthetic File-like from stored content for rule re-extraction
        const blob = new Blob([state.guidanceContent!], { type: 'text/plain' })
        const syntheticFile = new File([blob], state.guidanceFileName!, { type: 'text/plain' })
        parseGuidanceFile(syntheticFile).then(reparsed => {
          setParsedGuidance({ ...reparsed, fileName: state.guidanceFileName!, summary: state.guidanceSummary ?? reparsed.summary })
        }).catch(() => {
          setParsedGuidance(restored)
        })
      })
    }
  }, []) // only on mount

  // ── Conflict resolution handlers ──
  const handleResolve = useCallback((conflictId: string, side: ConflictSide) => {
    setState(prev => {
      const newResolutions = { ...prev.conflictResolutions, [conflictId]: side }
      // If guidance wins, also patch state to match
      if (side === 'guidance' && conflictReport) {
        const conflict = conflictReport.conflicts.find(c => c.id === conflictId)
        if (conflict) {
          const patch = applyGuidanceResolution(prev, conflict)
          return { ...prev, ...patch, conflictResolutions: newResolutions }
        }
      }
      return { ...prev, conflictResolutions: newResolutions }
    })
  }, [conflictReport])

  const handleResolveAll = useCallback((side: ConflictSide) => {
    if (!conflictReport) return
    setState(prev => {
      let next = { ...prev }
      const newResolutions = { ...prev.conflictResolutions }
      for (const conflict of conflictReport.conflicts) {
        newResolutions[conflict.id] = side
        if (side === 'guidance') {
          const patch = applyGuidanceResolution(next, conflict)
          next = { ...next, ...patch }
        }
      }
      return { ...next, conflictResolutions: newResolutions }
    })
  }, [conflictReport])

  // ── SINGLE GENERATION ENTRY POINT ─────────────────────────────────────────
  // ALL buttons call this. No exceptions.
  const triggerGeneration = useCallback((source: JobSource, mode: JobMode) => {
    // Gate: block if guidance loaded and hard conflicts unresolved
    if (conflictReport && !conflictReport.canRun) {
      setPendingJobTrigger({ source, mode })
      setShowConflictModal(true)
      return
    }
    // Soft conflicts: show modal but allow run
    if (conflictReport && conflictReport.unresolvedCount > 0) {
      setPendingJobTrigger({ source, mode })
      setShowConflictModal(true)
      return
    }
    executeJob(source, mode)
  }, [conflictReport])

  const executeJob = useCallback((source: JobSource, mode: JobMode) => {
    const realismMode = state.realism.mode === 'STRICT' || state.realism.mode === 'RAW'
      ? 'strict' : 'balanced'

    const outputType = state.outputMode === 'image' ? 'image'
      : state.outputMode === 'video' ? 'video' : 'image_video'

    const job = createJob(source, mode, {
      prompt: state.pipelinePrompt || state.finalPrompt,
      realismMode,
      outputType,
    })

    storeJob(job)
    setActiveJob(job)
    update({ activeJobId: job.jobId })

    // Reset step display
    setState(prev => ({
      ...prev,
      steps: prev.steps.map(s => ({ ...s, status: 'queue' as StepStatus })),
    }))

    runOrchestrator(
      job,
      (updated) => {
        setActiveJob(updated)
        storeJob(updated)
        // Map orchestrator step to sidebar steps
        syncStepsFromJob(updated)
      },
      (completed) => {
        setActiveJob(completed)
        storeJob(completed)
        setState(prev => ({
          ...prev,
          steps: prev.steps.map(s => ({ ...s, status: 'done' as StepStatus })),
          activeJobId: null,
        }))
      },
      (rejected) => {
        setActiveJob(rejected)
        storeJob(rejected)
        setState(prev => ({
          ...prev,
          steps: prev.steps.map(s => ({
            ...s,
            status: s.status === 'running' ? 'failed' as StepStatus : s.status,
          })),
          activeJobId: null,
        }))
      }
    )
  }, [state, update])

  // Map orchestrator step names to sidebar pipeline steps
  const syncStepsFromJob = useCallback((job: GenerationJob) => {
    setState(prev => ({
      ...prev,
      steps: prev.steps.map((s, i) => {
        const pct = (job.stepIndex / Math.max(job.steps.length - 1, 1))
        const stepPct = i / Math.max(prev.steps.length - 1, 1)
        if (stepPct < pct) return { ...s, status: 'done' as StepStatus }
        if (Math.abs(stepPct - pct) < 0.15) return { ...s, status: 'running' as StepStatus }
        return { ...s, status: 'queue' as StepStatus }
      }),
    }))
  }, [])

  // ── Preset handlers ──
  const savePreset = useCallback(() => {
    const name = nameInput.trim()
    if (!name) return
    const preset: PipelinePreset = {
      id: `preset-${Date.now()}`,
      name,
      savedAt: Date.now(),
      intent: state.intent,
      scene: state.scene,
      realism: state.realism,
      pipelinePrompt: state.pipelinePrompt,
      outputMode: state.outputMode,
      studioMode: state.studioMode,
    }
    setState(prev => ({
      ...prev,
      activeName: name,
      presets: [preset, ...prev.presets.filter(p => p.name !== name)].slice(0, 20),
    }))
    setPresetOpen(false)
  }, [nameInput, state])

  const loadPreset = useCallback((preset: PipelinePreset) => {
    setState(prev => ({
      ...prev,
      activeName: preset.name,
      intent: preset.intent,
      scene: preset.scene,
      realism: preset.realism,
      pipelinePrompt: preset.pipelinePrompt,
      outputMode: preset.outputMode,
      studioMode: preset.studioMode,
    }))
    setNameInput(preset.name)
    setPresetOpen(false)
  }, [])

  return (
    <div style={{ display: 'flex', height: '100dvh', width: '100%', background: C.bg, overflow: 'hidden', fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* Conflict Modal */}
      {showConflictModal && conflictReport && parsedGuidance && (
        <ConflictModal
          report={conflictReport}
          guidance={parsedGuidance}
          onResolve={handleResolve}
          onResolveAll={handleResolveAll}
          onDismiss={() => { setShowConflictModal(false); setPendingJobTrigger(null) }}
          onRunAnyway={conflictReport.canRun && pendingJobTrigger ? () => {
            setShowConflictModal(false)
            executeJob(pendingJobTrigger.source, pendingJobTrigger.mode)
            setPendingJobTrigger(null)
          } : undefined}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        studioMode={state.studioMode}
        onStudioMode={mode => update({ studioMode: mode })}
        steps={state.steps}
        lastSaved={state.lastSaved}
        saveFlash={saveFlash}
        activeJob={activeJob}
        conflictCount={conflictReport?.unresolvedCount ?? 0}
        hardConflictCount={conflictReport?.hardUnresolvedCount ?? 0}
        onShowConflicts={() => setShowConflictModal(true)}
      />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Top bar */}
        <TopBar
          nameInput={nameInput}
          onNameInput={setNameInput}
          onSavePreset={savePreset}
          presets={state.presets}
          presetOpen={presetOpen}
          onPresetOpen={() => setPresetOpen(v => !v)}
          onLoadPreset={loadPreset}
          outputMode={state.outputMode}
          onOutputMode={mode => update({ outputMode: mode as OutputMode })}
          activeModel={state.activeModel}
          onModel={m => update({ activeModel: m as PipelineState['activeModel'] })}
          onRun={() => triggerGeneration('run_pipeline_button', 'full_pipeline')}
          onImagesOnly={() => triggerGeneration('images_only_button', 'image_only_pipeline')}
          conflictCount={conflictReport?.unresolvedCount ?? 0}
          hardConflictCount={conflictReport?.hardUnresolvedCount ?? 0}
          canRun={conflictReport?.canRun ?? true}
          onShowConflicts={() => setShowConflictModal(true)}
        />

        {/* Active job status bar */}
        {activeJob && activeJob.status !== 'approved' && activeJob.status !== 'failed' && (
          <JobStatusBar job={activeJob} />
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 40px' }}>
          <Section label="Creative Setup" sublabel="Required Before Run">

            {/* Studio tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
              {(['video', 'image'] as StudioMode[]).map(m => (
                <button key={m} onClick={() => update({ studioMode: m })} style={tabStyle(state.studioMode === m)}>
                  {m === 'video' ? 'Video Studio' : 'Image Studio'}
                </button>
              ))}
            </div>

            {/* 1. Intent */}
            <FieldGroup label="1. Intent">
              <Field label="Objective">
                <Input value={state.intent.objective} onChange={v => updateIntent({ objective: v })} placeholder="e.g. product awareness ad" />
              </Field>
              <Field label="Audience">
                <Input value={state.intent.audience} onChange={v => updateIntent({ audience: v })} placeholder="e.g. women 25–40" />
              </Field>
              <TwoCol>
                <Field label="Platform">
                  <Select value={state.intent.platform} onChange={v => updateIntent({ platform: v })} options={['Website','Instagram','TikTok','YouTube','Facebook','LinkedIn']} />
                </Field>
                <Field label="Output Type">
                  <Select value={state.intent.outputType} onChange={v => updateIntent({ outputType: v })} options={['Image','Video','Both']} />
                </Field>
              </TwoCol>
            </FieldGroup>

            {/* 2. Scene */}
            <FieldGroup label="2. Scene">
              <Field label="Subject">
                <Input value={state.scene.subject} onChange={v => updateScene({ subject: v })} placeholder="e.g. woman in her 30s, casual" />
              </Field>
              <Field label="Action">
                <Input value={state.scene.action} onChange={v => updateScene({ action: v })} placeholder="e.g. texting on couch" />
              </Field>
              <Field label="Environment">
                <Select value={state.scene.environment} onChange={v => updateScene({ environment: v })}
                  options={['slightly messy living room','clean modern kitchen','outdoor park','coffee shop','office','bedroom','gym']} allowCustom />
              </Field>
              <TwoCol>
                <Field label="Time of Day">
                  <Select value={state.scene.timeOfDay} onChange={v => updateScene({ timeOfDay: v })} options={['morning','afternoon','evening','night','golden hour']} />
                </Field>
                <Field label="Camera Type">
                  <Select value={state.scene.cameraType} onChange={v => updateScene({ cameraType: v })} options={['smartphone','dslr','cinema','drone','action cam','35mm film']} />
                </Field>
              </TwoCol>
            </FieldGroup>

            {/* 3. Final Generation Prompt */}
            <FieldGroup label="3. Final Generation Prompt">
              <textarea
                value={state.finalPrompt}
                onChange={e => update({ finalPrompt: e.target.value })}
                placeholder="Assembled prompt appears here — or type manually to override…"
                rows={5}
                style={textareaStyle}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <SmallBtn>Generate Ideas</SmallBtn>
                <SmallBtn>Apply Template</SmallBtn>
                <SmallBtn accent>Make More Real</SmallBtn>
              </div>
            </FieldGroup>

            {/* 4. Realism Control */}
            <FieldGroup label="4. Realism Control">
              <Field label="Realism Mode">
                <Select value={state.realism.mode} onChange={v => updateRealism({ mode: v as RealismMode })}
                  options={['STANDARD','SOFT','STRICT','RAW']} />
              </Field>
              <CheckGroup label="Imperfections">
                {([
                  ['skinTexture','skin texture'],
                  ['asymmetry','asymmetry'],
                  ['naturalHands','natural hands'],
                  ['slightClutter','slight clutter'],
                ] as [keyof RealismFields['imperfections'], string][]).map(([key, lbl]) => (
                  <CheckRow key={key} label={lbl}
                    checked={state.realism.imperfections[key]}
                    onChange={v => updateRealism({ imperfections: { ...state.realism.imperfections, [key]: v } })}
                  />
                ))}
              </CheckGroup>
              <CheckGroup label="Strict Negatives">
                {([
                  ['noCinematic','no cinematic'],
                  ['noDramatic','no dramatic'],
                  ['noBeautyLook','no beauty look'],
                  ['noPerfectSkin','no perfect skin'],
                ] as [keyof RealismFields['strictNegatives'], string][]).map(([key, lbl]) => (
                  <CheckRow key={key} label={lbl}
                    checked={state.realism.strictNegatives[key]}
                    onChange={v => updateRealism({ strictNegatives: { ...state.realism.strictNegatives, [key]: v } })}
                  />
                ))}
              </CheckGroup>
              <CheckGroup label="Strict Blocks">
                <CheckRow label="no cinematic"
                  checked={state.realism.strictBlocks.noCinematic}
                  onChange={v => updateRealism({ strictBlocks: { ...state.realism.strictBlocks, noCinematic: v } })}
                />
                <CheckRow label="no unplanned"
                  checked={state.realism.strictBlocks.noUnplanned}
                  onChange={v => updateRealism({ strictBlocks: { ...state.realism.strictBlocks, noUnplanned: v } })}
                />
              </CheckGroup>
            </FieldGroup>

            {/* Run Controls + Guidance Upload */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
              <button
                onClick={() => triggerGeneration('run_pipeline_button', 'full_pipeline')}
                disabled={!!(conflictReport && conflictReport.hardUnresolvedCount > 0)}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: (conflictReport && conflictReport.hardUnresolvedCount > 0)
                    ? 'rgba(255,255,255,0.08)' : C.accent,
                  color: (conflictReport && conflictReport.hardUnresolvedCount > 0) ? C.textDim : '#000',
                  fontSize: 13, fontWeight: 700, cursor: (conflictReport && conflictReport.hardUnresolvedCount > 0) ? 'not-allowed' : 'pointer',
                }}
              >
                Run Pipeline
              </button>

              {/* Queue Pipeline Job (prompt panel trigger) */}
              <button
                onClick={() => triggerGeneration('prompt_panel', 'full_pipeline')}
                disabled={!state.pipelinePrompt.trim()}
                style={{
                  padding: '10px 16px', borderRadius: 8,
                  border: `1px solid ${state.pipelinePrompt.trim() ? C.accentBdr : C.border}`,
                  background: state.pipelinePrompt.trim() ? C.accentDim : 'transparent',
                  color: state.pipelinePrompt.trim() ? C.accent : C.textDim,
                  fontSize: 12, fontWeight: 600,
                  cursor: state.pipelinePrompt.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Queue Pipeline Job
              </button>

              {/* Run Image Pipeline (was "Images Only") */}
              <button
                onClick={() => triggerGeneration('images_only_button', 'image_only_pipeline')}
                style={{
                  padding: '10px 16px', borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: 'transparent',
                  color: C.textDim, fontSize: 12, cursor: 'pointer',
                }}
              >
                Run Image Pipeline
              </button>

              {/* Guidance upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={guidanceParsing}
                style={{
                  padding: '10px 16px', borderRadius: 8,
                  border: `1px solid ${state.guidanceFileName ? C.purpleBdr : C.border}`,
                  background: state.guidanceFileName ? C.purpleDim : 'transparent',
                  color: state.guidanceFileName ? '#c4b5fd' : C.textDim,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <span style={{ fontSize: 14 }}>↑</span>
                {guidanceParsing
                  ? 'Parsing…'
                  : state.guidanceFileName
                    ? state.guidanceFileName
                    : 'Upload Rule / Guidance'}
              </button>
              {state.guidanceFileName && (
                <button onClick={clearGuidance} style={{
                  background: 'transparent', border: 'none',
                  color: C.textDim, fontSize: 18, cursor: 'pointer', lineHeight: 1,
                }}>×</button>
              )}
              <input
                ref={fileInputRef} type="file"
                accept=".txt,.md,.pdf,.json"
                style={{ display: 'none' }}
                onChange={handleGuidanceUpload}
              />
            </div>

            {/* Guidance parse error */}
            {guidanceError && (
              <div style={{
                marginBottom: 12, padding: '10px 14px', borderRadius: 8,
                background: C.dangerDim, border: `1px solid ${C.dangerBdr}`,
                color: C.danger, fontSize: 12,
              }}>
                ⚠ {guidanceError}
              </div>
            )}

            {/* Guidance summary + conflict badge */}
            {state.guidanceSummary && (
              <div style={{
                marginBottom: 16, padding: '12px 14px', borderRadius: 10,
                background: 'rgba(139,92,246,0.08)', border: `1px solid ${C.purpleBdr}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#c4b5fd', letterSpacing: '0.04em' }}>
                    GUIDANCE LOADED
                  </span>
                  {conflictReport && conflictReport.conflicts.length > 0 && (
                    <button onClick={() => setShowConflictModal(true)} style={{
                      padding: '3px 10px', borderRadius: 999,
                      border: `1px solid ${conflictReport.hardUnresolvedCount > 0 ? C.dangerBdr : C.warnBdr}`,
                      background: conflictReport.hardUnresolvedCount > 0 ? C.dangerDim : C.warnDim,
                      color: conflictReport.hardUnresolvedCount > 0 ? C.danger : C.warn,
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    } as React.CSSProperties}>
                      {conflictReport.unresolvedCount > 0
                        ? `${conflictReport.unresolvedCount} Conflicts — Review`
                        : '✓ All Resolved'}
                    </button>
                  )}
                  {conflictReport && conflictReport.conflicts.length === 0 && (
                    <span style={{ fontSize: 10, color: C.done }}>✓ No conflicts</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.textDim }}>{state.guidanceSummary}</div>
              </div>
            )}

            {/* Pipeline Prompt — job start input */}
            <FieldGroup label="Pipeline Prompt" sublabel="Type your job instruction to start a pipeline run">
              <textarea
                value={state.pipelinePrompt}
                onChange={e => update({ pipelinePrompt: e.target.value })}
                placeholder="Describe what you want the pipeline to generate…"
                rows={4}
                style={{
                  ...textareaStyle,
                  borderColor: state.pipelinePrompt ? C.accentBdr : undefined,
                }}
              />
              {state.pipelinePrompt.trim() && (
                <button
                  onClick={() => triggerGeneration('prompt_panel', 'full_pipeline')}
                  style={{
                    alignSelf: 'flex-end', padding: '7px 16px', borderRadius: 8,
                    border: 'none', background: C.accent, color: '#000',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Queue Pipeline Job →
                </button>
              )}
            </FieldGroup>

          </Section>
        </div>
      </div>
    </div>
  )
}

// ─── Job Status Bar ────────────────────────────────────────────────────────────
function JobStatusBar({ job }: { job: GenerationJob }) {
  const isRejected = job.status === 'rejected' || job.status === 'failed'
  const isRetrying = job.status === 'retrying'

  return (
    <div style={{
      padding: '8px 20px', flexShrink: 0,
      background: isRejected ? 'rgba(239,68,68,0.08)' : isRetrying ? 'rgba(245,158,11,0.08)' : 'rgba(68,195,166,0.06)',
      borderBottom: `1px solid ${isRejected ? 'rgba(239,68,68,0.2)' : isRetrying ? 'rgba(245,158,11,0.2)' : 'rgba(68,195,166,0.15)'}`,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {/* Animated dot */}
      <div style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: isRejected ? '#ef4444' : isRetrying ? '#f59e0b' : '#44c3a6',
        animation: !isRejected ? 'pulse 1.4s ease-in-out infinite' : 'none',
      }} />

      {/* Source badge */}
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
        padding: '2px 6px', borderRadius: 4,
        background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
      }}>
        {job.source.replace(/_/g, ' ').toUpperCase()}
      </span>

      {/* Mode badge */}
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
        padding: '2px 6px', borderRadius: 4,
        background: 'rgba(139,92,246,0.12)', color: '#c4b5fd',
      }}>
        {job.mode.replace(/_/g, ' ').toUpperCase()}
      </span>

      {/* Current step */}
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
        {isRejected ? '✗ ' : isRetrying ? '↺ ' : '→ '}
        {job.currentStep ?? job.status}
      </span>

      {/* Step progress */}
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
        {job.stepIndex + 1} / {job.steps.length}
      </span>

      {/* QC fail reason */}
      {job.qc.status === 'fail' && job.qc.reason && (
        <span style={{ fontSize: 10, color: '#f59e0b' }}>{job.qc.reason}</span>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ studioMode, onStudioMode, steps, lastSaved, saveFlash, activeJob, conflictCount, hardConflictCount, onShowConflicts }: {
  studioMode: StudioMode
  onStudioMode: (m: StudioMode) => void
  steps: PipelineStep[]
  lastSaved: number | null
  saveFlash: boolean
  activeJob: GenerationJob | null
  conflictCount: number
  hardConflictCount: number
  onShowConflicts: () => void
}) {
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <div style={{
      width: 200, flexShrink: 0,
      background: C.rail,
      borderRight: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Branding */}
      <div style={{ padding: '16px 14px 12px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#44c3a6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>S</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>StreamsAI</div>
            <div style={{ fontSize: 10, color: C.textFaint, letterSpacing: '0.06em' }}>MEDIA GENERATOR</div>
          </div>
        </div>
      </div>

      {/* Studio Toggle */}
      <div style={{ padding: '10px 12px 8px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, gap: 2 }}>
          {(['image','video'] as StudioMode[]).map(m => (
            <button key={m} onClick={() => onStudioMode(m)} style={{
              flex: 1, padding: '5px 0', borderRadius: 6, border: 'none',
              fontSize: 11, fontWeight: studioMode === m ? 700 : 400,
              cursor: 'pointer',
              background: studioMode === m ? C.accentDim : 'transparent',
              color: studioMode === m ? C.accent : C.textDim,
              transition: 'all 160ms ease',
            }}>
              {m === 'image' ? 'Image' : 'Video'}
            </button>
          ))}
        </div>
      </div>

      {/* Conflict badge */}
      {conflictCount > 0 && (
        <button onClick={onShowConflicts} style={{
          margin: '8px 10px 0', padding: '7px 10px', borderRadius: 8, border: 'none',
          background: hardConflictCount > 0 ? C.dangerDim : C.warnDim,
          color: hardConflictCount > 0 ? C.danger : C.warn,
          fontSize: 11, fontWeight: 700, cursor: 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 6,
          borderWidth: 1, borderStyle: 'solid',
          borderColor: hardConflictCount > 0 ? C.dangerBdr : C.warnBdr,
        }}>
          <span>⚠</span>
          <span>{conflictCount} Conflict{conflictCount > 1 ? 's' : ''}</span>
          {hardConflictCount > 0 && <span style={{ fontSize: 9, marginLeft: 'auto' }}>BLOCKS RUN</span>}
        </button>
      )}

      {/* More Tools */}
      <div style={{ borderBottom: `1px solid ${C.border}`, marginTop: conflictCount > 0 ? 8 : 0 }}>
        <button onClick={() => setMoreOpen(v => !v)} style={{
          width: '100%', padding: '10px 14px',
          background: 'transparent', border: 'none',
          color: C.textDim, fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>More tools</span>
          <span style={{ fontSize: 10, transition: 'transform 160ms ease', display: 'inline-block', transform: moreOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
        </button>
        {moreOpen && (
          <div style={{ padding: '4px 12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {['Image Studio','Video Studio','Research','Codex','Assets'].map(t => (
              <button key={t} style={{
                width: '100%', padding: '7px 10px', borderRadius: 7,
                background: 'transparent', border: 'none',
                color: C.textDim, fontSize: 11, cursor: 'pointer', textAlign: 'left',
              }}>{t}</button>
            ))}
          </div>
        )}
      </div>

      {/* Pipeline Steps */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
        <div style={{ fontSize: 9, color: C.textFaint, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 14px 8px', fontWeight: 600 }}>
          Pipeline Steps
        </div>
        {steps.map(step => {
          const color = STEP_STATUS_COLOR[step.status]
          const isRunning = step.status === 'running'
          return (
            <div key={step.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px',
              background: isRunning ? C.accentDim : 'transparent',
              borderLeft: isRunning ? `2px solid ${C.accent}` : '2px solid transparent',
              transition: 'background 200ms ease',
            }}>
              <span style={{ fontSize: 13, color, minWidth: 16, textAlign: 'center' }}>{step.icon}</span>
              <span style={{ fontSize: 11, color: isRunning ? C.text : C.textDim, flex: 1, fontWeight: isRunning ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {step.label}
              </span>
              {step.status !== 'idle' && (
                <span style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: '0.06em',
                  color, background: `${color}18`,
                  padding: '2px 5px', borderRadius: 4,
                }}>
                  {STEP_STATUS_LABEL[step.status]}
                </span>
              )}
            </div>
          )
        })}
        <button style={{
          width: '100%', padding: '8px 14px', background: 'transparent', border: 'none',
          color: C.textFaint, fontSize: 11, cursor: 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 14 }}>+</span> Add Step
        </button>
      </div>

      {/* Auto-save indicator */}
      <div style={{
        padding: '8px 14px', borderTop: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 6,
        opacity: saveFlash ? 1 : 0.35, transition: 'opacity 400ms ease',
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: saveFlash ? C.done : C.textFaint, transition: 'background 400ms ease' }} />
        <span style={{ fontSize: 9, color: saveFlash ? C.done : C.textFaint, letterSpacing: '0.06em' }}>
          {saveFlash ? 'SAVED' : lastSaved ? `SAVED ${new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'AUTO-SAVE 3s'}
        </span>
      </div>
    </div>
  )
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────
function TopBar({ nameInput, onNameInput, onSavePreset, presets, presetOpen, onPresetOpen, onLoadPreset, outputMode, onOutputMode, activeModel, onModel, onRun, onImagesOnly, conflictCount, hardConflictCount, canRun, onShowConflicts }: {
  nameInput: string
  onNameInput: (v: string) => void
  onSavePreset: () => void
  presets: PipelinePreset[]
  presetOpen: boolean
  onPresetOpen: () => void
  onLoadPreset: (p: PipelinePreset) => void
  outputMode: OutputMode
  onOutputMode: (m: string) => void
  activeModel: string
  onModel: (m: string) => void
  onRun: () => void
  onImagesOnly: () => void
  conflictCount: number
  hardConflictCount: number
  canRun: boolean
  onShowConflicts: () => void
}) {
  return (
    <div style={{
      height: 52, flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '0 16px',
      background: C.surface,
      borderBottom: `1px solid ${C.border}`,
    }}>
      {/* Name tag */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          value={nameInput}
          onChange={e => onNameInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSavePreset()}
          placeholder="Name this pipeline…"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${C.borderHi}`,
            borderRight: 'none', borderRadius: '8px 0 0 8px',
            color: C.text, fontSize: 12, padding: '6px 10px',
            outline: 'none', width: 160,
          }}
        />
        <button onClick={onSavePreset} style={{
          padding: '6px 9px',
          background: 'rgba(255,255,255,0.07)',
          border: `1px solid ${C.borderHi}`, borderRight: 'none',
          color: C.accent, fontSize: 11, cursor: 'pointer', fontWeight: 700,
        }}>Save</button>
        <button onClick={onPresetOpen} style={{
          padding: '6px 8px',
          background: 'rgba(255,255,255,0.07)',
          border: `1px solid ${C.borderHi}`,
          borderRadius: '0 8px 8px 0',
          color: C.textDim, fontSize: 10, cursor: 'pointer',
        }}>▼</button>
        {presetOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100,
            background: '#0d1420', border: `1px solid ${C.borderHi}`,
            borderRadius: 10, minWidth: 220, boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}>
            {presets.length === 0
              ? <div style={{ padding: '12px 14px', fontSize: 12, color: C.textDim }}>No saved presets yet</div>
              : presets.map(p => (
                <button key={p.id} onClick={() => onLoadPreset(p)} style={{
                  width: '100%', padding: '9px 14px', background: 'transparent',
                  border: 'none', borderBottom: `1px solid ${C.border}`,
                  color: C.text, fontSize: 12, cursor: 'pointer', textAlign: 'left',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span>{p.name}</span>
                  <span style={{ fontSize: 10, color: C.textFaint }}>{new Date(p.savedAt).toLocaleDateString()}</span>
                </button>
              ))
            }
          </div>
        )}
      </div>

      <Divider />

      <PillGroup
        options={[{v:'manual',label:'Manual'},{v:'auto',label:'Auto'},{v:'scheduled',label:'Scheduled'}]}
        value={'manual'} onChange={() => {}} prefix="Mode:"
      />

      <Divider />

      <PillGroup
        options={[{v:'image',label:'Image'},{v:'video',label:'Video'},{v:'image+video',label:'Image + Video'}]}
        value={outputMode} onChange={onOutputMode} prefix="Output:"
      />

      <Divider />

      {[{v:'dalle3',label:'DALL-E 3'},{v:'flux',label:'Flux (fal.ai)'}].map(m => (
        <button key={m.v} onClick={() => onModel(m.v)} style={{
          padding: '5px 10px', borderRadius: 999,
          border: `1px solid ${activeModel === m.v ? C.accentBdr : C.border}`,
          background: activeModel === m.v ? C.accentDim : 'transparent',
          color: activeModel === m.v ? C.accent : C.textDim,
          fontSize: 11, fontWeight: activeModel === m.v ? 700 : 400,
          cursor: 'pointer', transition: 'all 150ms ease',
        }}>{m.label}</button>
      ))}

      <button style={{
        padding: '5px 10px', borderRadius: 999,
        border: 'rgba(245,158,11,0.3) 1px solid',
        background: 'rgba(245,158,11,0.1)', color: C.warn, fontSize: 11, cursor: 'pointer',
      }}>Diagnose + Test</button>

      <div style={{ flex: 1 }} />

      {/* Conflict indicator */}
      {conflictCount > 0 && (
        <button onClick={onShowConflicts} style={{
          padding: '5px 10px', borderRadius: 7,
          border: `1px solid ${hardConflictCount > 0 ? C.dangerBdr : C.warnBdr}`,
          background: hardConflictCount > 0 ? C.dangerDim : C.warnDim,
          color: hardConflictCount > 0 ? C.danger : C.warn,
          fontSize: 11, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span>⚠</span>{conflictCount} Conflict{conflictCount > 1 ? 's' : ''}
        </button>
      )}

      {/* Run Image Pipeline (was "Images Only") */}
      <button onClick={onImagesOnly} style={{
        padding: '5px 10px', borderRadius: 7,
        border: `1px solid ${C.border}`, background: 'transparent',
        color: C.textDim, fontSize: 11, cursor: 'pointer',
      }}>Run Image Pipeline</button>

      {/* Run Full Governance Pipeline */}
      <button
        onClick={onRun}
        disabled={!canRun}
        style={{
          padding: '7px 14px', borderRadius: 8, border: 'none',
          background: canRun
            ? 'linear-gradient(135deg,#8b5cf6,#6366f1)'
            : 'rgba(255,255,255,0.08)',
          color: canRun ? '#fff' : C.textDim,
          fontSize: 12, fontWeight: 700,
          cursor: canRun ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: canRun ? '0 4px 14px rgba(139,92,246,0.35)' : 'none',
          transition: 'all 200ms ease',
        }}
      >
        <span>▶</span> Run Full Governance Pipeline
      </button>
    </div>
  )
}

// ─── Shared atoms ──────────────────────────────────────────────────────────────
function Section({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: C.textFaint, marginTop: 2 }}>{sublabel}</div>}
      </div>
      {children}
    </div>
  )
}

function FieldGroup({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, color: C.textDim, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: sublabel ? 2 : 10 }}>{label}</div>
      {sublabel && <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 10 }}>{sublabel}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px' }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 12, color: C.textDim, minWidth: 100, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

function TwoCol({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, padding: '7px 10px', outline: 'none', boxSizing: 'border-box' }} />
  )
}

function Select({ value, onChange, options, allowCustom }: { value: string; onChange: (v: string) => void; options: string[]; allowCustom?: boolean }) {
  const allOptions = allowCustom && !options.includes(value) ? [...options, value] : options
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', background: '#0a1020', border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, padding: '7px 10px', outline: 'none', cursor: 'pointer' }}>
      {allOptions.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function CheckGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.textFaint, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>{children}</div>
    </div>
  )
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', padding: '3px 0' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: C.accent, width: 13, height: 13, cursor: 'pointer' }} />
      <span style={{ fontSize: 11, color: checked ? C.text : C.textDim }}>{label}</span>
    </label>
  )
}

function SmallBtn({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <button style={{
      padding: '6px 12px', borderRadius: 7,
      border: `1px solid ${accent ? C.accentBdr : C.border}`,
      background: accent ? C.accentDim : 'rgba(255,255,255,0.04)',
      color: accent ? C.accent : C.textDim, fontSize: 11, cursor: 'pointer',
    }}>{children}</button>
  )
}

function Divider() {
  return <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />
}

function PillGroup({ options, value, onChange, prefix }: { options: {v: string; label: string}[]; value: string; onChange: (v: string) => void; prefix?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {prefix && <span style={{ fontSize: 10, color: C.textFaint, whiteSpace: 'nowrap' }}>{prefix}</span>}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 7, padding: 2, gap: 1 }}>
        {options.map(o => (
          <button key={o.v} onClick={() => onChange(o.v)} style={{
            padding: '4px 9px', borderRadius: 5, border: 'none',
            background: value === o.v ? C.accentDim : 'transparent',
            color: value === o.v ? C.accent : C.textDim,
            fontSize: 10, fontWeight: value === o.v ? 700 : 400,
            cursor: 'pointer', transition: 'all 150ms ease',
          }}>{o.label}</button>
        ))}
      </div>
    </div>
  )
}

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 7,
  border: `1px solid ${active ? C.accentBdr : C.border}`,
  background: active ? C.accentDim : 'transparent',
  color: active ? C.accent : C.textDim,
  fontSize: 12, fontWeight: active ? 700 : 400,
  cursor: 'pointer', transition: 'all 160ms ease',
})

const textareaStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)',
  border: `1px solid rgba(255,255,255,0.07)`, borderRadius: 8,
  color: '#e8f0ff', fontSize: 12, padding: '10px 12px',
  outline: 'none', resize: 'vertical', lineHeight: 1.6,
  fontFamily: 'inherit', boxSizing: 'border-box',
}
