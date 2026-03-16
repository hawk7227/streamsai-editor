import { useRef, useCallback } from 'react'
import { useChatStore } from '@/store/chat'
import { streamCompletion, generateThreadTitle } from '@/lib/streaming'
import type { Attachment, Message } from '@/types'

// Studio system prompt — injected at API call time, never persisted to DB
const STUDIO_SYSTEM_USER = `You are StreamsAI Studio Assistant — an AI builder running inside StreamsAI Studio.

You have a live Preview Panel to your right. When you generate HTML it renders there automatically.

Rules:
- When asked to build, create, show, preview, or display anything visual — always generate complete self-contained HTML with inline CSS and JS.
- Never tell the user to copy and paste or open a text editor. The preview panel handles rendering automatically.
- Never say you cannot open a browser window. You have a built-in preview panel.
- Always wrap HTML in a html code fence so it is detected and sent to the preview panel.
- For React or TSX components wrap in a tsx code fence.
- Keep HTML fully self-contained with no external dependencies unless from a CDN link.
- After generating previewable content briefly describe what was built. Do not give manual instructions.`

const STUDIO_SYSTEM_ACK = `Understood. I am StreamsAI Studio Assistant with a live preview panel. I will generate complete HTML wrapped in code fences and it will render in the preview panel automatically. I will never tell users to copy paste or open external editors.`

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

    const apiMessages = [
      { role: 'user' as const, content: STUDIO_SYSTEM_USER },
      { role: 'assistant' as const, content: STUDIO_SYSTEM_ACK },
      ...history,
      { role: 'user' as const, content: content.trim() },
    ]

    let accumulated = ''

    streamCompletion(
      apiMessages,
      model,
      activeThreadId,
      {
        onToken: (token) => {
          accumulated += token
          updateMessage(placeholder.id, activeThreadId, {
            content: accumulated,
            status: 'streaming',
          })
        },
        onDone: (full, tokens) => {
          updateMessage(placeholder.id, activeThreadId, {
            content: full,
            status: 'done',
            tokens,
          })

          const htmlMatch = full.match(/```html\s*\n([\s\S]*?)```/) ||
                            full.match(/(<!DOCTYPE html>[\s\S]*?<\/html>)/i)
          if (htmlMatch) {
            window.parent?.postMessage(
              { type: 'preview:html', html: htmlMatch[1].trim(), title: 'Chat HTML Preview' },
              '*'
            )
          }

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
    if (streaming) {
      updateMessage(streaming.id, activeThreadId, { status: 'done' })
    }
  }, [])

  return { send, cancel }
}
