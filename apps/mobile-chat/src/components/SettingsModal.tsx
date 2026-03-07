import { useState, useEffect } from 'react'
import { useChatStore } from '@/store/chat'
import { color, spacing, radius, font, motion, shadow } from '@/lib/tokens'
import { X, Eye, EyeOff, Save } from 'lucide-react'
import { MODELS, type AppSettings } from '@/types'

export function SettingsModal() {
  const { settings, saveSettings, settingsOpen, setSettingsOpen } = useChatStore()

  const [form, setForm] = useState<AppSettings>({
    anthropicKey: '',
    openaiKey: '',
    defaultModel: 'claude-sonnet-4-5',
    streamingEnabled: true,
    theme: 'dark',
  })
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showOpenAIKey, setShowOpenAIKey] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])

  if (!settingsOpen) return null

  const handleSave = async () => {
    await saveSettings(form)
    setSaved(true)
    setTimeout(() => { setSaved(false); setSettingsOpen(false) }, 800)
  }

  return (
    <div
      onClick={() => setSettingsOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: spacing[4],
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: color.bgCard, border: `1px solid ${color.border}`,
          borderRadius: radius['2xl'], padding: spacing[6],
          width: '100%', maxWidth: 480,
          boxShadow: shadow.lg,
          animation: `fadeSlideIn ${motion.normal} ${motion.easing}`,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[6] }}>
          <h2 style={{ margin: 0, fontSize: font.size.lg, fontWeight: font.weight.semibold, color: color.text }}>
            Settings
          </h2>
          <button onClick={() => setSettingsOpen(false)} style={{ background: 'none', border: 'none', color: color.textMuted, cursor: 'pointer', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* API Keys */}
        <Section label="API Keys">
          <KeyField
            label="Anthropic API Key"
            value={form.anthropicKey}
            show={showAnthropicKey}
            onToggle={() => setShowAnthropicKey(v => !v)}
            onChange={v => setForm(f => ({ ...f, anthropicKey: v }))}
            placeholder="sk-ant-..."
          />
          <KeyField
            label="OpenAI API Key"
            value={form.openaiKey}
            show={showOpenAIKey}
            onToggle={() => setShowOpenAIKey(v => !v)}
            onChange={v => setForm(f => ({ ...f, openaiKey: v }))}
            placeholder="sk-..."
          />
          <p style={{ fontSize: font.size.xs, color: color.textFaint, margin: `${spacing[2]} 0 0` }}>
            Keys stored locally in IndexedDB — never sent to any server except the AI providers directly.
          </p>
        </Section>

        {/* Default model */}
        <Section label="Default Model">
          <select
            value={form.defaultModel}
            onChange={e => setForm(f => ({ ...f, defaultModel: e.target.value as AppSettings['defaultModel'] }))}
            style={inputStyle}
          >
            {Object.values(MODELS).map(m => (
              <option key={m.id} value={m.id}>{m.label} ({m.provider})</option>
            ))}
          </select>
        </Section>

        {/* Streaming toggle */}
        <Section label="Streaming">
          <label style={{ display: 'flex', alignItems: 'center', gap: spacing[3], cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.streamingEnabled}
              onChange={e => setForm(f => ({ ...f, streamingEnabled: e.target.checked }))}
              style={{ width: 16, height: 16, accentColor: color.accent }}
            />
            <span style={{ fontSize: font.size.sm, color: color.text }}>Enable streaming responses</span>
          </label>
        </Section>

        {/* Save */}
        <button
          onClick={handleSave}
          style={{
            width: '100%', marginTop: spacing[4],
            padding: `${spacing[3]} ${spacing[4]}`,
            background: saved ? color.success : color.accent,
            border: 'none', borderRadius: radius.md,
            color: '#fff', fontSize: font.size.base, fontWeight: font.weight.semibold,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing[2],
            transition: `background ${motion.fast} ${motion.easing}`,
          }}
        >
          <Save size={15} />
          {saved ? 'Saved!' : 'Save settings'}
        </button>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: spacing[5] }}>
      <div style={{ fontSize: font.size.xs, fontWeight: font.weight.semibold, color: color.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: spacing[3] }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function KeyField({ label, value, show, onToggle, onChange, placeholder }: {
  label: string; value: string; show: boolean
  onToggle: () => void; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <label style={{ display: 'block', marginBottom: spacing[3] }}>
      <span style={{ fontSize: font.size.sm, color: color.textMuted, display: 'block', marginBottom: spacing[1] }}>{label}</span>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...inputStyle, paddingRight: 40 }}
        />
        <button
          type="button"
          onClick={onToggle}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: color.textMuted, cursor: 'pointer', display: 'flex' }}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: `${spacing[3]} ${spacing[3]}`,
  background: color.bgPanel, border: `1px solid ${color.border}`,
  borderRadius: radius.sm, color: color.text,
  fontSize: font.size.sm, outline: 'none', boxSizing: 'border-box',
  fontFamily: font.sans,
}
