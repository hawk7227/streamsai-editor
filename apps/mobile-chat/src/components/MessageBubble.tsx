import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import DOMPurify from 'dompurify'
import { color, spacing, radius, font, motion } from '@/lib/tokens'
import type { Message } from '@/types'
import { AlertCircle, Copy, Check, Paperclip } from 'lucide-react'
import { useState, useCallback } from 'react'
import dayjs from 'dayjs'

interface Props {
  message: Message
  isLast: boolean
}

export const MessageBubble = memo(function MessageBubble({ message, isLast }: Props) {
  const isUser = message.role === 'user'
  const isStreaming = message.status === 'streaming'
  const isError = message.status === 'error'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      marginBottom: spacing[4],
      animation: `fadeSlideIn ${motion.normal} ${motion.easing}`,
    }}>
      {/* Attachments */}
      {message.attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[2], maxWidth: '85%' }}>
          {message.attachments.map(att => (
            <AttachmentChip key={att.id} name={att.name} type={att.type} />
          ))}
        </div>
      )}

      {/* Bubble */}
      <div style={{
        maxWidth: '85%',
        padding: `${spacing[3]} ${spacing[4]}`,
        borderRadius: isUser ? `${radius.lg} ${radius.lg} ${radius.sm} ${radius.lg}` : `${radius.lg} ${radius.lg} ${radius.lg} ${radius.sm}`,
        background: isError
          ? color.errorDim
          : isUser
          ? color.userBubble
          : color.assistantBubble,
        border: isUser
          ? `1px solid ${color.userBubbleBorder}`
          : isError
          ? `1px solid ${color.error}30`
          : `1px solid ${color.border}`,
        color: color.text,
        fontSize: font.size.base,
        lineHeight: '1.6',
        position: 'relative',
        wordBreak: 'break-word',
      }}>
        {isError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], color: color.error, marginBottom: spacing[2], fontSize: font.size.sm }}>
            <AlertCircle size={14} />
            <span>Error</span>
          </div>
        )}

        {isUser ? (
          <UserContent content={message.content} />
        ) : (
          <AssistantContent content={message.content} isStreaming={isStreaming} isLast={isLast} />
        )}
      </div>

      {/* Timestamp + tokens */}
      <div style={{ fontSize: font.size.xs, color: color.textFaint, marginTop: spacing[1], paddingInline: spacing[1] }}>
        {dayjs(message.createdAt).format('HH:mm')}
        {message.tokens && <span style={{ marginLeft: spacing[2] }}>{message.tokens} tokens</span>}
      </div>
    </div>
  )
})

// ─── User content — plain text, no markdown (sanitized) ──────────────────────

function UserContent({ content }: { content: string }) {
  const safe = DOMPurify.sanitize(content, { ALLOWED_TAGS: [] })
  return <span style={{ whiteSpace: 'pre-wrap' }}>{safe}</span>
}

// ─── Assistant content — full markdown with code blocks ──────────────────────

function AssistantContent({ content, isStreaming, isLast }: { content: string; isStreaming: boolean; isLast: boolean }) {
  return (
    <div style={{ '--code-bg': '#1a1b26' } as React.CSSProperties}>
      <ReactMarkdown
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className ?? '')
            const code = String(children).replace(/\n$/, '')
            if (match) {
              return (
                <CodeBlock language={match[1]} code={code} />
              )
            }
            return (
              <code
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.88em',
                  fontFamily: font.mono,
                }}
                {...props}
              >
                {children}
              </code>
            )
          },
          p({ children }) {
            return <p style={{ margin: `0 0 ${spacing[3]}`, lineHeight: '1.65' }}>{children}</p>
          },
          ul({ children }) {
            return <ul style={{ margin: `0 0 ${spacing[3]}`, paddingLeft: spacing[5], lineHeight: '1.65' }}>{children}</ul>
          },
          ol({ children }) {
            return <ol style={{ margin: `0 0 ${spacing[3]}`, paddingLeft: spacing[5], lineHeight: '1.65' }}>{children}</ol>
          },
          blockquote({ children }) {
            return (
              <blockquote style={{
                margin: `0 0 ${spacing[3]}`, paddingLeft: spacing[4],
                borderLeft: `3px solid ${color.accent}`,
                color: color.textMuted,
              }}>{children}</blockquote>
            )
          },
          h1({ children }) { return <h1 style={{ fontSize: font.size.lg, fontWeight: font.weight.bold, margin: `0 0 ${spacing[3]}` }}>{children}</h1> },
          h2({ children }) { return <h2 style={{ fontSize: font.size.md, fontWeight: font.weight.semibold, margin: `0 0 ${spacing[2]}` }}>{children}</h2> },
          h3({ children }) { return <h3 style={{ fontSize: font.size.base, fontWeight: font.weight.semibold, margin: `0 0 ${spacing[2]}` }}>{children}</h3> },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && isLast && <StreamCursor />}
    </div>
  )
}

// ─── Code block with copy button ─────────────────────────────────────────────

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div style={{
      position: 'relative', margin: `${spacing[2]} 0`,
      borderRadius: radius.md, overflow: 'hidden',
      border: `1px solid ${color.border}`,
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${spacing[2]} ${spacing[3]}`,
        background: '#12121a', borderBottom: `1px solid ${color.border}`,
      }}>
        <span style={{ fontSize: font.size.xs, color: color.textFaint, fontFamily: font.mono, textTransform: 'lowercase' }}>
          {language}
        </span>
        <button
          onClick={copy}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none',
            color: copied ? color.success : color.textMuted,
            fontSize: font.size.xs, cursor: 'pointer',
            transition: `color ${motion.fast} ${motion.easing}`,
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0, borderRadius: 0,
          fontSize: '13px', lineHeight: '1.6',
          padding: spacing[4],
          maxHeight: '400px', overflowY: 'auto',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

// ─── Streaming cursor ─────────────────────────────────────────────────────────

function StreamCursor() {
  return (
    <span style={{
      display: 'inline-block',
      width: '2px', height: '1em',
      background: color.accent,
      marginLeft: '2px',
      verticalAlign: 'text-bottom',
      animation: 'blink 1s step-end infinite',
    }} />
  )
}

// ─── Attachment chip ──────────────────────────────────────────────────────────

function AttachmentChip({ name, type }: { name: string; type: string }) {
  const isImage = type.startsWith('image/')
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: spacing[2],
      padding: `${spacing[1]} ${spacing[3]}`,
      background: color.bgCard, border: `1px solid ${color.border}`,
      borderRadius: radius.full, fontSize: font.size.xs, color: color.textMuted,
    }}>
      {isImage ? '🖼' : <Paperclip size={10} />}
      <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
    </div>
  )
}
