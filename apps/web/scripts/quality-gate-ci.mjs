import fs from 'fs/promises'
import path from 'path'

const ROOT = process.cwd()
const IGNORE = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'coverage', '.turbo'])
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.md', '.html', '.yml', '.yaml', '.txt', '.mjs', '.cjs'])

async function walk(dir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue
    if (entry.isDirectory() && IGNORE.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await walk(full, out)
    else out.push(full)
  }
  return out
}

function makeIssue(fileName, gate, severity, title, detail, fix) {
  return { fileName, gate, severity, title, detail, fix }
}

function penalty(issues) {
  return issues.reduce((sum, issue) => sum + (issue.severity === 'critical' ? 18 : issue.severity === 'warning' ? 8 : 3), 0)
}

async function main() {
  const files = await walk(ROOT)
  const analyzed = []
  for (const full of files) {
    const rel = path.relative(ROOT, full).replace(/\\/g, '/')
    const ext = path.extname(full).toLowerCase()
    let text = ''
    if (TEXT_EXTENSIONS.has(ext)) text = await fs.readFile(full, 'utf8').catch(() => '')
    const stat = await fs.stat(full)
    analyzed.push({ name: rel, size: stat.size, text })
  }

  const issues = []
  if (!analyzed.some((file) => /(^|\/)package\.json$/.test(file.name))) issues.push(makeIssue('repo', 'structure', 'critical', 'package.json missing', 'No package.json found.', 'Add package.json.'))
  if (!analyzed.some((file) => /^\.github\/workflows\/quality-gate\.yml$/.test(file.name))) issues.push(makeIssue('repo', 'release', 'critical', 'CI workflow missing', 'Quality Gate workflow missing.', 'Add quality-gate.yml.'))
  for (const file of analyzed) {
    if (/todo|fixme/i.test(file.text)) issues.push(makeIssue(file.name, 'release', 'warning', 'TODO found', 'TODO / FIXME marker found.', 'Resolve it before release.'))
    if (/\bany\b/.test(file.text) && /\.tsx?$/.test(file.name)) issues.push(makeIssue(file.name, 'code', 'warning', 'any found', 'Loose type found.', 'Replace any.'))
    if (/100vh/.test(file.text) && !/100dvh/.test(file.text)) issues.push(makeIssue(file.name, 'mobile', 'warning', '100vh found', 'Use of 100vh may jump on mobile.', 'Prefer 100dvh.'))
    if (/useEffect\s*\(/.test(file.text) && /addEventListener\(/.test(file.text) && !/removeEventListener\(/.test(file.text)) issues.push(makeIssue(file.name, 'reliability', 'critical', 'Listener cleanup missing', 'Listener cleanup missing.', 'Remove listener on cleanup.'))
  }
  const gates = ['structure', 'code', 'ux', 'mobile', 'performance', 'reliability', 'release'].map((gate) => {
    const gateIssues = issues.filter((issue) => issue.gate === gate)
    const score = Math.max(8, 100 - penalty(gateIssues))
    return { gate, score, passed: !gateIssues.some((issue) => issue.severity === 'critical'), issues: gateIssues.length }
  })
  const overall = Math.round(gates.reduce((sum, gate) => sum + gate.score, 0) / gates.length)
  const report = { overall, files: analyzed.length, issues, gates, createdAt: new Date().toISOString() }
  await fs.writeFile(path.join(ROOT, 'quality-gate-report.json'), JSON.stringify(report, null, 2))
  const critical = issues.filter((issue) => issue.severity === 'critical').length
  if (critical) {
    console.error(`Quality Gate failed with ${critical} critical issue(s).`)
    process.exit(1)
  }
  console.log(`Quality Gate passed. Score ${overall}.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
