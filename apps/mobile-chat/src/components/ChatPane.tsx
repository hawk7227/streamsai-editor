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
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          height: 36,
          paddingLeft: spacing[2],
          paddingRight: spacing[3],
          gap: spacing[2],
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              width: 32, height: 32, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
              borderRadius: radius.sm,
            }}
          >
            <AlignLeft size={16} strokeWidth={2} />
          </button>
          <div style={{
            flex: 1, minWidth: 0,
            fontSize: font.size.sm, fontWeight: font.weight.medium,
            color: 'rgba(255,255,255,0.7)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {thread.title}
          </div>
          <button
            onClick={() => {
              const title = window.prompt('Rename conversation:', thread.title)
              if (title?.trim()) useChatStore.getState().updateThread(thread.id, { title: title.trim() })
            }}
            style={{
              width: 28, height: 28, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
              borderRadius: radius.sm,
            }}
          >
            <Pencil size={13} strokeWidth={1.5} />
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
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          height: 36, paddingLeft: spacing[2],
        }}>
          <button
            onClick={onToggle}
            style={{
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            }}
          >
            <AlignLeft size={16} strokeWidth={2} />
          </button>
          <span style={{ fontSize: font.size.sm, fontWeight: font.weight.medium, color: 'rgba(255,255,255,0.6)', marginLeft: spacing[2] }}>
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
