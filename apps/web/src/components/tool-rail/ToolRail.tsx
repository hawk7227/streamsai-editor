"use client"
import { useMemo, useState } from 'react'

type ToolKey = 'projects' | 'files' | 'uploads' | 'artifacts' | 'settings'

type Props = {
  expanded: boolean
  onToggle(): void
  activeTool: ToolKey | null
  onTool(tool: ToolKey): void
  files: string[]
  currentFile: string
  onSelectFile(path: string): void
  onUpload(file: File): void
}

const tools: Array<{ key: ToolKey; icon: string; label: string }> = [
  { key: 'projects', icon: '⊞', label: 'Projects' },
  { key: 'files',    icon: '⋮≡', label: 'Files' },
  { key: 'uploads',  icon: '↑',  label: 'Uploads' },
  { key: 'artifacts',icon: '◈',  label: 'Artifacts' },
  { key: 'settings', icon: '⚙',  label: 'Settings' },
]

export function ToolRail(props: Props) {
  const { expanded, onToggle, activeTool, onTool, files, currentFile, onSelectFile, onUpload } = props
  const [search, setSearch] = useState('')

  const filteredFiles = useMemo(
    () => files.filter(f => f.toLowerCase().includes(search.toLowerCase())).slice(0, 200),
    [files, search]
  )

  // Clicking a tool when collapsed: auto-expand and select
  const handleTool = (key: ToolKey) => {
    if (!expanded) onToggle()
    onTool(key)
  }

  return (
    <div style={{
      width: expanded ? 260 : 52,
      borderRight: '1px solid rgba(255,255,255,0.08)',
      background: '#04060f',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 160ms ease',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Toggle */}
      <button
        onClick={onToggle}
        title={expanded ? 'Collapse' : 'Expand'}
        style={toggleStyle}
      >
        {expanded ? '‹' : '›'}
      </button>

      {/* Tool icons */}
      {tools.map(tool => {
        const active = activeTool === tool.key
        return (
          <button
            key={tool.key}
            onClick={() => handleTool(tool.key)}
            title={tool.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: expanded ? '12px 14px' : '14px 0',
              justifyContent: expanded ? 'flex-start' : 'center',
              background: active ? 'rgba(68,195,166,0.14)' : 'transparent',
              borderLeft: active ? '2px solid rgba(68,195,166,0.7)' : '2px solid transparent',
              border: 'none',
              borderRight: 'none',
              color: active ? '#6eecd8' : 'rgba(255,255,255,0.52)',
              fontSize: expanded ? 13 : 16,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              transition: 'background 120ms ease, color 120ms ease',
              letterSpacing: expanded ? '0.04em' : 0,
              fontWeight: active ? 600 : 400,
            }}
          >
            <span style={{ fontSize: 15, minWidth: 20, textAlign: 'center', lineHeight: 1 }}>
              {tool.icon}
            </span>
            {expanded && <span>{tool.label}</span>}
          </button>
        )
      })}

      {/* Expanded panels */}
      {expanded && activeTool === 'files' && (
        <div style={panelStyle}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search files…"
            style={inputStyle}
          />
          <div style={{ overflow: 'auto', flex: 1 }}>
            {filteredFiles.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, padding: '8px 4px' }}>
                {files.length === 0 ? 'Loading files…' : 'No results'}
              </div>
            )}
            {filteredFiles.map(file => (
              <button
                key={file}
                onClick={() => onSelectFile(file)}
                style={{
                  ...fileButtonStyle,
                  background: file === currentFile ? 'rgba(68,195,166,0.16)' : 'transparent',
                  color: file === currentFile ? '#6eecd8' : '#c7d8f8',
                }}
              >
                {file}
              </button>
            ))}
          </div>
        </div>
      )}

      {expanded && activeTool === 'uploads' && (
        <div style={panelStyle}>
          <label style={{
            display: 'block', width: '100%', textAlign: 'center',
            padding: '12px 10px', borderRadius: 10, cursor: 'pointer',
            border: '1px dashed rgba(68,195,166,0.35)', color: '#6eecd8', fontSize: 13,
          }}>
            + Upload file
            <input type="file" style={{ display: 'none' }} onChange={e => {
              const file = e.target.files?.[0]
              if (file) onUpload(file)
            }} />
          </label>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.6 }}>
            HTML, TSX, docs, and images are previewed instantly in the preview panel.
          </div>
        </div>
      )}

      {expanded && activeTool === 'projects' && (
        <div style={panelStyle}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.6 }}>
            Active project context is shown in the top bar. Switch projects via <strong style={{ color: '#6eecd8' }}>/setup</strong>.
          </div>
        </div>
      )}

      {expanded && activeTool === 'artifacts' && (
        <div style={panelStyle}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.6 }}>
            Generated artifacts appear here after staging and applying changes.
          </div>
        </div>
      )}

      {expanded && activeTool === 'settings' && (
        <div style={panelStyle}>
          <a href="/setup" style={{ display: 'block', padding: '10px 12px', borderRadius: 10, background: 'rgba(68,195,166,0.12)', border: '1px solid rgba(68,195,166,0.24)', color: '#6eecd8', fontSize: 13, textDecoration: 'none', textAlign: 'center' }}>
            Open Setup →
          </a>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.6 }}>
            Configure GitHub, Supabase, and Vercel connections.
          </div>
        </div>
      )}

      <div style={{ marginTop: 'auto', padding: '12px 14px', color: 'rgba(255,255,255,0.2)', fontSize: 10, letterSpacing: '0.08em' }}>
        {expanded ? 'STREAMSAI' : 'S'}
      </div>
    </div>
  )
}

const toggleStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  height: 40, width: '100%', background: 'transparent',
  border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.35)', fontSize: 18, cursor: 'pointer',
  flexShrink: 0,
}
const panelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 10, padding: 12,
  borderTop: '1px solid rgba(255,255,255,0.06)', minHeight: 0, flex: 1, overflow: 'hidden',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 10px', borderRadius: 10, fontSize: 12,
  background: 'rgba(255,255,255,0.06)', color: '#fff',
  border: '1px solid rgba(255,255,255,0.08)', outline: 'none',
}
const fileButtonStyle: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left',
  padding: '7px 10px', borderRadius: 8, border: 'none',
  fontSize: 11, wordBreak: 'break-all', cursor: 'pointer',
  lineHeight: 1.5,
}
