import { useEffect, useRef, memo } from 'react'
import { useChatStore } from '@/store/chat'
import { MessageBubble } from './MessageBubble'
import { color, spacing, font } from '@/lib/tokens'
import { MessageSquare } from 'lucide-react'

interface Props {
  threadId: string
}

export const MessageList = memo(function MessageList({ threadId }: Props) {
  const messages = useChatStore(s => s.messages[threadId] ?? [])
  const isLoading = useChatStore(s => s.isLoadingMessages)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const wasAtBottomRef = useRef(true)

  // Track whether user scrolled up
  const onScroll = () => {
    const el = containerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    wasAtBottomRef.current = atBottom
  }

  // Auto-scroll when messages change, only if user was at bottom
  useEffect(() => {
    if (wasAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Scroll to bottom on thread switch
  useEffect(() => {
    wasAtBottomRef.current = true
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [threadId])

  if (isLoading) {
    return (
      <div style={centerStyle}>
        <Spinner />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div style={centerStyle}>
        <MessageSquare size={32} color={color.textFaint} style={{ marginBottom: spacing[4] }} />
        <p style={{ color: color.textMuted, fontSize: font.size.sm, textAlign: 'center', margin: 0 }}>
          No messages yet.<br />Send one to get started.
        </p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: `${spacing[4]} ${spacing[4]} ${spacing[2]}`,
        display: 'flex',
        flexDirection: 'column',
        // Custom scrollbar
        scrollbarWidth: 'thin',
        scrollbarColor: `${color.border} transparent`,
      }}
    >
      {messages.map((msg, i) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isLast={i === messages.length - 1}
        />
      ))}
      <div ref={bottomRef} style={{ height: 1 }} />
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

function Spinner() {
  return (
    <div style={{
      width: 24, height: 24,
      border: `2px solid ${color.border}`,
      borderTop: `2px solid ${color.accent}`,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}
