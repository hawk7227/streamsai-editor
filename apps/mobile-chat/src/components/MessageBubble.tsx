import { memo, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import DOMPurify from 'dompurify'
import { color, spacing, radius, font, motion } from '@/lib/tokens'
import type { Message } from '@/types'
import { Copy, Check, AlertCircle, Play } from 'lucide-react'
import { extractPreviewCandidate } from '@/lib/preview'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface Props {
  message: Message
  isLast: boolean
  showTime: boolean
}

export const MessageBubble = memo(function MessageBubble({ message, isLast, showTime }: Props) {
  const isUser = message.role === 'user'
  const isStreaming = message.status === 'streaming'
  const isError = message.status === 'error'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      marginBottom: showTime ? spacing[1] : '2px',
      paddingInline: spacing[4],
      animation: `msgIn 200ms ${motion.easing} both`,
    }}>
      {/* Bubble */}
      <div style={{
        maxWidth: 'min(92%, 920px)',
        padding: isUser ? `${spacing[3]} ${spacing[4]}` : `${spacing[3]} ${spacing[4]}`,
        borderRadius: isUser
          ? `${radius.lg} ${radius.sm} ${radius.lg} ${radius.lg}`
          : `${radius.sm} ${radius.lg} ${radius.lg} ${radius.lg}`,
        background: isError
          ? color.errorDim
          : isUser
          ? `linear-gradient(160deg, ${color.userBgLight}, ${color.userBg})`
          : color.aiBg,
        border: isUser
          ? 'none'
          : `1px solid ${isError ? color.error + '40' : color.aiBorder}`,
        color: isUser ? color.userText : color.aiText,
        fontSize: font.size.base,
        lineHeight: String(1.7),
        wordBreak: 'break-word',
        boxShadow: isUser
          ? `0 2px 12px rgba(26,122,74,0.35)`
          : '0 1px 4px rgba(0,0,0,0.3)',
        position: 'relative',
      }}>
        {isError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], color: color.error, marginBottom: spacing[2], fontSize: font.size.sm }}>
            <AlertCircle size={13} /> Error
          </div>
        )}

        {isUser
          ? <span style={{ whiteSpace: 'pre-wrap' }}>{DOMPurify.sanitize(message.content, { ALLOWED_TAGS: [] })}</span>
          : <AssistantContent content={message.content} isStreaming={isStreaming} isLast={isLast} />
        }
      </div>

      {/* Time + tokens */}
      {showTime && (
        <div style={{
          fontSize: font.size.xs, color: color.textFaint,
          marginTop: '3px',
          paddingInline: '2px',
          display: 'flex', gap: spacing[2], alignItems: 'center',
        }}>
          {dayjs(message.createdAt).format('h:mm A')}
          {message.tokens && (
            <span style={{ color: color.textFaint }}>{message.tokens} tok</span>
          )}
        </div>
      )}
    </div>
  )
})

// ─── Assistant content ────────────────────────────────────────────────────────

function AssistantContent({ content, isStreaming, isLast }: {
  content: string; isStreaming: boolean; isLast: boolean
}) {
  if (!content && isStreaming) return <TypingIndicator />

  return (
    <div>
      <ReactMarkdown
        components={{
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className ?? '')
            const code = String(children).replace(/\n$/, '')
            return match
              ? <CodeBlock language={match[1]} code={code} />
              : <InlineCode>{code}</InlineCode>
          },
          p({ children }) {
            return <p style={{ margin: 0, marginBottom: spacing[2], lineHeight: String(1.6) }}>{children}</p>
          },
          ul({ children }) {
            return <ul style={{ margin: `0 0 ${spacing[2]}`, paddingLeft: spacing[5], lineHeight: String(1.6) }}>{children}</ul>
          },
          ol({ children }) {
            return <ol style={{ margin: `0 0 ${spacing[2]}`, paddingLeft: spacing[5], lineHeight: String(1.6) }}>{children}</ol>
          },
          li({ children }) {
            return <li style={{ marginBottom: '2px' }}>{children}</li>
          },
          blockquote({ children }) {
            return (
              <blockquote style={{
                margin: `0 0 ${spacing[2]}`,
                paddingLeft: spacing[3],
                borderLeft: `3px solid ${color.accent}`,
                color: color.textSub,
              }}>{children}</blockquote>
            )
          },
          h1({ children }) { return <h1 style={{ fontSize: font.size.lg, fontWeight: font.weight.bold, margin: `0 0 ${spacing[3]}`, color: color.text }}>{children}</h1> },
          h2({ children }) { return <h2 style={{ fontSize: font.size.md, fontWeight: font.weight.semibold, margin: `0 0 ${spacing[2]}`, color: color.text }}>{children}</h2> },
          h3({ children }) { return <h3 style={{ fontSize: font.size.base, fontWeight: font.weight.semibold, margin: `0 0 ${spacing[2]}` }}>{children}</h3> },
          strong({ children }) { return <strong style={{ fontWeight: font.weight.semibold, color: color.text }}>{children}</strong> },
          a({ href, children }) { return <a href={href} style={{ color: color.accent, textDecoration: 'underline' }}>{children}</a> },
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && isLast && content && <StreamCursor />}
    </div>
  )
}

