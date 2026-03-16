import { useRef, useCallback } from 'react'
import { useChatStore } from '@/store/chat'
import { streamCompletion, generateThreadTitle } from '@/lib/streaming'
import { postPreviewCandidate } from '@/lib/preview'
import type { Attachment, Message } from '@/types'

const STUDIO_SYSTEM_USER = `You are StreamsAI Studio Assistant — an AI builder running inside StreamsAI Studio.

You have a live Preview Panel to your right. When you generate HTML it renders there automatically.

Capabilities:
- You CAN receive and read images, text files, code files, HTML, CSS, JSON, and markdown sent as attachments.
- When an image is attached you can see and describe it, analyze UI, suggest improvements, or recreate it as HTML/CSS.
- When a text or code file is attached you can read, analyze, modify, or extend it.
- You CANNOT process binary files like ZIPs, PDFs, or executables directly — for those, ask the user to extract the text content first.

Rules:
- When asked to build, create, show, or preview anything visual — generate complete self-contained HTML with inline CSS and JS.
- Always wrap HTML in a html code fence so it renders in the preview panel automatically.
- For React/TSX wrap in a tsx code fence.
- Never tell users to copy/paste or open a text editor.
- After generating previewable content, briefly describe what was built.`

const STUDIO_SYSTEM_ACK = `Understood. I am StreamsAI Studio Assistant. I can see images and read text/code files when attached. I generate HTML/TSX directly into the live preview panel.`

// Build API message content — handles text + image attachments
function buildMessageContent(content: string, attachments: Attachment[]): string | { type: string; text?: string; source?: unknown }[] {
  const imageAttachments = attachments.filter(a => a.type.startsWith('image/'))
  const textAttachments = attachments.filter(a =>
    a.type.startsWith('text/') ||
    /\.(ts|tsx|js|jsx|html|css|json|md|txt|csv)$/i.test(a.name)
  )

  // No attachments — plain string
  if (attachments.length === 0) return content

  // Build multi-part content for Anthropic vision
  const parts: { type: string; text?: string; source?: unknown }[] = []

  // Add text file contents inline
  if (textAttachments.length > 0) {
    const fileTexts = textAttachments.map(a => {
      try {
        const text = atob(a.dataUrl.split(',')[1] ?? '')
        return `\n\n[File: ${a.name}]\n\`\`\`\n${text.slice(0, 8000)}\n\`\`\``
      } catch {
        return `\n\n[File: ${a.name} — could not decode]`
      }
    }).join('')
    parts.push({ type: 'text', text: content + fileTexts })
  } else {
    parts.push({ type: 'text', text: content })
  }

  // Add images
  for (const img of imageAttachments) {
    const [header, data] = img.dataUrl.split(',')
    const mediaType = header?.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
    parts.push({
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: data ?? '' }
    })
  }

  return parts
}

export function useSendMessage() {
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(async (content: string, attachments: Attachment[] = []) => {
    const { activeThreadId, messages, threads, addMessage, updateMessage, updateThread } =
      useChatStore.getState()

    if (!activeThreadId) return
    if (!content.trim() && attachments.length === 0) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    await addMessage({
      threadId: activeThreadId,
      role: 'user',
      content: content.trim(),
      status: 'done',
      attachments,
    })

    const placeholder = await addMessage({
      threadId: activeThreadId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      attachments: [],
    })

    const history = (messages[activeThreadId] ?? [])
      .filter((m: Message) => m.status === 'done' && m.id !== placeholder.id && m.content.trim().length > 0)
      .map((m: Message) => ({ role: m.role, content: m.content.trim() }))

    const thread = threads.find(t => t.id === activeThreadId)
    const model = thread?.model ?? 'claude-sonnet-4-5'
    const isFirstExchange = history.filter((m: { role: string }) => m.role === 'user').length === 1

    // Build current user message with attachments
    const userContent = buildMessageContent(content.trim(), attachments)

    const apiMessages = [
      { role: 'user' as const, content: STUDIO_SYSTEM_USER },
      { role: 'assistant' as const, content: STUDIO_SYSTEM_ACK },
      ...history,
      { role: 'user' as const, content: userContent },
    ]

    let accumulated = ''

    streamCompletion(
      apiMessages as Parameters<typeof streamCompletion>[0],
      model,
      activeThreadId,
      {
        onToken: (token) => {
          accumulated += token
          updateMessage(placeholder.id, activeThreadId, { content: accumulated, status: 'streaming' })
        },
        onDone: (full, tokens) => {
          updateMessage(placeholder.id, activeThreadId, { content: full, status: 'done', tokens })
          postPreviewCandidate(full)
          if (isFirstExchange && thread?.title === 'New conversation') {
            generateThreadTitle(content.trim(), full, model).then(title => {
              updateThread(activeThreadId, { title })
            })
          }
        },
        onError: (err) => {
          updateMessage(placeholder.id, activeThreadId, {
            content: `**Error:** ${err.message}`,
            status: 'error',
          })
        },
      },
      controller.signal
    )
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    const { activeThreadId, messages, updateMessage } = useChatStore.getState()
    if (!activeThreadId) return
    const msgs = messages[activeThreadId] ?? []
    const streaming = [...msgs].reverse().find((m: Message) => m.status === 'streaming')
    if (streaming) updateMessage(streaming.id, activeThreadId, { status: 'done' })
  }, [])

  return { send, cancel }
}
