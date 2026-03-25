// ─── Pipeline State — persisted to localStorage, survives refresh + tab close ──

export type OutputMode = 'image' | 'video' | 'image+video'
export type StudioMode = 'image' | 'video'
export type RealismMode = 'STANDARD' | 'SOFT' | 'STRICT' | 'RAW'
export type StepStatus = 'idle' | 'queue' | 'running' | 'done' | 'failed'

export interface PipelinePreset {
  id: string
  name: string
  savedAt: number
  intent: IntentFields
  scene: SceneFields
  realism: RealismFields
  pipelinePrompt: string
  outputMode: OutputMode
  studioMode: StudioMode
}

export interface IntentFields {
  objective: string
  audience: string
  platform: string
  outputType: string
}

export interface SceneFields {
  subject: string
  action: string
  environment: string
  timeOfDay: string
  cameraType: string
}

export interface RealismFields {
  mode: RealismMode
  imperfections: {
    skinTexture: boolean
    asymmetry: boolean
    naturalHands: boolean
    slightClutter: boolean
  }
  strictNegatives: {
    noCinematic: boolean
    noDramatic: boolean
    noBeautyLook: boolean
    noPerfectSkin: boolean
  }
  strictBlocks: {
    noCinematic: boolean
    noUnplanned: boolean
  }
}

export interface PipelineStep {
  id: string
  label: string
  icon: string
  status: StepStatus
}

export interface PipelineState {
  activeName: string
  outputMode: OutputMode
  studioMode: StudioMode
  activeModel: 'dalle3' | 'flux'
  intent: IntentFields
  scene: SceneFields
  realism: RealismFields
  finalPrompt: string
  pipelinePrompt: string
  guidanceFileName: string | null
  steps: PipelineStep[]
  presets: PipelinePreset[]
  lastSaved: number | null
}

export const DEFAULT_STEPS: PipelineStep[] = [
  { id: 'creative-strategy',  label: 'Creative Strategy',  icon: '◈', status: 'idle' },
  { id: 'copy-generation',    label: 'AI Copy Generation', icon: '+', status: 'idle' },
  { id: 'validator',          label: 'Validator',          icon: '◎', status: 'idle' },
  { id: 'imagery-generation', label: 'Imagery Generation', icon: '⊡', status: 'idle' },
  { id: 'image-to-video',     label: 'Image to Video',     icon: '▶', status: 'idle' },
  { id: 'asset-library',      label: 'Asset Library',      icon: '≡', status: 'idle' },
  { id: 'quality-assurance',  label: 'Quality Assurance',  icon: '✓', status: 'idle' },
]

export const DEFAULT_STATE: PipelineState = {
  activeName: '',
  outputMode: 'image+video',
  studioMode: 'video',
  activeModel: 'dalle3',
  intent: { objective: '', audience: '', platform: 'Website', outputType: 'Image' },
  scene: { subject: '', action: '', environment: '', timeOfDay: 'afternoon', cameraType: 'smartphone' },
  realism: {
    mode: 'STRICT',
    imperfections: { skinTexture: true, asymmetry: true, naturalHands: true, slightClutter: true },
    strictNegatives: { noCinematic: true, noDramatic: true, noBeautyLook: true, noPerfectSkin: true },
    strictBlocks: { noCinematic: true, noUnplanned: false },
  },
  finalPrompt: '',
  pipelinePrompt: '',
  guidanceFileName: null,
  steps: DEFAULT_STEPS,
  presets: [],
  lastSaved: null,
}

const STORAGE_KEY = 'streamsai:pipeline:state'

export function loadPipelineState(): PipelineState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<PipelineState>
    // Merge with defaults to handle new fields added after save
    return {
      ...DEFAULT_STATE,
      ...parsed,
      intent:   { ...DEFAULT_STATE.intent,   ...(parsed.intent   ?? {}) },
      scene:    { ...DEFAULT_STATE.scene,    ...(parsed.scene    ?? {}) },
      realism:  {
        ...DEFAULT_STATE.realism,
        ...(parsed.realism ?? {}),
        imperfections:  { ...DEFAULT_STATE.realism.imperfections,  ...(parsed.realism?.imperfections  ?? {}) },
        strictNegatives:{ ...DEFAULT_STATE.realism.strictNegatives,...(parsed.realism?.strictNegatives ?? {}) },
        strictBlocks:   { ...DEFAULT_STATE.realism.strictBlocks,   ...(parsed.realism?.strictBlocks   ?? {}) },
      },
      // Reset transient step running states on reload
      steps: (parsed.steps ?? DEFAULT_STEPS).map(s => ({
        ...s,
        status: s.status === 'running' ? 'queue' : s.status,
      })),
      presets: parsed.presets ?? [],
    }
  } catch {
    return DEFAULT_STATE
  }
}

export function savePipelineState(state: PipelineState): PipelineState {
  if (typeof window === 'undefined') return state
  const withTimestamp = { ...state, lastSaved: Date.now() }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(withTimestamp))
  return withTimestamp
}
