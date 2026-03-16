"use client"
import { useMemo, useState } from 'react'

type ToolKey = 'projects' | 'files' | 'uploads' | 'artifacts' | 'settings'

type Props = { expanded: boolean; onToggle(): void; activeTool: ToolKey | null; onTool(tool: ToolKey): void; files: string[]; currentFile: string; onSelectFile(path: string): void; onUpload(file: File): void }
const tools: Array<{ key: ToolKey; icon: string; label: string }> = [
  { key: 'projects', icon: '📁', label: 'Projects' },
  { key: 'files', icon: '📄', label: 'Files' },
  { key: 'uploads', icon: '⬆', label: 'Uploads' },
  { key: 'artifacts', icon: '🧩', label: 'Artifacts' },
  { key: 'settings', icon: '⚙', label: 'Settings' },
]
export function ToolRail(props: Props) {
  const { expanded, onToggle, activeTool, onTool, files, currentFile, onSelectFile, onUpload } = props
  const [search, setSearch] = useState('')
  const filteredFiles = useMemo(() => files.filter((file) => file.toLowerCase().includes(search.toLowerCase())).slice(0, 200), [files, search])
  return <div style={{ width: expanded ? 250 : 58, borderRight: '1px solid rgba(255,255,255,0.08)', background: '#050814', display: 'flex', flexDirection: 'column', transition: 'width 160ms ease', overflow: 'hidden', flexShrink: 0 }}>
    <button onClick={onToggle} style={railButtonStyle(true)}>{expanded ? '◀' : '▶'}</button>
    {tools.map((tool) => <button key={tool.key} onClick={() => onTool(tool.key)} style={railButtonStyle(activeTool === tool.key)}><span>{tool.icon}</span>{expanded && <span style={{ marginLeft: 10 }}>{tool.label}</span>}</button>)}
    {expanded && activeTool === 'files' && <div style={panelStyle}><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files" style={inputStyle} /><div style={{ overflow: 'auto', flex: 1 }}>{filteredFiles.map((file) => <button key={file} onClick={() => onSelectFile(file)} style={{ ...fileButtonStyle, background: file === currentFile ? 'rgba(68,195,166,0.18)' : 'transparent' }}>{file}</button>)}</div></div>}
    {expanded && activeTool === 'uploads' && <div style={panelStyle}><label style={{ ...fileButtonStyle, border: '1px dashed rgba(255,255,255,0.18)' }}>Upload file<input type="file" style={{ display: 'none' }} onChange={(e) => { const file = e.target.files?.[0]; if (file) onUpload(file) }} /></label><div style={{ color: 'rgba(255,255,255,0.62)', fontSize: 12, lineHeight: 1.5 }}>Code, docs, images, and HTML files can be previewed here.</div></div>}
    {expanded && activeTool === 'projects' && <div style={panelStyle}><div style={{ color: '#d7e3ff', fontSize: 13 }}>Active project is locked in the compact header.</div></div>}
    {expanded && activeTool === 'artifacts' && <div style={panelStyle}><div style={{ color: '#d7e3ff', fontSize: 13 }}>Artifacts surface is ready for staged previews and exports.</div></div>}
    {expanded && activeTool === 'settings' && <div style={panelStyle}><div style={{ color: '#d7e3ff', fontSize: 13 }}>Use /setup for GitHub, Supabase, and Vercel setup.</div></div>}
    <div style={{ marginTop: 'auto', padding: 12, color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>StreamsAI</div>
  </div>
}
const panelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, padding: 10, borderTop: '1px solid rgba(255,255,255,0.06)', minHeight: 0, flex: 1 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }
const fileButtonStyle: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 10, color: '#d7e3ff', background: 'transparent', border: 'none', fontSize: 12, wordBreak: 'break-all' }
function railButtonStyle(active: boolean): React.CSSProperties { return { display: 'flex', alignItems: 'center', gap: 4, padding: '14px 12px', background: active ? 'rgba(68,195,166,0.12)' : 'transparent', border: 'none', color: '#e8f0ff', fontSize: 13, cursor: 'pointer' } }
