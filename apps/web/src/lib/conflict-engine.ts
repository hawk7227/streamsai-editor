// ─── Conflict Detection Engine ────────────────────────────────────────────────
// Compares frontend pipeline settings against parsed guidance rules.
// Returns a list of conflicts with resolution options.
// Runs client-side only — no API calls.

import type { GuidanceRule, ParsedGuidance } from './guidance-parser'
import type { PipelineState } from './pipeline-state'

export type ConflictSide = 'frontend' | 'guidance'

export type ConflictStatus = 'unresolved' | 'resolved_frontend' | 'resolved_guidance'

export interface Conflict {
  id: string
  field: string
  label: string                  // human label for the field
  frontendValue: string          // what the frontend currently says
  guidanceValue: string          // what the guidance doc says
  rule: GuidanceRule             // the rule that triggered this
  severity: 'hard' | 'soft'
  status: ConflictStatus
  resolution?: ConflictSide      // which side won
  description: string            // plain English explanation
}

export interface ConflictReport {
  conflicts: Conflict[]
  unresolvedCount: number
  hardUnresolvedCount: number
  canRun: boolean                // false if any hard conflicts unresolved
  checkedAt: number
}

// ─── Field label map ───────────────────────────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  'realism.mode':         'Realism Mode',
  'realism.noCinematic':  'No Cinematic',
  'realism.noBeautyLook': 'No Beauty Look',
  'realism.noDramatic':   'No Dramatic',
  'scene.subject':        'Scene Subject',
  'scene.environment':    'Scene Environment',
  'scene.cameraType':     'Camera Type',
  'intent.platform':      'Target Platform',
  'intent.audience':      'Target Audience',
  'outputType':           'Output Type',
  'brand.tone':           'Brand Tone',
  'prompt.forbidden':     'Forbidden Content',
  'prompt.required':      'Required Content',
}

// ─── Extract current frontend value for a given field path ────────────────────
function getFrontendValue(state: PipelineState, field: string): string | null {
  switch (field) {
    case 'realism.mode':
      return state.realism.mode
    case 'realism.noCinematic':
      return state.realism.strictNegatives.noCinematic
        ? 'no cinematic enforced'
        : 'cinematic allowed'
    case 'realism.noBeautyLook':
      return state.realism.strictNegatives.noBeautyLook
        ? 'no beauty look enforced'
        : 'beauty look allowed'
    case 'realism.noDramatic':
      return state.realism.strictNegatives.noDramatic
        ? 'no dramatic enforced'
        : 'dramatic allowed'
    case 'scene.subject':
      return state.scene.subject || null
    case 'scene.environment':
      return state.scene.environment || null
    case 'scene.cameraType':
      return state.scene.cameraType || null
    case 'intent.platform':
      return state.intent.platform || null
    case 'intent.audience':
      return state.intent.audience || null
    case 'outputType':
      return state.intent.outputType || null
    default:
      return null
  }
}

