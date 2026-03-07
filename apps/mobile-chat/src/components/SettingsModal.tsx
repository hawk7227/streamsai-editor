import { useState, useEffect } from 'react'
import { useChatStore } from '@/store/chat'
import { color, spacing, radius, font, motion } from '@/lib/tokens'
import { X, Check, Settings, Zap } from 'lucide-react'
import { MODELS, type AppSettings } from '@/types'

export function SettingsModal() {
  const { settings, saveSettings, settingsOpen, setSettingsOpen } = useChatStore()

  const [form, setForm] = useState<AppSettings>({
    defaultModel: 'claude-sonnet-4-5',
    streamingEnabled: true,
    theme: 'dark',
  })
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
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: color.borderStrong, margin: `0 auto ${spacing[5]}` }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[6] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
            <Settings size={18} color={color.accent} />
            <span style={{ fontSize: font.size.lg, fontWeight: font.weight.bold, color: color.text }}>Settings</span>
          </div>
          <button onClick={() => setSettingsOpen(false)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: color.bgCard, border: 'none', borderRadius: radius.full, color: color.textSub }}>
            <X size={16} />
          </button>
        </div>

        {/* API notice */}
        <div style={{
          marginBottom: spacing[6],
          padding: spacing[4],
          background: color.accentDim,
          border: `1px solid ${color.accent}30`,
          borderRadius: radius.md,
          display: 'flex', gap: spacing[3], alignItems: 'flex-start',
        }}>
          <Zap size={16} color={color.accent} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: font.size.sm, color: color.textSub, lineHeight: String(1.5), margin: 0 }}>
            API keys are stored securely on the server. Your conversations are processed server-side and never expose credentials to the browser.
          </p>
        </div>

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
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: font.weight.medium }}>{m.label}</div>
                  <div style={{ fontSize: font.size.xs, color: color.textSub, marginTop: 2 }}>
                    {m.provider} · {(m.contextWindow / 1000).toFixed(0)}k context
                  </div>
                </div>
                {form.defaultModel === m.id && <Check size={16} color={color.accent} />}
              </button>
            ))}
          </div>
        </Section>

        {/* Streaming */}
        <Section label="Responses">
          <button
            onClick={() => setForm(f => ({ ...f, streamingEnabled: !f.streamingEnabled }))}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: `${spacing[3]} ${spacing[4]}`,
              background: color.bgCard, border: `1px solid ${color.border}`,
              borderRadius: radius.md, cursor: 'pointer', color: color.text, fontSize: font.size.sm,
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: font.weight.medium }}>Streaming</div>
              <div style={{ fontSize: font.size.xs, color: color.textSub, marginTop: 2 }}>Show response as it generates</div>
            </div>
            <div style={{
              width: 44, height: 26, borderRadius: 13,
              background: form.streamingEnabled ? color.accent : color.bgHover,
              position: 'relative', flexShrink: 0,
              transition: `background ${motion.fast} ${motion.easing}`,
            }}>
              <div style={{
                position: 'absolute', top: 3,
                left: form.streamingEnabled ? 21 : 3,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                transition: `left ${motion.fast} ${motion.easing}`,
              }} />
            </div>
          </button>
        </Section>

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
      <div style={{ fontSize: font.size.xs, fontWeight: font.weight.semibold, color: color.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: spacing[3] }}>
        {label}
      </div>
      {children}
    </div>
  )
}
