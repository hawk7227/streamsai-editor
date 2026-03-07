import { useRef, useCallback } from 'react'
import { useChatStore } from '@/store/chat'
import { streamCompletion, generateThreadTitle } from '@/lib/streaming'
import type { Attachment, Message } from '@/types'

export function useSendMessage() {
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(async (content: string, attachments: Attachment[] = []) => {
    const { activeThreadId, messages, threads, addMessage, updateMessage, updateThread } =
      useChatStore.getState()

    if (!activeThreadId) return
    if (!content.trim() && attachments.length === 0) return

    // Cancel any in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    // 1. Persist user message
    await addMessage({
      threadId: activeThreadId,
      role: 'user',
      content: content.trim(),
      status: 'done',
      attachments,
    })

    // 2. Placeholder assistant message
    const placeholder = await addMessage({
      threadId: activeThreadId,
      role: 'assistant',
      content: '',
      status: 'streaming',
      attachments: [],
    })

    // 3. Build context — only completed messages
    const history = (messages[activeThreadId] ?? [])
      .filter((m: import("@/types").Message) => m.status === 'done' && m.id !== placeholder.id)
      .map((m: import("@/types").Message) => ({ role: m.role, content: m.content }))

    // 4. Determine model
    const thread = threads.find(t => t.id === activeThreadId)
    const model = thread?.model ?? 'claude-sonnet-4-5'
    const isFirstExchange = history.filter((m: { role: string }) => m.role === 'user').length === 1

    let accumulated = ''

    streamCompletion(
      [...history, { role: 'user' as const, content: content.trim() }],
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

          // Auto-generate title on first exchange
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
