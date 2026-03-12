export type Severity = 'critical' | 'warning' | 'info'
export type GateKey = 'structure' | 'code' | 'ux' | 'mobile' | 'performance' | 'reliability' | 'release'

export type AuditIssue = {
  id: string
  fileName: string
  gate: GateKey
  severity: Severity
  title: string
  detail: string
  fix: string
}

export type GateResult = {
  key: GateKey
  label: string
  score: number
  passed: boolean
  issues: number
}

export type AuditedFile = {
  id: string
  name: string
  size: number
  type: string
  textPreview: string
  score: number
  status: 'queued' | 'hashing' | 'scanning' | 'testing' | 'scoring' | 'complete' | 'failed'
  issues: AuditIssue[]
}

export type AuditReport = {
  summary: {
    overallScore: number
    releaseStatus: 'ready' | 'needs work' | 'blocked'
    criticalIssues: number
    warnings: number
    filesAudited: number
  }
  gates: GateResult[]
  issues: AuditIssue[]
  files: AuditedFile[]
  createdAt: string
}

const GATES: Array<{ key: GateKey; label: string }> = [
  { key: 'structure', label: 'Structure' },
  { key: 'code', label: 'Code Quality' },
  { key: 'ux', label: 'UX Polish' },
  { key: 'mobile', label: 'Mobile Behavior' },
  { key: 'performance', label: 'Performance' },
  { key: 'reliability', label: 'Reliability' },
  { key: 'release', label: 'Release Readiness' },
]

const TEXT_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.md', '.html', '.yml', '.yaml', '.txt'
]

export function isTextLikeFile(name: string, type?: string): boolean {
  const lower = name.toLowerCase()
  return TEXT_EXTENSIONS.some(ext => lower.endsWith(ext)) || !!type?.startsWith('text/') || type === 'application/json'
}

export function buildAuditReport(inputFiles: Array<{ id: string; name: string; size: number; type: string; textPreview: string; status?: AuditedFile['status'] }>): AuditReport {
  const issues: AuditIssue[] = []
  const files: AuditedFile[] = inputFiles.map((file) => {
    const fileIssues = inspectFile(file)
    issues.push(...fileIssues)
    const score = Math.max(20, 100 - penaltyFor(fileIssues))
    return {
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      textPreview: file.textPreview,
      score,
      status: file.status ?? 'complete',
      issues: fileIssues,
    }
  })

  const gates = GATES.map((gate) => {
    const gateIssues = issues.filter((issue) => issue.gate === gate.key)
    const score = Math.max(10, 100 - penaltyFor(gateIssues))
    return {
      key: gate.key,
      label: gate.label,
      score,
      passed: !gateIssues.some((issue) => issue.severity === 'critical'),
      issues: gateIssues.length,
    }
  })

  const criticalIssues = issues.filter((issue) => issue.severity === 'critical').length
  const warnings = issues.filter((issue) => issue.severity === 'warning').length
  const overallScore = Math.round(
    gates.reduce((sum, gate) => sum + gate.score, 0) / Math.max(gates.length, 1)
  )

  return {
    summary: {
      overallScore,
      releaseStatus: criticalIssues > 0 ? 'blocked' : overallScore >= 90 ? 'ready' : 'needs work',
      criticalIssues,
      warnings,
      filesAudited: files.length,
    },
    gates,
    issues,
    files,
    createdAt: new Date().toISOString(),
  }
}

function penaltyFor(issues: AuditIssue[]): number {
  return issues.reduce((sum, issue) => sum + (issue.severity === 'critical' ? 18 : issue.severity === 'warning' ? 8 : 3), 0)
}

