import { useEffect } from 'react'
import { useChatStore } from '@/store/chat'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { color, spacing, font, motion, radius } from '@/lib/tokens'
import { AlignLeft, Pencil, Zap } from 'lucide-react'
import { MODELS } from '@/types'

export function ChatPane() {
  const { activeThreadId, threads, loadMessages, setSidebarOpen, sidebarOpen, createThread, selectThread } = useChatStore()
  const thread = threads.find(t => t.id === activeThreadId)

  useEffect(() => {
    if (activeThreadId) loadMessages(activeThreadId)
  }, [activeThreadId, loadMessages])

  if (!activeThreadId || !thread) {
    return <EmptyState
      onNew={async () => { const id = await createThread(); selectThread(id) }}
      onToggle={() => setSidebarOpen(!sidebarOpen)}
    />
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%',
      background: color.bg,
    }}>
      {/* Header */}
      <div style={{
        flexShrink: 0,
        background: color.bgElevated,
        borderBottom: `1px solid ${color.border}`,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          height: 52,
          paddingLeft: spacing[2],
          paddingRight: spacing[4],
          gap: spacing[2],
        }}>
          {/* Hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              width: 44, height: 44, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', color: color.accent,
              borderRadius: radius.md,
            }}
          >
            <AlignLeft size={22} strokeWidth={2} />
          </button>

          {/* Title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: font.size.md, fontWeight: font.weight.semibold,
              color: color.text, lineHeight: 1.2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {thread.title}
            </div>
            <div style={{
              fontSize: font.size.xs, color: color.textSub, marginTop: 1,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Zap size={9} color={color.accent} />
              {MODELS[thread.model]?.label ?? thread.model}
            </div>
          </div>

          {/* Rename */}
          <button
            onClick={() => {
              const title = window.prompt('Rename conversation:', thread.title)
              if (title?.trim()) useChatStore.getState().updateThread(thread.id, { title: title.trim() })
            }}
            style={{
              width: 44, height: 44, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', color: color.textSub,
              borderRadius: radius.md,
            }}
          >
            <Pencil size={17} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <MessageList threadId={activeThreadId} />

      {/* Input */}
      <ChatInput />
    </div>
  )
}

function EmptyState({ onNew, onToggle }: { onNew: () => void; onToggle: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: color.bg }}>
      {/* Header */}
      <div style={{
        flexShrink: 0,
        background: color.bgElevated,
        borderBottom: `1px solid ${color.border}`,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          height: 52, paddingLeft: spacing[2],
        }}>
          <button
            onClick={onToggle}
            style={{
              width: 44, height: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', color: color.accent,
            }}
          >
            <AlignLeft size={22} strokeWidth={2} />
          </button>
          <span style={{ fontSize: font.size.md, fontWeight: font.weight.semibold, color: color.text, marginLeft: spacing[2] }}>
            StreamsAI
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: spacing[8], gap: spacing[6],
      }}>
        {/* Logo */}
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: `linear-gradient(135deg, ${color.accent}, #16a34a)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 40px ${color.accentGlow}`,
        }}>
          <Zap size={32} color="#fff" strokeWidth={2.5} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: font.size.xl, fontWeight: font.weight.bold, color: color.text, marginBottom: spacing[2] }}>
            StreamsAI Chat
          </div>
          <div style={{ fontSize: font.size.base, color: color.textSub, lineHeight: 1.5, maxWidth: 240 }}>
            Multi-model AI. Claude, GPT-4o. Conversations stored on your device.
          </div>
        </div>

        <button
          onClick={onNew}
          style={{
            padding: `${spacing[4]} ${spacing[8]}`,
            background: color.accent,
            color: '#fff', border: 'none',
            borderRadius: radius.full,
            fontSize: font.size.md, fontWeight: font.weight.semibold,
            boxShadow: `0 4px 20px ${color.accentGlow}`,
            transition: `transform ${motion.snap} ${motion.easing}, box-shadow ${motion.snap} ${motion.easing}`,
            minWidth: 200,
          }}
          onTouchStart={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)' }}
          onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
        >
          New Conversation
        </button>
      </div>
    </div>
  )
}
