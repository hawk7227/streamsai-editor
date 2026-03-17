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
      <div style={{
        maxWidth: isUser ? 'min(82%, 680px)' : 'min(96%, 900px)',
        padding: isUser ? `${spacing[3]} ${spacing[4]}` : `${spacing[2]} 0`,
        borderRadius: isUser
          ? `${radius.lg} ${radius.sm} ${radius.lg} ${radius.lg}`
          : 0,
        background: isError
          ? color.errorDim
          : isUser
          ? `linear-gradient(160deg, ${color.userBgLight}, ${color.userBg})`
          : 'transparent',
        border: isUser ? 'none' : isError ? `1px solid ${color.error}40` : 'none',
        color: isUser ? color.userText : color.aiText,
        fontSize: font.size.base,
        lineHeight: String(1.75),
        wordBreak: 'break-word',
        boxShadow: isUser ? `0 2px 12px rgba(26,122,74,0.35)` : 'none',
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

      {showTime && (
        <div style={{
          fontSize: font.size.xs, color: color.textFaint,
          marginTop: '3px', paddingInline: '2px',
          display: 'flex', gap: spacing[2], alignItems: 'center',
        }}>
          {dayjs(message.createdAt).format('h:mm A')}
          {message.tokens && <span>{message.tokens} tok</span>}
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
    <div style={{ fontSize: font.size.base, lineHeight: String(1.75), color: '#e8eaf0' }}>
      <ReactMarkdown
        components={{
          code({ className, children }: { className?: string; children?: React.ReactNode }) {
            const match = /language-(\w+)/.exec(className ?? '')
            const code = String(children).replace(/\n$/, '')
            return match
              ? <CodeBlock language={match[1]} code={code} />
              : <InlineCode>{code}</InlineCode>
          },
          p({ children }: { children?: React.ReactNode }) {
            return <p style={{
              margin: 0, marginBottom: '0.9em',
              lineHeight: '1.75',
              color: '#dde1ec',
            }}>{children}</p>
          },
          ul({ children }: { children?: React.ReactNode }) {
            return <ul style={{
              margin: '0.4em 0 0.9em',
              paddingLeft: '1.4em',
              display: 'flex', flexDirection: 'column', gap: '0.3em',
            }}>{children}</ul>
          },
          ol({ children }: { children?: React.ReactNode }) {
            return <ol style={{
              margin: '0.4em 0 0.9em',
              paddingLeft: '0',
              listStyle: 'none',
              display: 'flex', flexDirection: 'column', gap: '0.5em',
            }}>{children}</ol>
          },
          li({ children, ordered }: { children?: React.ReactNode; ordered?: boolean }) {
            const isOrdered = ordered
            if (isOrdered) {
              return (
                <li style={{ display: 'flex', gap: '0.75em', alignItems: 'flex-start', lineHeight: '1.65' }}>
                  <span style={{
                    flexShrink: 0, width: 22, height: 22,
                    borderRadius: '50%',
                    background: 'rgba(68,195,166,0.15)',
                    border: '1px solid rgba(68,195,166,0.3)',
                    color: '#6eecd8',
                    fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: '0.15em',
                  }}>
                    {/* number injected by CSS counter — use index from parent */}
                  </span>
                  <span style={{ flex: 1, color: '#dde1ec' }}>{children}</span>
                </li>
              )
            }
            return (
              <li style={{
                display: 'flex', gap: '0.6em', alignItems: 'flex-start',
                lineHeight: '1.65', color: '#dde1ec',
              }}>
                <span style={{ color: '#6eecd8', flexShrink: 0, marginTop: '0.35em', fontSize: 8 }}>●</span>
                <span>{children}</span>
              </li>
            )
          },
          blockquote({ children }: { children?: React.ReactNode }) {
            return (
              <blockquote style={{
                margin: '0.5em 0',
                paddingLeft: spacing[3],
                borderLeft: `3px solid rgba(68,195,166,0.5)`,
                color: 'rgba(255,255,255,0.55)',
                fontStyle: 'italic',
              }}>{children}</blockquote>
            )
          },
          h1({ children }: { children?: React.ReactNode }) {
            return <h1 style={{
              fontSize: '1.3em', fontWeight: 700,
              margin: '0.8em 0 0.4em',
              color: '#f0f2ff',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              paddingBottom: '0.3em',
            }}>{children}</h1>
          },
          h2({ children }: { children?: React.ReactNode }) {
            return <h2 style={{
              fontSize: '1.1em', fontWeight: 600,
              margin: '0.7em 0 0.35em',
              color: '#e8eaf8',
            }}>{children}</h2>
          },
          h3({ children }: { children?: React.ReactNode }) {
            return <h3 style={{
              fontSize: '1em', fontWeight: 600,
              margin: '0.6em 0 0.3em',
              color: '#d8daf0',
            }}>{children}</h3>
          },
          strong({ children }: { children?: React.ReactNode }) {
            return <strong style={{
              fontWeight: 700,
              color: '#c8f0e8',
              letterSpacing: '0.01em',
            }}>{children}</strong>
          },
          em({ children }: { children?: React.ReactNode }) {
            return <em style={{ color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' }}>{children}</em>
          },
          a({ href, children }: { href?: string; children?: React.ReactNode }) {
            return <a href={href} target="_blank" rel="noopener noreferrer" style={{
              color: '#6eecd8',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
            }}>{children}</a>
          },
          hr() {
            return <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.8em 0' }} />
          },
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
          <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', color: copied ? color.success : 'rgba(255,255,255,0.3)', fontSize: 11, cursor: 'pointer', padding: '2px 6px', borderRadius: radius.xs }}>
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
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
        {isLong && !expanded && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: `linear-gradient(transparent, ${color.codeBg})`, pointerEvents: 'none' }} />
        )}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(v => !v)}
          style={{ width: '100%', padding: '5px 0', background: 'rgba(255,255,255,0.02)', border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
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
      fontSize: '0.85em',
      background: 'rgba(110,236,216,0.08)',
      border: '1px solid rgba(110,236,216,0.15)',
      padding: '1px 5px',
      borderRadius: '4px',
      color: '#a8f0e0',
    }}>{children}</code>
  )
}

function StreamCursor() {
  return (
    <span style={{
      display: 'inline-block', width: 2, height: '1em',
      background: color.accent, marginLeft: 2,
      verticalAlign: 'text-bottom', borderRadius: 1,
      animation: 'blink 1s step-end infinite',
    }} />
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 2px' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, background: color.textSub,
          borderRadius: '50%', display: 'inline-block',
          animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  )
}
