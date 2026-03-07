import { useRef, useCallback } from 'react'
import { useChatStore } from '@/store/chat'
import { streamCompletion } from '@/lib/streaming'
import type { Attachment, Message } from '@/types'

export function useSendMessage() {
  const store = useChatStore()
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(
    async (content: string, attachments: Attachment[] = []) => {
      const { activeThreadId, settings, messages, addMessage, updateMessage } = useChatStore.getState()
      if (!activeThreadId || !settings) return
      if (!content.trim() && attachments.length === 0) return

      // cancel any in-flight stream
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      // 1. persist user message
      await addMessage({
        threadId: activeThreadId,
        role: 'user',
        content: content.trim(),
        status: 'done',
        attachments,
      })

      // 2. create placeholder assistant message
      const placeholder = await addMessage({
        threadId: activeThreadId,
        role: 'assistant',
        content: '',
        status: 'streaming',
        attachments: [],
      })

      // 3. build context from store
      const history = (messages[activeThreadId] ?? [])
        .filter(m => m.status === 'done')
        .map(m => ({ role: m.role, content: m.content }))

      // determine model from thread
      const threads = store.threads
      const thread = threads.find(t => t.id === activeThreadId)
      const model = thread?.model ?? settings.defaultModel

      let accumulated = ''

      streamCompletion(
        [...history, { role: 'user' as const, content: content.trim() }],
        model,
        settings,
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
          },
          onError: (err) => {
            updateMessage(placeholder.id, activeThreadId, {
              content: `Error: ${err.message}`,
              status: 'error',
            })
          },
        },
        controller.signal
      )
    },
    [store.threads]
  )

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
