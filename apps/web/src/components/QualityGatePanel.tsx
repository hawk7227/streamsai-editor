'use client'

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { buildAuditReport, buildHonestFeedback, isTextLikeFile, type AuditReport, type AuditedFile } from '@/lib/quality-gate'

type QueueFile = AuditedFile & {
  raw?: File
}

type ChatMessage = {
  role: 'user' | 'assistant'
  text: string
}

const PIPELINE_STEPS = [
  'Structure',
  'Code Quality',
  'UX Polish',
  'Mobile',
  'Performance',
  'Reliability',
  'Release',
]

export default function QualityGatePanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [queue, setQueue] = useState<QueueFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [report, setReport] = useState<AuditReport | null>(null)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'Drop files, folders, or a zip export here. I will audit them and tell you bluntly what blocks shipping.',
    },
  ])

  const selectedFile = queue.find((file) => file.id === selectedFileId) ?? queue[0] ?? null
  const handlePick = useCallback(() => inputRef.current?.click(), [])

  const ingestFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files)
    if (!list.length) return

    const nextItems: QueueFile[] = list.map((file, index) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${index}`,
      name: file.webkitRelativePath || file.name,
      size: file.size,
      type: file.type,
      textPreview: '',
      score: 0,
      status: 'queued',
      issues: [],
      raw: file,
    }))

    setQueue((prev) => [...nextItems, ...prev])
    if (!selectedFileId && nextItems[0]) setSelectedFileId(nextItems[0].id)

    for (const item of nextItems) {
      setQueue((prev) => prev.map((file) => file.id === item.id ? { ...file, status: 'hashing' } : file))
      const preview = isTextLikeFile(item.name, item.type) ? await safeReadText(item.raw!) : ''
      setQueue((prev) => prev.map((file) => file.id === item.id ? {
        ...file,
        textPreview: preview.slice(0, 100_000),
        status: 'queued',
      } : file))
    }
  }, [selectedFileId])

  const runAudit = useCallback(async () => {
    if (!queue.length || isRunning) return
    setIsRunning(true)
    setReport(null)

    for (const status of ['scanning', 'testing', 'scoring'] as const) {
      setQueue((prev) => prev.map((file) => ({ ...file, status })))
      await wait(220)
    }

    const nextReport = buildAuditReport(queue.map((file) => ({
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      textPreview: file.textPreview,
      status: 'complete',
    })))

    setQueue((prev) => prev.map((file) => {
      const audited = nextReport.files.find((entry) => entry.id === file.id)
      return audited ? { ...file, ...audited, raw: file.raw } : file
    }))
    setReport(nextReport)
    setChat((prev) => [...prev, { role: 'assistant', text: buildHonestFeedback(nextReport) }])
    setIsRunning(false)
  }, [isRunning, queue])

  const askAI = useCallback(async () => {
    if (!chatInput.trim() || !report || chatBusy) return
    const prompt = chatInput.trim()
    setChat((prev) => [...prev, { role: 'user', text: prompt }])
    setChatInput('')
    setChatBusy(true)
    try {
      const res = await fetch('/api/quality-gate/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, report }),
      })
      const data = await res.json() as { reply?: string }
      setChat((prev) => [...prev, { role: 'assistant', text: data.reply || 'The reviewer is unavailable right now.' }])
    } catch {
      setChat((prev) => [...prev, { role: 'assistant', text: buildHonestFeedback(report, prompt) }])
    } finally {
      setChatBusy(false)
    }
  }, [chatBusy, chatInput, report])

  const summaryCards = useMemo(() => {
    if (!report) return []
    return [
      { label: 'Overall Score', value: String(report.summary.overallScore) },
      { label: 'Release', value: report.summary.releaseStatus.toUpperCase() },
      { label: 'Critical', value: String(report.summary.criticalIssues) },
      { label: 'Warnings', value: String(report.summary.warnings) },
    ]
  }, [report])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr 0.95fr', height: '100%', background: '#090b10' }}>
      <div style={paneStyle}>
        <SectionTitle title="Submission" subtitle="Drop builds, folders, and source files" />
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            void ingestFiles(e.dataTransfer.files)
          }}
          onClick={handlePick}
          style={{
            border: `1px dashed ${isDragging ? 'rgba(111, 236, 208, 0.8)' : 'rgba(255,255,255,0.14)'}`,
            borderRadius: 18,
            minHeight: 180,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 10,
            background: isDragging ? 'rgba(111,236,208,0.08)' : 'rgba(255,255,255,0.02)',
            cursor: 'pointer',
            transition: 'all 140ms ease',
            padding: 20,
          }}
        >
          <div style={pillStyle}>AI Coder Submission Gate</div>
          <div style={{ color: '#f5f7fb', fontSize: 20, fontWeight: 600 }}>Drop files or folders here</div>
          <div style={{ color: 'rgba(255,255,255,0.56)', fontSize: 13, textAlign: 'center', maxWidth: 360 }}>
            Upload source files, whole folders, or a packaged build. The gate will audit structure, code quality, mobile behavior, reliability, and release readiness.
          </div>
          <button style={primaryButtonStyle}>Choose files</button>
          <input
            ref={inputRef}
            type="file"
            multiple
            // @ts-expect-error webkitdirectory is supported in Chromium browsers
            webkitdirectory=""
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files) void ingestFiles(e.target.files) }}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button style={primaryButtonStyle} onClick={() => void runAudit()} disabled={!queue.length || isRunning}>{isRunning ? 'Running…' : 'Run check'}</button>
          <button style={secondaryButtonStyle} onClick={() => { setQueue([]); setReport(null); setSelectedFileId(null) }}>Clear</button>
        </div>

        <SectionTitle title="Upload Queue" subtitle={`${queue.length} item${queue.length === 1 ? '' : 's'}`} />
        <div style={listStyle}>
          {queue.length === 0 ? (
            <EmptyHint text="Nothing uploaded yet." />
          ) : queue.map((file) => (
            <button key={file.id} onClick={() => setSelectedFileId(file.id)} style={{
              ...rowButtonStyle,
              background: selectedFileId === file.id ? 'rgba(111,236,208,0.08)' : 'transparent',
              borderColor: selectedFileId === file.id ? 'rgba(111,236,208,0.24)' : 'rgba(255,255,255,0.06)',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#f2f4f8', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: 11, marginTop: 4 }}>{formatBytes(file.size)} • {file.status}</div>
              </div>
              <StatusBadge status={file.status} />
            </button>
          ))}
        </div>
      </div>

      <div style={paneStyle}>
        <SectionTitle title="Live Check Pipeline" subtitle="Everything must pass before release" />
        <div style={{ display: 'grid', gap: 10 }}>
          {PIPELINE_STEPS.map((step, index) => {
            const gate = report?.gates[index]
            const active = isRunning && index < PIPELINE_STEPS.length - 1
            return (
              <div key={step} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.025)',
              }}>
                <div>
                  <div style={{ color: '#f3f4f8', fontSize: 14, fontWeight: 600 }}>{step}</div>
                  <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: 11, marginTop: 4 }}>{gate ? `${gate.issues} issue${gate.issues === 1 ? '' : 's'}` : active ? 'Running…' : 'Waiting'}</div>
                </div>
                <div style={{
                  minWidth: 82,
                  textAlign: 'right',
                  color: gate ? (gate.passed ? '#7ff0b7' : '#ff8f7a') : 'rgba(255,255,255,0.55)',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}>
                  {gate ? `${gate.score}` : active ? 'ACTIVE' : 'IDLE'}
                </div>
              </div>
            )
          })}
        </div>

        <SectionTitle title="Release Score" subtitle="Blunt summary" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
          {summaryCards.length === 0 ? <EmptyHint text="Run an audit to see scoring." /> : summaryCards.map((card) => (
            <div key={card.label} style={scoreCardStyle}>
              <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{card.label}</div>
              <div style={{ color: '#ffffff', fontSize: 24, fontWeight: 700, marginTop: 8 }}>{card.value}</div>
            </div>
          ))}
        </div>

        <SectionTitle title="File Review" subtitle={selectedFile ? selectedFile.name : 'Select a file'} />
        <div style={listStyle}>
          {!selectedFile ? <EmptyHint text="Pick a file from the queue." /> : selectedFile.issues.length === 0 ? <EmptyHint text="This file passed the current heuristic scan." /> : selectedFile.issues.map((issue) => (
            <div key={issue.id} style={{ ...issueCardStyle, borderColor: severityBorder(issue.severity) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ color: '#f5f7fb', fontSize: 13, fontWeight: 700 }}>{issue.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 }}>{issue.gate.toUpperCase()} • {issue.severity.toUpperCase()}</div>
                </div>
                <span style={{ ...smallPillStyle, background: severityBg(issue.severity), color: severityText(issue.severity) }}>{issue.severity}</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>{issue.detail}</div>
              <div style={{ color: '#8bead0', fontSize: 12, marginTop: 10 }}>{issue.fix}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={paneStyle}>
        <SectionTitle title="AI Review" subtitle="Honest mode is always on" />
        <div style={{ ...listStyle, height: 'calc(100% - 132px)', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {chat.map((msg, index) => (
            <div key={`${msg.role}-${index}`} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'stretch',
              maxWidth: msg.role === 'user' ? '86%' : '100%',
              padding: '12px 14px',
              borderRadius: 16,
              background: msg.role === 'user' ? 'rgba(111,236,208,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(111,236,208,0.24)' : 'rgba(255,255,255,0.06)'}`,
              color: msg.role === 'user' ? '#dffdf5' : '#f4f6fb',
              lineHeight: 1.45,
              fontSize: 13,
              whiteSpace: 'pre-wrap',
            }}>{msg.text}</div>
          ))}
        </div>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['What failed?', 'What blocks release?', 'Does this feel premium?', 'What should dev fix first?'].map((prompt) => (
              <button key={prompt} style={secondaryChipStyle} onClick={() => setChatInput(prompt)}>{prompt}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask for honest feedback on the uploaded build…"
              style={{
                flex: 1,
                minHeight: 82,
                resize: 'vertical',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                color: '#f5f7fb',
                padding: '14px 16px',
                outline: 'none',
                fontSize: 13,
              }}
            />
            <button style={primaryButtonStyle} onClick={() => void askAI()} disabled={!report || chatBusy}>{chatBusy ? 'Thinking…' : 'Ask AI'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

async function safeReadText(file: File): Promise<string> {
  try {
    return await file.text()
  } catch {
    return ''
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function StatusBadge({ status }: { status: QueueFile['status'] }) {
  const color = status === 'complete' ? '#7ff0b7' : status === 'failed' ? '#ff8f7a' : '#d9dcff'
  const bg = status === 'complete' ? 'rgba(127,240,183,0.12)' : status === 'failed' ? 'rgba(255,143,122,0.12)' : 'rgba(140,149,255,0.12)'
  return <span style={{ ...smallPillStyle, color, background: bg }}>{status}</span>
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 14, marginTop: 4 }}>
      <div style={{ color: '#ffffff', fontSize: 15, fontWeight: 700 }}>{title}</div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>{subtitle}</div>
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return <div style={{ color: 'rgba(255,255,255,0.46)', fontSize: 12, padding: 10 }}>{text}</div>
}

function severityBorder(severity: 'critical' | 'warning' | 'info') {
  return severity === 'critical' ? 'rgba(255,122,104,0.34)' : severity === 'warning' ? 'rgba(255,194,92,0.3)' : 'rgba(125,166,255,0.22)'
}

function severityBg(severity: 'critical' | 'warning' | 'info') {
  return severity === 'critical' ? 'rgba(255,122,104,0.12)' : severity === 'warning' ? 'rgba(255,194,92,0.12)' : 'rgba(125,166,255,0.12)'
}

function severityText(severity: 'critical' | 'warning' | 'info') {
  return severity === 'critical' ? '#ff9f8d' : severity === 'warning' ? '#ffd07a' : '#9ec0ff'
}

const paneStyle: React.CSSProperties = {
  padding: 18,
  borderLeft: '1px solid rgba(255,255,255,0.06)',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  overflow: 'hidden',
}

const listStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 18,
  padding: 10,
  display: 'grid',
  gap: 10,
  overflow: 'auto',
  minHeight: 0,
}

const rowButtonStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '12px 14px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.06)',
  cursor: 'pointer',
  textAlign: 'left',
}

const primaryButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(111,236,208,0.24)',
  background: 'linear-gradient(180deg, rgba(88,220,197,0.22), rgba(58,171,154,0.16))',
  color: '#dcfff5',
  borderRadius: 14,
  padding: '10px 14px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
}

const secondaryButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  color: '#edf1f7',
  borderRadius: 14,
  padding: '10px 14px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const secondaryChipStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  color: '#dbe2ec',
  borderRadius: 999,
  padding: '8px 12px',
  fontSize: 11,
  cursor: 'pointer',
}

const scoreCardStyle: React.CSSProperties = {
  padding: '16px 18px',
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(255,255,255,0.03)',
}

const issueCardStyle: React.CSSProperties = {
  padding: '14px',
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(255,255,255,0.03)',
}

const pillStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: '6px 10px',
  fontSize: 10,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  fontWeight: 700,
  color: '#8ce9d2',
  background: 'rgba(111,236,208,0.12)',
  border: '1px solid rgba(111,236,208,0.18)',
}

const smallPillStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: '5px 8px',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}