// ─── Conflict detector ────────────────────────────────────────────────────────
function detectConflict(
  state: PipelineState,
  rule: GuidanceRule,
  existingIds: Set<string>
): Conflict | null {
  const frontendValue = getFrontendValue(state, rule.field)
  if (frontendValue === null) return null

  const lower = rule.instruction.toLowerCase()
  const fLower = frontendValue.toLowerCase()

  let isConflict = false
  let description = ''

  // ── Realism mode conflicts ──
  if (rule.field === 'realism.mode') {
    const guidanceModes = ['standard', 'soft', 'strict', 'raw']
    const mentionedMode = guidanceModes.find(m => lower.includes(m))
    if (mentionedMode && !fLower.includes(mentionedMode)) {
      isConflict = true
      description = `Frontend uses ${frontendValue} realism but guidance requires ${mentionedMode.toUpperCase()}`
    }
  }

  // ── Cinematic conflicts ──
  if (rule.field === 'realism.noCinematic') {
    const guidanceWantsNoCinematic = lower.includes('no cinematic') || lower.includes('avoid cinematic')
    const frontendAllowsCinematic = frontendValue === 'cinematic allowed'
    if (guidanceWantsNoCinematic && frontendAllowsCinematic) {
      isConflict = true
      description = 'Guidance prohibits cinematic looks but frontend has cinematic allowed'
    }
    const guidanceWantsCinematic = lower.includes('cinematic preferred') || lower.includes('use cinematic')
    if (guidanceWantsCinematic && !frontendAllowsCinematic) {
      isConflict = true
      description = 'Guidance requires cinematic style but frontend blocks it'
    }
  }

  // ── Beauty look conflicts ──
  if (rule.field === 'realism.noBeautyLook') {
    const guidanceWantsNoBeauty = lower.includes('no beauty') || lower.includes('no airbrushed') || lower.includes('no perfect skin')
    const frontendAllowsBeauty = frontendValue === 'beauty look allowed'
    if (guidanceWantsNoBeauty && frontendAllowsBeauty) {
      isConflict = true
      description = 'Guidance prohibits beauty/airbrushed looks but frontend has it allowed'
    }
  }

  // ── Platform conflicts ──
  if (rule.field === 'intent.platform' && rule.value) {
    const guidancePlatform = rule.value.toLowerCase().trim()
    if (guidancePlatform && !fLower.includes(guidancePlatform) && !guidancePlatform.includes(fLower)) {
      isConflict = true
      description = `Frontend targets "${frontendValue}" but guidance specifies "${rule.value}"`
    }
  }

  // ── Output type conflicts ──
  if (rule.field === 'outputType' && rule.value) {
    const guidanceType = rule.value.toLowerCase().trim()
    if (guidanceType && !fLower.includes(guidanceType) && !guidanceType.includes(fLower)) {
      isConflict = true
      description = `Frontend output type is "${frontendValue}" but guidance specifies "${rule.value}"`
    }
  }

  // ── Forbidden content in prompt ──
  if (rule.field === 'prompt.forbidden' && rule.value) {
    const forbidden = rule.value.toLowerCase()
    const promptContent = (state.pipelinePrompt + ' ' + state.finalPrompt).toLowerCase()
    if (promptContent.includes(forbidden)) {
      isConflict = true
      description = `Prompt contains "${rule.value}" which guidance marks as forbidden`
    }
  }

  // ── Required content missing from prompt ──
  if (rule.field === 'prompt.required' && rule.value) {
    const required = rule.value.toLowerCase()
    const promptContent = (state.pipelinePrompt + ' ' + state.finalPrompt).toLowerCase()
    if (!promptContent.includes(required)) {
      isConflict = true
      description = `Guidance requires "${rule.value}" in the prompt but it is missing`
    }
  }

  if (!isConflict) return null

  // Deduplicate by field
  const conflictId = `conflict-${rule.field}-${rule.id}`
  if (existingIds.has(conflictId)) return null
  existingIds.add(conflictId)

  return {
    id: conflictId,
    field: rule.field,
    label: FIELD_LABELS[rule.field] ?? rule.field,
    frontendValue,
    guidanceValue: rule.value ?? rule.instruction,
    rule,
    severity: rule.severity,
    status: 'unresolved',
    description,
  }
}

// ─── Main entry point ─────────────────────────────────────────────────────────
export function detectConflicts(
  state: PipelineState,
  guidance: ParsedGuidance,
  existingResolutions: Record<string, ConflictSide> = {}
): ConflictReport {
  const existingIds = new Set<string>()
  const conflicts: Conflict[] = []

  for (const rule of guidance.rules) {
    const conflict = detectConflict(state, rule, existingIds)
    if (!conflict) continue

    // Apply existing resolutions
    const resolution = existingResolutions[conflict.id]
    if (resolution) {
      conflicts.push({
        ...conflict,
        status: resolution === 'frontend' ? 'resolved_frontend' : 'resolved_guidance',
        resolution,
      })
    } else {
      conflicts.push(conflict)
    }
  }

  const unresolved = conflicts.filter(c => c.status === 'unresolved')
  const hardUnresolved = unresolved.filter(c => c.severity === 'hard')

  return {
    conflicts,
    unresolvedCount: unresolved.length,
    hardUnresolvedCount: hardUnresolved.length,
    canRun: hardUnresolved.length === 0,
    checkedAt: Date.now(),
  }
}

// ─── Apply guidance resolutions to state ──────────────────────────────────────
// When user chooses "Use Guidance" for a conflict, this patches the state
export function applyGuidanceResolution(
  state: PipelineState,
  conflict: Conflict
): Partial<PipelineState> {
  const val = conflict.guidanceValue.toLowerCase().trim()

  switch (conflict.field) {
    case 'realism.mode': {
      const mode = (['STANDARD','SOFT','STRICT','RAW'] as const)
        .find(m => val.includes(m.toLowerCase()))
      if (mode) return { realism: { ...state.realism, mode } }
      break
    }
    case 'realism.noCinematic':
      return {
        realism: {
          ...state.realism,
          strictNegatives: { ...state.realism.strictNegatives, noCinematic: val.includes('no cinematic') },
        },
      }
    case 'realism.noBeautyLook':
      return {
        realism: {
          ...state.realism,
          strictNegatives: { ...state.realism.strictNegatives, noBeautyLook: val.includes('no beauty') },
        },
      }
    case 'realism.noDramatic':
      return {
        realism: {
          ...state.realism,
          strictNegatives: { ...state.realism.strictNegatives, noDramatic: val.includes('no dramatic') },
        },
      }
    case 'intent.platform':
      return { intent: { ...state.intent, platform: conflict.rule.value ?? state.intent.platform } }
    case 'outputType':
      return { intent: { ...state.intent, outputType: conflict.rule.value ?? state.intent.outputType } }
    default:
      break
  }
  return {}
}
