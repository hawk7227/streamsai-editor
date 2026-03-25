// ─── Generation Job Schema ─────────────────────────────────────────────────────
// ALL generation triggers must create a GenerationJob and pass it to
// runOrchestrator(). No UI button may call provider APIs directly.

export type JobSource =
  | 'prompt_panel'
  | 'images_only_button'
  | 'concept_img_button'
  | 'concept_vid_button'
  | 'run_pipeline_button'
  | 'run_concept_image'

export type JobMode =
  | 'full_pipeline'
  | 'image_only_pipeline'
  | 'video_only_pipeline'
  | 'concept_image_pipeline'

export type JobStatus =
  | 'created'
  | 'normalizing'
  | 'compiling_realism'
  | 'validating'
  | 'generating'
  | 'qc'
  | 'approved'
  | 'rejected'
  | 'retrying'
  | 'failed'
  | 'blocked_conflicts'

export type QCStatus = 'pending' | 'pass' | 'fail'

// ─── Step definitions per mode ────────────────────────────────────────────────
// Steps that run for each mode. All modes run realism + validator + QC.
// The only difference is which generation steps are included.
export const MODE_STEPS: Record<JobMode, string[]> = {
  full_pipeline: [
    'Strategy',
    'Normalize',
    'Realism Compile',
    'Validator',
    'Image Gen',
    'Video Gen',
    'QC',
    'Approve',
  ],
  image_only_pipeline: [
    'Normalize',
    'Build Scene',
    'Realism Compile',
    'Validator',
    'Image Gen ×3',
    'QC',
    'Select Best',
    'Attach',
  ],
  video_only_pipeline: [
    'Normalize',
    'Realism Compile',
    'Validator',
    'Video Gen',
    'QC',
    'Attach',
  ],
  concept_image_pipeline: [
    'Lock Concept',
    'Realism Compile',
    'Validator',
    'Image Gen ×3',
    'QC',
    'Attach to Card',
  ],
}

export interface GenerationJob {
  jobId: string
  createdAt: number
  source: JobSource
  mode: JobMode
  conceptId?: string
  prompt?: string
  references?: string[]
  realismMode: 'strict' | 'balanced'
  outputType: 'image' | 'video' | 'image_video'
  // Runtime state
  status: JobStatus
  currentStep: string | null
  stepIndex: number
  steps: string[]
  qc: { status: QCStatus; reason?: string }
  result?: { url: string; type: 'image' | 'video' }
  error?: string
  retryCount: number
}

export function createJob(
  source: JobSource,
  mode: JobMode,
  opts: {
    prompt?: string
    conceptId?: string
    references?: string[]
    realismMode?: 'strict' | 'balanced'
    outputType?: 'image' | 'video' | 'image_video'
  }
): GenerationJob {
  const steps = MODE_STEPS[mode]
  return {
    jobId: `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    source,
    mode,
    conceptId: opts.conceptId,
    prompt: opts.prompt,
    references: opts.references ?? [],
    realismMode: opts.realismMode ?? 'strict',
    outputType: opts.outputType ?? 'image',
    status: 'created',
    currentStep: null,
    stepIndex: 0,
    steps,
    qc: { status: 'pending' },
    retryCount: 0,
  }
}

// ─── Orchestrator ──────────────────────────────────────────────────────────────
// Client-side orchestrator simulates the pipeline steps.
// In production this would POST to /api/generations and stream step updates.
// The contract: NO provider is called outside this function.

export type StepCallback = (job: GenerationJob) => void

export async function runOrchestrator(
  job: GenerationJob,
  onStep: StepCallback,
  onComplete: (job: GenerationJob) => void,
  onReject: (job: GenerationJob) => void
): Promise<void> {
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

  let current = { ...job, status: 'normalizing' as JobStatus }

  for (let i = 0; i < current.steps.length; i++) {
    const step = current.steps[i]
    current = {
      ...current,
      status: stepToStatus(step),
      currentStep: step,
      stepIndex: i,
    }
    onStep(current)
    await delay(1400)

    // QC gate — nothing surfaces without pass
    if (step.startsWith('QC')) {
      // Simulate QC: in production this calls a real QC endpoint
      const qcPassed = simulateQC(current)
      if (!qcPassed && current.retryCount < 2) {
        current = {
          ...current,
          status: 'retrying',
          currentStep: 'Retrying…',
          qc: { status: 'fail', reason: 'Realism score below threshold' },
          retryCount: current.retryCount + 1,
        }
        onStep(current)
        await delay(1200)
        // Retry generation step
        i = i - 2 // back to gen step
        continue
      }
      if (!qcPassed) {
        current = {
          ...current,
          status: 'rejected',
          qc: { status: 'fail', reason: 'Max retries reached. Manual review required.' },
        }
        onStep(current)
        onReject(current)
        return
      }
      current = { ...current, qc: { status: 'pass' } }
    }
  }

  // Only surface result after qc.status === 'pass'
  if (current.qc.status !== 'pass') {
    current = { ...current, status: 'rejected' }
    onStep(current)
    onReject(current)
    return
  }

  current = {
    ...current,
    status: 'approved',
    currentStep: 'Approved',
  }
  onStep(current)
  onComplete(current)
}

function stepToStatus(step: string): JobStatus {
  if (step === 'Strategy' || step === 'Normalize') return 'normalizing'
  if (step.includes('Realism')) return 'compiling_realism'
  if (step === 'Validator') return 'validating'
  if (step.includes('Gen')) return 'generating'
  if (step.startsWith('QC')) return 'qc'
  if (step === 'Approve' || step === 'Select Best' || step === 'Attach' || step === 'Attach to Card') return 'approved'
  return 'normalizing'
}

function simulateQC(job: GenerationJob): boolean {
  // In production: POST to /api/qc with job context, get scored result
  // For now: pass if realismMode is strict (governance enforced), fail sometimes on balanced
  if (job.realismMode === 'strict') return true
  return Math.random() > 0.3
}

// ─── Job store (in-memory, session only) ─────────────────────────────────────
// In production this would be backed by Redis/Postgres
const JOB_STORE_KEY = 'streamsai:jobs'

export function storeJob(job: GenerationJob): void {
  if (typeof window === 'undefined') return
  try {
    const existing = loadJobs()
    const updated = [job, ...existing.filter(j => j.jobId !== job.jobId)].slice(0, 50)
    window.sessionStorage.setItem(JOB_STORE_KEY, JSON.stringify(updated))
  } catch { /* storage full */ }
}

export function loadJobs(): GenerationJob[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(JOB_STORE_KEY)
    return raw ? (JSON.parse(raw) as GenerationJob[]) : []
  } catch { return [] }
}
