import { useState, useRef, useCallback, KeyboardEvent } from 'react'
import { useChatStore } from '@/store/chat'
import { useSendMessage } from '@/hooks/useSendMessage'
import { color, spacing, radius, font, motion } from '@/lib/tokens'
import { Send, Square, Paperclip, ChevronDown, X } from 'lucide-react'
import { MODELS, type ModelId, type Attachment } from '@/types'
import { nanoid } from '@/lib/nanoid'

export function ChatInput() {
  const { activeThreadId, threads, updateThread, messages } = useChatStore()
  const { send, cancel } = useSendMessage()

  const [value, setValue] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [modelOpen, setModelOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const thread = threads.find(t => t.id === activeThreadId)
  const activeMessages = activeThreadId ? (messages[activeThreadId] ?? []) : []
  const isStreaming = activeMessages.some(m => m.status === 'streaming')

  const autoResize = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px'
  }, [])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = useCallback(() => {
    if (!value.trim() && attachments.length === 0) return
    if (isStreaming) return
    send(value, attachments)
    setValue('')
    setAttachments([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, attachments, isStreaming, send])

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const loaded = await Promise.all(
      files.map(f => new Promise<Attachment>((res, rej) => {
        const reader = new FileReader()
        reader.onload = ev => res({
          id: nanoid(),
          name: f.name,
          type: f.type,
          size: f.size,
          dataUrl: ev.target?.result as string,
        })
        reader.onerror = rej
        reader.readAsDataURL(f)
      }))
    )
    setAttachments(prev => [...prev, ...loaded])
    e.target.value = ''
  }, [])

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const handleModelChange = async (model: ModelId) => {
    setModelOpen(false)
    if (activeThreadId) {
      await updateThread(activeThreadId, { model })
    }
  }

  if (!activeThreadId) return null

  return (
    <div style={{
      borderTop: `1px solid ${color.border}`,
      padding: `${spacing[3]} ${spacing[4]} ${spacing[4]}`,
      background: color.bgPanel,
      flexShrink: 0,
    }}>
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[3] }}>
          {attachments.map(att => (
            <div key={att.id} style={{
              display: 'flex', alignItems: 'center', gap: spacing[1],
              padding: `${spacing[1]} ${spacing[2]} ${spacing[1]} ${spacing[3]}`,
              background: color.bgCard, border: `1px solid ${color.border}`,
              borderRadius: radius.full, fontSize: font.size.xs, color: color.textMuted,
            }}>
              {att.type.startsWith('image/') ? '🖼' : <Paperclip size={10} />}
              <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
              <button
                onClick={() => removeAttachment(att.id)}
                style={{ background: 'none', border: 'none', color: color.textMuted, cursor: 'pointer', display: 'flex', padding: 2 }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: spacing[3],
        background: color.bgCard, border: `1px solid ${color.border}`,
        borderRadius: radius.lg, padding: `${spacing[3]} ${spacing[3]}`,
        transition: `border-color ${motion.fast} ${motion.easing}`,
      }}>
        {/* Attach */}
        <button
          onClick={() => fileRef.current?.click()}
          title="Attach file"
          style={iconBtnStyle}
        >
          <Paperclip size={15} />
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFile}
          accept="image/*,.pdf,.txt,.md,.json,.csv"
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => { setValue(e.target.value); autoResize() }}
          onKeyDown={handleKeyDown}
          placeholder="Message…"
          rows={1}
          style={{
            flex: 1, resize: 'none', border: 'none', outline: 'none',
            background: 'transparent', color: color.text,
            fontSize: font.size.base, lineHeight: '1.5',
            fontFamily: font.sans, padding: 0,
            scrollbarWidth: 'none',
          }}
          disabled={isStreaming}
        />

        {/* Send / Cancel */}
        {isStreaming ? (
          <button onClick={cancel} style={{ ...sendBtnStyle, background: color.error + '22' }}>
            <Square size={14} color={color.error} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim() && attachments.length === 0}
            style={{
              ...sendBtnStyle,
              background: value.trim() || attachments.length ? color.accent : color.bgHover,
              opacity: value.trim() || attachments.length ? 1 : 0.5,
              transition: `background ${motion.fast} ${motion.easing}, opacity ${motion.fast} ${motion.easing}`,
            }}
          >
            <Send size={14} color="#fff" />
          </button>
        )}
      </div>

      {/* Model selector */}
      <div style={{ marginTop: spacing[2], display: 'flex', alignItems: 'center', gap: spacing[2], position: 'relative' }}>
        <button
          onClick={() => setModelOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: spacing[1],
            background: 'none', border: 'none',
            color: color.textMuted, fontSize: font.size.xs, cursor: 'pointer',
            padding: `${spacing[1]} ${spacing[2]}`,
            borderRadius: radius.sm,
            transition: `color ${motion.fast} ${motion.easing}`,
          }}
        >
          {thread ? MODELS[thread.model]?.label ?? thread.model : 'Select model'}
          <ChevronDown size={10} />
        </button>
        <span style={{ fontSize: font.size.xs, color: color.textFaint }}>
          ↵ send · ⇧↵ newline
        </span>

        {/* Model dropdown */}
        {modelOpen && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 0, marginBottom: spacing[1],
            background: color.bgCard, border: `1px solid ${color.border}`,
            borderRadius: radius.md, overflow: 'hidden', zIndex: 100,
            boxShadow: '0 10px 30px rgba(0,0,0,.4)',
            minWidth: 180,
          }}>
            {(Object.values(MODELS)).map(m => (
              <button
                key={m.id}
                onClick={() => handleModelChange(m.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: `${spacing[3]} ${spacing[4]}`,
                  background: thread?.model === m.id ? color.accentDim : 'none',
                  border: 'none', cursor: 'pointer',
                  color: thread?.model === m.id ? color.accent : color.text,
                  fontSize: font.size.sm,
                }}
              >
                {m.label}
                <span style={{ fontSize: font.size.xs, color: color.textMuted, marginLeft: spacing[2] }}>
                  {m.provider}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const iconBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none',
  color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: spacing[1], borderRadius: radius.sm, flexShrink: 0,
}

const sendBtnStyle: React.CSSProperties = {
  width: 32, height: 32, flexShrink: 0,
  border: 'none', borderRadius: radius.sm,
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

// fix token import
const color_bgHover = '#1c1c27'
void color_bgHover
