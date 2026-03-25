// ─── Guidance Document Parser ─────────────────────────────────────────────────
// Reads uploaded .txt / .md / .json files client-side.
// Extracts structured rules from free-form text.
// PDF support via basic text extraction (no external lib dependency).

export interface GuidanceRule {
  id: string
  field: string           // which pipeline field this applies to
  instruction: string     // human-readable rule
  value?: string          // extracted expected value if deterministic
  severity: 'hard' | 'soft'  // hard = must comply, soft = recommendation
  raw: string             // original source line
}

export interface ParsedGuidance {
  fileName: string
  fileSize: number
  parsedAt: number
  rawContent: string
  rules: GuidanceRule[]
  summary: string
}

// ─── Field keywords for rule extraction ───────────────────────────────────────
const FIELD_PATTERNS: { field: string; keywords: string[] }[] = [
  { field: 'realism.mode',           keywords: ['realism mode', 'realism:', 'realism level', 'realism setting'] },
  { field: 'realism.noCinematic',    keywords: ['no cinematic', 'cinematic', 'film look', 'cinematic look'] },
  { field: 'realism.noBeautyLook',   keywords: ['no beauty', 'beauty look', 'airbrushed', 'perfect skin', 'no filter'] },
  { field: 'realism.noDramatic',     keywords: ['no dramatic', 'dramatic lighting', 'dramatic look'] },
  { field: 'scene.subject',          keywords: ['subject:', 'subject must', 'subject should', 'person:', 'model:'] },
  { field: 'scene.environment',      keywords: ['environment:', 'setting:', 'background:', 'location:'] },
  { field: 'scene.cameraType',       keywords: ['camera:', 'shot type', 'lens:', 'camera type'] },
  { field: 'intent.platform',        keywords: ['platform:', 'for platform', 'channel:', 'output channel'] },
  { field: 'intent.audience',        keywords: ['audience:', 'target audience', 'demographic:', 'for audience'] },
  { field: 'outputType',             keywords: ['output type', 'output:', 'format:', 'media type'] },
  { field: 'brand.colors',           keywords: ['brand color', 'color palette', 'hex:', 'colors:'] },
  { field: 'brand.tone',             keywords: ['tone:', 'brand tone', 'voice:', 'style tone'] },
  { field: 'prompt.forbidden',       keywords: ['do not include', 'never include', 'forbidden:', 'avoid:', 'prohibited:'] },
  { field: 'prompt.required',        keywords: ['must include', 'always include', 'required:', 'mandatory:'] },
]

const HARD_KEYWORDS = ['must', 'never', 'always', 'required', 'mandatory', 'forbidden', 'prohibited', 'do not', 'cannot']
const SOFT_KEYWORDS = ['should', 'prefer', 'recommend', 'ideally', 'try to', 'avoid if possible']

// ─── Main parse function ───────────────────────────────────────────────────────
export async function parseGuidanceFile(file: File): Promise<ParsedGuidance> {
  const rawContent = await readFileAsText(file)
  const rules = extractRules(rawContent)
  const summary = buildSummary(rules, rawContent)

  return {
    fileName: file.name,
    fileSize: file.size,
    parsedAt: Date.now(),
    rawContent,
    rules,
    summary,
  }
}

// ─── File reader ──────────────────────────────────────────────────────────────
async function readFileAsText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'json') {
    const text = await file.text()
    try {
      const parsed = JSON.parse(text)
      // Flatten JSON to readable key: value lines for rule extraction
      return flattenJSON(parsed)
    } catch {
      return text
    }
  }

  if (ext === 'pdf') {
    // Basic PDF text extraction without external lib
    // Reads raw bytes and extracts text streams (handles simple PDFs)
    const buffer = await file.arrayBuffer()
    return extractPDFText(buffer)
  }

  // .txt, .md, and everything else
  return file.text()
}

function flattenJSON(obj: unknown, prefix = ''): string {
  if (typeof obj !== 'object' || obj === null) return `${prefix}: ${String(obj)}`
  const lines: string[] = []
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      lines.push(flattenJSON(v, key))
    } else {
      lines.push(`${key}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
    }
  }
  return lines.join('\n')
}

function extractPDFText(buffer: ArrayBuffer): string {
  // Minimal PDF text stream extractor — handles text-based PDFs
  // Does not handle scanned/image PDFs
  const bytes = new Uint8Array(buffer)
  const str = new TextDecoder('latin1').decode(bytes)
  const chunks: string[] = []

  // Extract text between BT (begin text) and ET (end text) markers
  const btEtRegex = /BT([\s\S]*?)ET/g
  let match
  while ((match = btEtRegex.exec(str)) !== null) {
    const block = match[1]
    // Extract strings in parentheses (Tj/TJ operators)
    const strRegex = /\(([^)]*)\)/g
    let strMatch
    while ((strMatch = strRegex.exec(block)) !== null) {
      const text = strMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, ' ')
        .replace(/\\t/g, ' ')
        .replace(/\\\\/g, '\\')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
      if (text.trim()) chunks.push(text)
    }
  }

  if (chunks.length === 0) {
    return '[PDF content could not be extracted automatically. Please use .txt or .md format for best results.]'
  }

  return chunks.join(' ').replace(/\s+/g, ' ').trim()
}

// ─── Rule extractor ───────────────────────────────────────────────────────────
function extractRules(content: string): GuidanceRule[] {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
  const rules: GuidanceRule[] = []
  let idCounter = 0

  for (const line of lines) {
    const lower = line.toLowerCase()

    // Skip section headers and very short lines
    if (line.length < 8) continue
    if (/^#{1,3}\s/.test(line)) continue

    // Determine which field this line is about
    let matchedField: string | null = null
    for (const { field, keywords } of FIELD_PATTERNS) {
      if (keywords.some(kw => lower.includes(kw))) {
        matchedField = field
        break
      }
    }

    if (!matchedField) continue

    // Determine severity
    const isHard = HARD_KEYWORDS.some(kw => lower.includes(kw))
    const isSoft = SOFT_KEYWORDS.some(kw => lower.includes(kw))
    const severity: 'hard' | 'soft' = isHard ? 'hard' : (isSoft ? 'soft' : 'soft')

    // Extract value hint
    const colonIdx = line.indexOf(':')
    const value = colonIdx !== -1 ? line.slice(colonIdx + 1).trim() : undefined

    rules.push({
      id: `rule-${++idCounter}`,
      field: matchedField,
      instruction: line,
      value: value && value.length < 100 ? value : undefined,
      severity,
      raw: line,
    })
  }

  return rules
}

function buildSummary(rules: GuidanceRule[], content: string): string {
  const hardCount = rules.filter(r => r.severity === 'hard').length
  const softCount = rules.filter(r => r.severity === 'soft').length
  const fields = rules.map(r => r.field.split('.')[0]).filter((f, i, a) => a.indexOf(f) === i)
  const wordCount = content.split(/\s+/).length

  if (rules.length === 0) {
    return `Document loaded (${wordCount} words). No structured rules detected — document will be passed as raw context to the pipeline.`
  }

  return `${rules.length} rules detected (${hardCount} hard, ${softCount} soft) across ${fields.join(', ')} — ${wordCount} words total.`
}
