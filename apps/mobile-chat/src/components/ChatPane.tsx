import { useEffect } from 'react'
import { useChatStore } from '@/store/chat'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { color, spacing, radius, font, motion } from '@/lib/tokens'
import { Menu, Pencil, Bot } from 'lucide-react'
import { MODELS } from '@/types'

export function ChatPane() {
  const { activeThreadId, threads, loadMessages, setSidebarOpen, sidebarOpen, createThread, selectThread } = useChatStore()
  const thread = threads.find(t => t.id === activeThreadId)

  useEffect(() => {
    if (activeThreadId) {
      loadMessages(activeThreadId)
    }
  }, [activeThreadId, loadMessages])

  if (!activeThreadId || !thread) {
    return <EmptyState onNew={async () => { const id = await createThread(); selectThread(id) }} onToggle={() => setSidebarOpen(!sidebarOpen)} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: color.bg }}>
      {/* Thread header — with iOS safe area top */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: spacing[3],
        paddingTop: `max(${spacing[3]}, env(safe-area-inset-top))`,
        paddingBottom: spacing[3],
        paddingLeft: spacing[4],
        paddingRight: spacing[4],
        borderBottom: `1px solid ${color.border}`,
        flexShrink: 0, background: color.bgPanel,
      }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ background: 'none', border: 'none', color: color.textMuted, cursor: 'pointer', display: 'flex', padding: 4, borderRadius: radius.sm }}
        >
          <Menu size={16} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: font.size.base, fontWeight: font.weight.semibold, color: color.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {thread.title}
          </div>
          <div style={{ fontSize: font.size.xs, color: color.textMuted }}>
            {MODELS[thread.model]?.label ?? thread.model}
          </div>
        </div>

        <RenameButton threadId={thread.id} currentTitle={thread.title} />
      </div>

      {/* Messages */}
      <MessageList threadId={activeThreadId} />

      {/* Input */}
      <ChatInput />
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ onNew, onToggle }: { onNew: () => void; onToggle: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: color.bg }}>
      <div style={{
        paddingTop: `max(${spacing[3]}, env(safe-area-inset-top))`,
        paddingBottom: spacing[3],
        paddingLeft: spacing[4],
        paddingRight: spacing[4],
        borderBottom: `1px solid ${color.border}`,
        flexShrink: 0,
      }}>
        <button onClick={onToggle} style={{ background: 'none', border: 'none', color: color.textMuted, cursor: 'pointer', display: 'flex', padding: 4 }}>
          <Menu size={20} />
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: spacing[8] }}>
        <div style={{
          width: 56, height: 56, borderRadius: radius.xl,
          background: color.accentDim, display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: spacing[4],
        }}>
          <Bot size={24} color={color.accent} />
        </div>
        <h2 style={{ fontSize: font.size.lg, fontWeight: font.weight.semibold, color: color.text, margin: `0 0 ${spacing[2]}` }}>
          StreamsAI Chat
        </h2>
        <p style={{ fontSize: font.size.sm, color: color.textMuted, textAlign: 'center', margin: `0 0 ${spacing[6]}`, maxWidth: 260 }}>
          Multi-model AI chat with Anthropic and OpenAI. Conversations stored locally.
        </p>
        <button
          onClick={onNew}
          style={{
            padding: `${spacing[3]} ${spacing[6]}`,
            background: color.accent, color: '#fff',
            border: 'none', borderRadius: radius.full,
            fontSize: font.size.base, fontWeight: font.weight.semibold,
            cursor: 'pointer',
            transition: `opacity ${motion.fast} ${motion.easing}`,
          }}
        >
          Start a conversation
        </button>
      </div>
    </div>
  )
}

// ─── Inline rename button ─────────────────────────────────────────────────────

function RenameButton({ threadId, currentTitle }: { threadId: string; currentTitle: string }) {
  const updateThread = useChatStore(s => s.updateThread)

  const handleRename = () => {
    const title = window.prompt('Rename conversation:', currentTitle)
    if (title && title.trim()) {
      updateThread(threadId, { title: title.trim() })
    }
  }

  return (
    <button
      onClick={handleRename}
      title="Rename"
      style={{ background: 'none', border: 'none', color: color.textMuted, cursor: 'pointer', display: 'flex', padding: 4, borderRadius: radius.sm }}
    >
      <Pencil size={14} />
    </button>
  )
}