function inspectFile(file: { name: string; textPreview: string; size: number }): AuditIssue[] {
  const issues: AuditIssue[] = []
  const text = file.textPreview || ''
  const lower = text.toLowerCase()
  const name = file.name

  if (file.size > 2_500_000) {
    issues.push(makeIssue(name, 'performance', 'warning', 'Large file size', 'Large files slow audits and often hide too much responsibility in one place.', 'Split oversized files into smaller feature modules.'))
  }

  if (/todo|fixme|xxx/i.test(text)) {
    issues.push(makeIssue(name, 'release', 'warning', 'Unfinished markers found', 'TODO / FIXME markers are still in the shipped file.', 'Resolve or remove unfinished markers before release.'))
  }

  if (/\bany\b/.test(text) && /\.tsx?$/.test(name)) {
    issues.push(makeIssue(name, 'code', 'warning', 'Loose typing found', 'The file uses `any`, which lowers safety and makes regressions easier to miss.', 'Replace `any` with explicit types or validated unknowns.'))
  }

  if (/console\.log\s*\(/.test(text)) {
    issues.push(makeIssue(name, 'release', 'info', 'Console logging left in file', 'Debug logging is still present.', 'Remove debug logs from release paths.'))
  }

  if (/useeffect\s*\(/i.test(lower) && /addEventListener\(/.test(text) && !/removeEventListener\(/.test(text)) {
    issues.push(makeIssue(name, 'reliability', 'critical', 'Listener cleanup missing', 'An event listener appears to be added without a matching cleanup.', 'Return a cleanup function that removes listeners on unmount.'))
  }

  if (/setInterval\(/.test(text) && !/clearInterval\(/.test(text)) {
    issues.push(makeIssue(name, 'reliability', 'critical', 'Timer cleanup missing', 'An interval is started without a matching clearInterval.', 'Clear timers in cleanup paths.'))
  }

  if (/position:\s*["']fixed["']/.test(text) && !/safe-area-inset/.test(text) && /mobile|sheet|bottom/i.test(text)) {
    issues.push(makeIssue(name, 'mobile', 'warning', 'Safe-area handling not obvious', 'A fixed mobile surface appears without safe-area support.', 'Add safe-area padding for iPhone and modern mobile browsers.'))
  }

  if (/transition:\s*["'][^"']*(400ms|500ms|600ms)/.test(text)) {
    issues.push(makeIssue(name, 'ux', 'info', 'Slow transition timing', 'Long transitions can feel heavy and less Apple-like.', 'Keep core interaction timing closer to 120–240ms.'))
  }

  if (/dropzone|upload/i.test(name) && !/drag/i.test(lower)) {
    issues.push(makeIssue(name, 'ux', 'info', 'Upload affordance may be weak', 'The upload surface does not appear to mention drag/drop behavior.', 'Make drag/drop behavior visually explicit.'))
  }

  if (/fetch\(/.test(text) && !/catch\(/.test(text) && !/try\s*\{/.test(text)) {
    issues.push(makeIssue(name, 'reliability', 'warning', 'Network failure path unclear', 'A fetch call appears without obvious error handling.', 'Handle failed requests and show useful recovery states.'))
  }

  if (/iframe/i.test(text) && !/title=/.test(text)) {
    issues.push(makeIssue(name, 'ux', 'info', 'iframe title missing', 'Embedded frames should be labeled for clarity and accessibility.', 'Add a descriptive iframe title.'))
  }

  if (/button/i.test(text) && !/aria-label/.test(text) && !/>[^<]{1,20}</.test(text)) {
    issues.push(makeIssue(name, 'ux', 'warning', 'Button labeling may be weak', 'Buttons need visible or accessible labels to feel polished and trustworthy.', 'Add text labels or aria-label attributes.'))
  }

  if (/100vh/.test(text) && !/100dvh/.test(text)) {
    issues.push(makeIssue(name, 'mobile', 'warning', 'Viewport unit may jump on mobile', 'Using 100vh can cause iOS and Android browser bar layout jumps.', 'Prefer 100dvh for app-like mobile surfaces.'))
  }

  if (/shadow/i.test(text) && /(0 20px 60px|0px 20px 60px)/.test(text)) {
    issues.push(makeIssue(name, 'ux', 'info', 'Heavy shadow usage', 'Very large shadows can make the UI feel webby instead of premium.', 'Reduce shadow spread and opacity.'))
  }

  if (!text.trim()) {
    issues.push(makeIssue(name, 'structure', 'warning', 'No readable content extracted', 'The file could not be inspected deeply.', 'Upload the source file directly or provide a text-based archive.'))
  }

  return issues
}

function makeIssue(fileName: string, gate: GateKey, severity: Severity, title: string, detail: string, fix: string): AuditIssue {
  return {
    id: `${fileName}-${gate}-${title}`.replace(/\s+/g, '-').toLowerCase(),
    fileName,
    gate,
    severity,
    title,
    detail,
    fix,
  }
}

export function buildHonestFeedback(report: AuditReport, question?: string): string {
  const weakest = [...report.gates].sort((a, b) => a.score - b.score).slice(0, 3)
  const topIssues = report.issues.slice(0, 5)
  const releaseLine =
    report.summary.releaseStatus === 'blocked'
      ? 'Do not ship this yet.'
      : report.summary.releaseStatus === 'needs work'
      ? 'This is promising but not release-clean yet.'
      : 'This looks release-capable based on the current scan.'

  const questionLine = question ? `You asked: ${question.trim()}` : ''

  return [
    releaseLine,
    `Overall score: ${report.summary.overallScore}. Critical issues: ${report.summary.criticalIssues}. Warnings: ${report.summary.warnings}.`,
    weakest.length ? `Weakest gates: ${weakest.map((gate) => `${gate.label} (${gate.score})`).join(', ')}.` : '',
    topIssues.length
      ? `Highest-risk findings: ${topIssues.map((issue) => `${issue.fileName}: ${issue.title}`).join(' | ')}.`
      : 'No major issues were detected in the uploaded files.',
    questionLine,
    topIssues.length
      ? `Best next move: fix ${topIssues[0].fileName} first. ${topIssues[0].fix}`
      : 'Best next move: run a broader audit on the full repo so the gate can catch cross-file issues too.',
  ].filter(Boolean).join(' ')
}
