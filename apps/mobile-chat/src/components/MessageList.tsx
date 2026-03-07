import { useEffect, useRef, memo } from 'react'
import { useChatStore } from '@/store/chat'
import { MessageBubble } from './MessageBubble'
import { color, spacing, font } from '@/lib/tokens'
import { Zap } from 'lucide-react'

interface Props { threadId: string }

export const MessageList = memo(function MessageList({ threadId }: Props) {
  const messages = useChatStore(s => s.messages[threadId] ?? [])
  const isLoading = useChatStore(s => s.isLoadingMessages)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)

  const onScroll = () => {
    const el = containerRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100
  }

  useEffect(() => {
    if (atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    atBottomRef.current = true
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
    })
  }, [threadId])

  if (isLoading) {
    return (
      <div style={centerStyle}>
        <div style={{
          width: 28, height: 28,
          border: `2px solid ${color.border}`,
          borderTop: `2px solid ${color.accent}`,
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div style={centerStyle}>
        <Zap size={28} color={color.accent} style={{ marginBottom: spacing[3] }} />
        <p style={{ color: color.textSub, fontSize: font.size.base, textAlign: 'center', lineHeight: String(1.5) }}>
          Ask anything to get started
        </p>
      </div>
    )
  }

  // Group consecutive messages to control time display
  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch' as const,
        paddingTop: spacing[4],
        paddingBottom: spacing[3],
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {messages.map((msg, i) => {
        const next = messages[i + 1]
        // Show time if last in thread or next message is from different sender or >5min gap
        const showTime = !next
          || next.role !== msg.role
          || next.createdAt - msg.createdAt > 5 * 60 * 1000
        return (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLast={i === messages.length - 1}
            showTime={showTime}
          />
        )
      })}
      <div ref={bottomRef} style={{ height: 8 }} />
    </div>
  )
})

const centerStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: spacing[8],
}
