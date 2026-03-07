import { useState, useEffect } from 'react'
import { useChatStore } from '@/store/chat'
import { color, spacing, radius, font, motion } from '@/lib/tokens'
import { X, Eye, EyeOff, Check, Settings } from 'lucide-react'
import { MODELS, type AppSettings } from '@/types'

export function SettingsModal() {
  const { settings, saveSettings, settingsOpen, setSettingsOpen } = useChatStore()

  const [form, setForm] = useState<AppSettings>({
    anthropicKey: '', openaiKey: '',
    defaultModel: 'claude-sonnet-4-5',
    streamingEnabled: true, theme: 'dark',
  })
  const [showAnth, setShowAnth] = useState(false)
  const [showOAI, setShowOAI] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { if (settings) setForm(settings) }, [settings])

  if (!settingsOpen) return null

  const handleSave = async () => {
    await saveSettings(form)
    setSaved(true)
    setTimeout(() => { setSaved(false); setSettingsOpen(false) }, 900)
  }

  return (
    <div
      onClick={() => setSettingsOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'flex-end',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          background: color.bgElevated,
          borderRadius: `${radius.xl} ${radius.xl} 0 0`,
          padding: spacing[6],
          paddingBottom: `max(${spacing[8]}, env(safe-area-inset-bottom, 32px))`,
          animation: `slideUp ${motion.normal} ${motion.easing}`,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: color.borderStrong,
          margin: `0 auto ${spacing[5]}`,
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[6] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
            <Settings size={18} color={color.accent} />
            <span style={{ fontSize: font.size.lg, fontWeight: font.weight.bold, color: color.text }}>Settings</span>
          </div>
          <button
            onClick={() => setSettingsOpen(false)}
            style={{
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: color.bgCard, border: 'none', borderRadius: radius.full, color: color.textSub,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* API Keys section */}
        <Section label="API Keys">
          <KeyField
            label="Anthropic API Key"
            value={form.anthropicKey}
            show={showAnth}
            onToggle={() => setShowAnth(v => !v)}
            onChange={v => setForm(f => ({ ...f, anthropicKey: v }))}
            placeholder="sk-ant-..."
          />
          <KeyField
            label="OpenAI API Key"
            value={form.openaiKey}
            show={showOAI}
            onToggle={() => setShowOAI(v => !v)}
            onChange={v => setForm(f => ({ ...f, openaiKey: v }))}
            placeholder="sk-..."
          />
          <p style={{ fontSize: font.size.xs, color: color.textFaint, marginTop: spacing[2], lineHeight: String(1.5) }}>
            Keys stored locally on your device. Never sent to any server except AI providers directly.
          </p>
        </Section>

        {/* Default model */}
        <Section label="Default Model">
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
            {Object.values(MODELS).map(m => (
              <button
                key={m.id}
                onClick={() => setForm(f => ({ ...f, defaultModel: m.id }))}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: `${spacing[3]} ${spacing[4]}`,
                  background: form.defaultModel === m.id ? color.accentDim : color.bgCard,
                  border: `1px solid ${form.defaultModel === m.id ? color.accent + '50' : color.border}`,
                  borderRadius: radius.md, cursor: 'pointer',
                  color: form.defaultModel === m.id ? color.accent : color.text,
                  fontSize: font.size.sm,
                }}
              >
                <span>{m.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <span style={{ fontSize: font.size.xs, color: color.textSub }}>{m.provider}</span>
                  {form.defaultModel === m.id && <Check size={14} color={color.accent} />}
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* Streaming */}
        <Section label="Streaming">
          <button
            onClick={() => setForm(f => ({ ...f, streamingEnabled: !f.streamingEnabled }))}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: `${spacing[3]} ${spacing[4]}`,
              background: color.bgCard, border: `1px solid ${color.border}`,
              borderRadius: radius.md, cursor: 'pointer',
              color: color.text, fontSize: font.size.sm,
            }}
          >
            <span>Streaming responses</span>
            <div style={{
              width: 44, height: 26, borderRadius: 13,
              background: form.streamingEnabled ? color.accent : color.bgHover,
              position: 'relative',
              transition: `background ${motion.fast} ${motion.easing}`,
            }}>
              <div style={{
                position: 'absolute', top: 3, left: form.streamingEnabled ? 21 : 3,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                transition: `left ${motion.fast} ${motion.easing}`,
              }} />
            </div>
          </button>
        </Section>

        {/* Save */}
        <button
          onClick={handleSave}
          style={{
            width: '100%', marginTop: spacing[2],
            padding: spacing[4],
            background: saved ? color.success : color.accent,
            border: 'none', borderRadius: radius.lg,
            color: '#fff', fontSize: font.size.md, fontWeight: font.weight.semibold,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing[2],
            transition: `background ${motion.fast} ${motion.easing}`,
          }}
          onTouchStart={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)' }}
          onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
        >
          {saved ? <><Check size={17} /> Saved!</> : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: spacing[6] }}>
      <div style={{
        fontSize: font.size.xs, fontWeight: font.weight.semibold,
        color: color.textSub, textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: spacing[3],
      }}>
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
    <div style={{ marginBottom: spacing[3] }}>
      <div style={{ fontSize: font.size.sm, color: color.textSub, marginBottom: spacing[2] }}>{label}</div>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          style={{
            width: '100%',
            padding: `${spacing[3]} 44px ${spacing[3]} ${spacing[4]}`,
            background: color.bgCard,
            border: `1px solid ${color.border}`,
            borderRadius: radius.md, color: color.text,
            fontSize: font.size.sm, boxSizing: 'border-box',
            fontFamily: 'monospace',
          }}
        />
        <button
          type="button"
          onClick={onToggle}
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: color.textSub, display: 'flex', padding: 4,
          }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}
