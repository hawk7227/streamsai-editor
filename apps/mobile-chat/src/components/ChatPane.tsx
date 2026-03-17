import { useEffect } from 'react'
import { useChatStore } from '@/store/chat'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { color, spacing, font, motion, radius } from '@/lib/tokens'
import { AlignLeft, Zap } from 'lucide-react'

export function ChatPane() {
  const { activeThreadId, threads, loadMessages, setSidebarOpen, sidebarOpen, createThread, selectThread } = useChatStore()
  const thread = threads.find((t: { id: string }) => t.id === activeThreadId)

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
      position: 'relative',
    }}>
      {/* Floating top bar — minimal, overlaid, not a full header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        zIndex: 10,
        display: 'flex', alignItems: 'center',
        padding: '8px 12px 8px 6px',
        background: `linear-gradient(to bottom, ${color.bg} 60%, transparent)`,
        pointerEvents: 'none',
      }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            width: 32, height: 32, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.35)',
            borderRadius: radius.md,
            cursor: 'pointer',
            pointerEvents: 'auto',
            transition: `color ${motion.snap} ${motion.easing}`,
          }}
        >
          <AlignLeft size={15} strokeWidth={1.8} />
        </button>
        <div style={{
          flex: 1, minWidth: 0, paddingLeft: 10,
          fontSize: 12, color: 'rgba(255,255,255,0.25)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontWeight: 500, letterSpacing: '0.01em',
        }}>
          {thread.title === 'New conversation' ? '' : thread.title}
        </div>
      </div>

      {/* Messages — with top padding so content clears the overlay */}
      <div style={{ flex: 1, minHeight: 0, paddingTop: 40 }}>
        <MessageList threadId={activeThreadId} />
      </div>

      {/* Input */}
      <ChatInput />
    </div>
  )
}

function EmptyState({ onNew, onToggle }: { onNew: () => void; onToggle: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: color.bg, position: 'relative' }}>

      {/* Minimal floating toggle */}
      <div style={{ position: 'absolute', top: 8, left: 6, zIndex: 10 }}>
        <button
          onClick={onToggle}
          style={{
            width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.35)',
            borderRadius: radius.md, cursor: 'pointer',
          }}
        >
          <AlignLeft size={15} strokeWidth={1.8} />
        </button>
      </div>

      {/* Body */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: spacing[8], gap: spacing[6],
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: `linear-gradient(135deg, ${color.accent}, #16a34a)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 40px ${color.accentGlow}`,
        }}>
          <Zap size={28} color="#fff" strokeWidth={2.5} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: font.size.xl, fontWeight: font.weight.bold, color: color.text, marginBottom: spacing[2] }}>
            StreamsAI
          </div>
          <div style={{ fontSize: font.size.base, color: color.textSub, lineHeight: 1.5, maxWidth: 240 }}>
            Builder assistant with live preview
          </div>
        </div>

        <button
          onClick={onNew}
          style={{
            padding: `${spacing[3]} ${spacing[8]}`,
            background: color.accent,
            color: '#fff', border: 'none',
            borderRadius: radius.full,
            fontSize: font.size.base, fontWeight: font.weight.semibold,
            boxShadow: `0 4px 20px ${color.accentGlow}`,
            transition: `transform ${motion.snap} ${motion.easing}`,
            minWidth: 180, cursor: 'pointer',
          }}
        >
          New conversation
        </button>
      </div>
    </div>
  )
}