// ─── Code block ───────────────────────────────────────────────────────────────


const PREVIEW_LINES = 4

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const previewable = extractPreviewCandidate('```' + language + '\n' + code + '\n```')
  const lines = code.split('\n')
  const isLong = lines.length > PREVIEW_LINES
  const displayCode = expanded || !isLong ? code : lines.slice(0, PREVIEW_LINES).join('\n')

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  const openPreview = useCallback(() => {
    if (typeof window === 'undefined' || window.parent === window || !previewable) return
    window.parent.postMessage(previewable, '*')
  }, [previewable])

  return (
    <div style={{
      margin: `${spacing[2]} 0`,
      borderRadius: radius.md,
      overflow: 'hidden',
      border: `1px solid rgba(255,255,255,0.07)`,
      background: color.codeBg,
    }}>
      {/* Compact bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `5px ${spacing[3]}`,
        background: color.codeBar,
      }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: font.mono }}>
          {language || 'code'}
        </span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {previewable && (
            <button onClick={openPreview} style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)', color: color.accent, fontSize: 11, cursor: 'pointer', padding: '2px 7px', borderRadius: radius.full }}>
              <Play size={10} /> Preview
            </button>
          )}
          <button
            onClick={copy}
            style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', color: copied ? color.success : 'rgba(255,255,255,0.3)', fontSize: 11, cursor: 'pointer', padding: '2px 6px', borderRadius: radius.xs }}
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Code body with fade when collapsed */}
      <div style={{ position: 'relative' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as const }}>
          <SyntaxHighlighter
            style={oneDark}
            language={language}
            PreTag="div"
            customStyle={{ margin: 0, borderRadius: 0, fontSize: '12px', lineHeight: '1.55', padding: `${spacing[3]} ${spacing[4]}`, background: color.codeBg, minWidth: '100%' }}
            codeTagProps={{ style: { fontFamily: font.mono } }}
            wrapLongLines
          >
            {displayCode}
          </SyntaxHighlighter>
        </div>
        {/* Fade overlay */}
        {isLong && !expanded && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
            background: `linear-gradient(transparent, ${color.codeBg})`,
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* Expand toggle */}
      {isLong && (
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            width: '100%', padding: '5px 0',
            background: 'rgba(255,255,255,0.02)',
            border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.3)', fontSize: 11, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          {expanded ? '▲ Collapse' : `▼ ${lines.length} lines — expand`}
        </button>
      )}
    </div>
  )
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      fontFamily: font.mono,
      fontSize: '0.87em',
      background: 'rgba(255,255,255,0.1)',
      padding: '2px 5px',
      borderRadius: '4px',
      color: '#e2e8f0',
    }}>{children}</code>
  )
}

// ─── Streaming cursor ─────────────────────────────────────────────────────────

function StreamCursor() {
  return (
    <span style={{
      display: 'inline-block',
      width: 2, height: '1em',
      background: color.accent,
      marginLeft: 2,
      verticalAlign: 'text-bottom',
      borderRadius: 1,
      animation: 'blink 1s step-end infinite',
    }} />
  )
}

// ─── Typing indicator (dots) ──────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 2px' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7,
          background: color.textSub,
          borderRadius: '50%',
          display: 'inline-block',
          animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  )
}
