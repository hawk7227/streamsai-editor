import { memo, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import DOMPurify from 'dompurify'
import { color, spacing, radius, font, motion } from '@/lib/tokens'
import type { Message } from '@/types'
import { Copy, Check, AlertCircle } from 'lucide-react'
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
        maxWidth: '78%',
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
        lineHeight: String(1.55),
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

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const [previewed, setPreviewed] = useState(false)

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  const isPreviewable = ['html', 'tsx', 'jsx'].includes((language ?? '').toLowerCase())

  const sendToPreview = useCallback(() => {
    const lang = (language ?? '').toLowerCase()
    const isHtml = lang === 'html'
    const payload = isHtml
      ? { type: 'preview:html', html: code, title: 'Chat HTML Preview' }
      : { type: 'preview:component', code, title: 'Chat Component Preview' }
    window.parent?.postMessage(payload, '*')
    setPreviewed(true)
    setTimeout(() => setPreviewed(false), 2000)
  }, [code, language])

  return (
    <div style={{
      margin: `${spacing[3]} 0`,
      borderRadius: radius.md,
      overflow: 'hidden',
      border: `1px solid rgba(255,255,255,0.08)`,
      background: color.codeBg,
    }}>
      {/* Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${spacing[2]} ${spacing[3]}`,
        background: color.codeBar,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontSize: font.size.xs, color: color.textSub, fontFamily: font.mono }}>
          {language}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {isPreviewable && (
            <button
              onClick={sendToPreview}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: previewed ? 'rgba(88,220,197,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${previewed ? 'rgba(111,236,208,0.3)' : 'rgba(255,255,255,0.1)'}`,
                color: previewed ? '#9ff4df' : color.textSub,
                fontSize: font.size.xs, cursor: 'pointer',
                padding: '4px 8px', borderRadius: radius.xs,
                transition: `all ${motion.snap} ${motion.easing}`,
              }}
            >
              {previewed ? '✓ Sent' : '▶ Preview'}
            </button>
          )}
          <button
            onClick={copy}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'none', border: 'none',
              color: copied ? color.success : color.textSub,
              fontSize: font.size.xs, cursor: 'pointer',
              padding: '4px 8px', borderRadius: radius.xs,
              transition: `color ${motion.snap} ${motion.easing}`,
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Code */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as const }}>
        <SyntaxHighlighter
          style={oneDark}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0, borderRadius: 0,
            fontSize: '13px', lineHeight: '1.55',
            padding: spacing[4],
            background: color.codeBg,
            minWidth: '100%',
          }}
          codeTagProps={{ style: { fontFamily: font.mono } }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
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
