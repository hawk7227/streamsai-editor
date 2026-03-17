import { useState, useRef, useCallback, KeyboardEvent } from 'react'
import { useChatStore } from '@/store/chat'
import { useSendMessage } from '@/hooks/useSendMessage'
import { color, spacing, radius, font, motion } from '@/lib/tokens'
import { Paperclip, ArrowUp, Square, X } from 'lucide-react'
import type { ModelId, Attachment } from '@/types'
import { MODELS } from '@/types'
import { nanoid } from '@/lib/nanoid'

export function ChatInput() {
  const { activeThreadId, threads, updateThread, messages } = useChatStore()
  const { send, cancel } = useSendMessage()

  const [value, setValue] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [modelOpen, setModelOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const thread = threads.find(t => t.id === activeThreadId)
  const activeMessages = activeThreadId ? (messages[activeThreadId] ?? []) : []
  const isStreaming = activeMessages.some(m => m.status === 'streaming')
  const canSend = (value.trim().length > 0 || attachments.length > 0) && !isStreaming && !uploading

  const autoResize = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'
  }, [])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = useCallback(() => {
    if (!canSend) return
    send(value, attachments)
    setValue('')
    setAttachments([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [canSend, value, attachments, send])

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    try {
      const loaded = await Promise.all(
        files.map(f => new Promise<Attachment>((res, rej) => {
          const reader = new FileReader()
          reader.onload = ev => res({
            id: nanoid(), name: f.name, type: f.type, size: f.size,
            dataUrl: ev.target?.result as string,
          })
          reader.onerror = rej
          reader.readAsDataURL(f)
        }))
      )
      setAttachments(prev => [...prev, ...loaded])
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }, [])

  if (!activeThreadId) return null

  return (
    <div style={{
      flexShrink: 0,
      background: color.bgElevated,
      borderTop: `1px solid ${color.border}`,
      paddingTop: spacing[3],
      paddingLeft: spacing[3],
      paddingRight: spacing[3],
      paddingBottom: `max(${spacing[4]}, env(safe-area-inset-bottom, 16px))`,
    }}>
      {/* Upload progress */}
      {uploading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2], padding: '6px 10px', background: 'rgba(68,195,166,0.08)', borderRadius: radius.md, border: '1px solid rgba(68,195,166,0.2)' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(68,195,166,0.3)', borderTop: `2px solid ${color.accent}`, animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
          <span style={{ fontSize: font.size.xs, color: color.accent }}>Reading file…</span>
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[2] }}>
          {attachments.map(att => (
            <div key={att.id} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: att.type.startsWith('image/') ? '3px 8px 3px 3px' : '4px 8px 4px 10px',
              background: color.bgCard, borderRadius: radius.sm,
              fontSize: font.size.xs, color: color.textSub,
              border: `1px solid ${color.border}`,
              maxWidth: 180,
            }}>
              {att.type.startsWith('image/') && (
                <img src={att.dataUrl} alt={att.name} style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
              )}
              {!att.type.startsWith('image/') && (
                <span style={{ fontSize: 14, flexShrink: 0 }}>📄</span>
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {att.name}
              </span>
              <button
                onClick={() => setAttachments(p => p.filter(a => a.id !== att.id))}
                style={{ background: 'none', border: 'none', color: color.textSub, display: 'flex', padding: 2, flexShrink: 0 }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: spacing[2],
        background: color.bgInput,
        borderRadius: radius.xl,
        border: `1px solid ${color.border}`,
        padding: `${spacing[2]} ${spacing[2]} ${spacing[2]} ${spacing[3]}`,
        minHeight: 48,
        position: 'relative',
      }}>
        {/* Attach button */}
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            width: 32, height: 32, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none',
            color: color.textSub, borderRadius: radius.md,
            marginBottom: 2,
          }}
        >
          <Paperclip size={18} strokeWidth={1.5} />
        </button>
        <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={handleFile}
          accept="image/*,.pdf,.txt,.md,.json,.csv,.ts,.tsx,.js,.jsx,.html,.css,.xml,.yaml,.yml,.sh,.py" />

        {/* Model pill — inside input bar, left of textarea */}
        <div style={{ position: 'relative', flexShrink: 0, marginBottom: 2 }}>
          <button
            onClick={() => setModelOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.35)', fontSize: 11,
              padding: '3px 7px', borderRadius: radius.full, cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: color.accent, display: 'inline-block', flexShrink: 0 }} />
            {thread ? (MODELS[thread.model]?.label ?? thread.model) : 'Model'}
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>▾</span>
          </button>
          {/* Model picker */}
          {modelOpen && (
            <div style={{
              position: 'absolute', bottom: '100%', left: 0, marginBottom: spacing[2],
              background: color.bgCard, border: `1px solid ${color.border}`,
              borderRadius: radius.md, overflow: 'hidden', zIndex: 100,
              boxShadow: '0 -8px 30px rgba(0,0,0,0.5)',
              minWidth: 200,
              animation: `slideUp 150ms ${motion.easing}`,
            }}>
              {Object.values(MODELS).map(m => (
                <button
                  key={m.id}
                  onClick={async () => {
                    setModelOpen(false)
                    if (activeThreadId) await updateThread(activeThreadId, { model: m.id as ModelId })
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: `${spacing[3]} ${spacing[4]}`,
                    background: thread?.model === m.id ? color.accentDim : 'none',
                    border: 'none', cursor: 'pointer',
                    color: thread?.model === m.id ? color.accent : color.text,
                    fontSize: font.size.sm, textAlign: 'left',
                    borderBottom: `1px solid ${color.border}`,
                  }}
                >
                  <span>{m.label}</span>
                  <span style={{ fontSize: font.size.xs, color: color.textSub }}>{m.provider}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => { setValue(e.target.value); autoResize() }}
          onKeyDown={handleKeyDown}
          placeholder="Message"
          rows={1}
          disabled={isStreaming}
          style={{
            flex: 1, resize: 'none', border: 'none', outline: 'none',
            background: 'transparent', color: color.text,
            fontSize: font.size.base, lineHeight: String(1.5),
            fontFamily: font.sans, padding: 0,
            alignSelf: 'center',
            caretColor: color.accent,
          }}
        />

        {/* Send / Stop */}
        {isStreaming ? (
          <button
            onClick={cancel}
            style={{
              width: 34, height: 34, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: color.error, border: 'none', borderRadius: radius.md,
              transition: `transform ${motion.snap} ${motion.easing}`,
            }}
            onTouchStart={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)' }}
            onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
          >
            <Square size={14} color="#fff" fill="#fff" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{
              width: 34, height: 34, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: canSend ? color.accent : color.bgCard,
              border: 'none', borderRadius: radius.md,
              transition: `background ${motion.fast} ${motion.easing}, transform ${motion.snap} ${motion.easing}`,
            }}
            onTouchStart={e => { if (canSend) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)' }}
            onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
          >
            <ArrowUp size={18} color={canSend ? '#fff' : color.textFaint} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  )
}
