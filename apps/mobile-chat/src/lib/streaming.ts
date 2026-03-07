/// <reference types="vite/client" />
import type { Message, ModelId } from '@/types'

// API base — proxy URL injected at build time, falls back to same-origin
const API_BASE = import.meta.env.VITE_API_URL ?? ''

export interface StreamCallbacks {
  onToken: (token: string) => void
  onDone: (fullText: string, tokens?: number) => void
  onError: (err: Error) => void
}

export function streamCompletion(
  messages: Pick<Message, 'role' | 'content'>[],
  model: ModelId,
  threadId: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): void {
  void _stream(messages, model, threadId, callbacks, signal)
}

async function _stream(
  messages: Pick<Message, 'role' | 'content'>[],
  model: ModelId,
  threadId: string,
  { onToken, onDone, onError }: StreamCallbacks,
  signal?: AbortSignal
) {
  try {
    const res = await fetch(`${API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        messages: messages.filter(m => m.role !== 'system'),
        model,
        threadId,
        maxTokens: 4096,
      }),
    })

    if (!res.ok) {
      let errMsg = `Server error ${res.status}`
      try {
        const body = await res.json() as { error?: string }
        if (body.error) errMsg = body.error
      } catch { /* use default */ }
      onError(new Error(errMsg))
      return
    }

    const reader = res.body?.getReader()
    if (!reader) { onError(new Error('No response stream')); return }

    const decoder = new TextDecoder()
    let full = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') { onDone(full); return }
        try {
          const ev = JSON.parse(data) as {
            type?: string
            delta?: { type?: string; text?: string }
            choices?: Array<{ delta?: { content?: string }; finish_reason?: string }>
            usage?: { output_tokens?: number }
          }

          // Anthropic format
          if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && ev.delta.text) {
            full += ev.delta.text
            onToken(ev.delta.text)
          }
          if (ev.type === 'message_delta' && ev.usage) {
            onDone(full, ev.usage.output_tokens)
            return
          }

          // OpenAI format
          const token = ev.choices?.[0]?.delta?.content
          if (token) { full += token; onToken(token) }
          if (ev.choices?.[0]?.finish_reason === 'stop') { onDone(full); return }

        } catch { /* malformed SSE line — skip */ }
      }
    }
    onDone(full)
  } catch (err) {
    if (err instanceof Error && (err.name === 'AbortError' || err.message.includes('abort'))) return
    onError(err instanceof Error ? err : new Error(String(err)))
  }
}

export async function generateThreadTitle(
  userMessage: string,
  assistantMessage: string,
  model: ModelId
): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/api/chat/title`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage, assistantMessage, model }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return 'New conversation'
    const data = await res.json() as { title?: string }
    return data.title ?? 'New conversation'
  } catch {
    return 'New conversation'
  }
}
