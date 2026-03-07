import type { Message, AppSettings, ModelId } from '@/types'

export interface StreamCallbacks {
  onToken: (token: string) => void
  onDone: (fullText: string, tokens?: number) => void
  onError: (err: Error) => void
}

export function streamCompletion(
  messages: Pick<Message, 'role' | 'content'>[],
  model: ModelId,
  settings: AppSettings,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): void {
  const provider = model.startsWith('claude') ? 'anthropic' : 'openai'

  if (provider === 'anthropic') {
    streamAnthropic(messages, model, settings, callbacks, signal)
  } else {
    streamOpenAI(messages, model, settings, callbacks, signal)
  }
}

// ─── Anthropic ───────────────────────────────────────────────────────────────

async function streamAnthropic(
  messages: Pick<Message, 'role' | 'content'>[],
  model: ModelId,
  settings: AppSettings,
  { onToken, onDone, onError }: StreamCallbacks,
  signal?: AbortSignal
) {
  if (!settings.anthropicKey) {
    onError(new Error('Anthropic API key not set. Add it in Settings.'))
    return
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        stream: true,
        messages: messages.filter(m => m.role !== 'system'),
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      onError(new Error(`Anthropic ${res.status}: ${body}`))
      return
    }

    const reader = res.body?.getReader()
    if (!reader) { onError(new Error('No response body')); return }

    const decoder = new TextDecoder()
    let full = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue
        try {
          const ev = JSON.parse(data) as { type: string; delta?: { type: string; text?: string }; usage?: { output_tokens: number } }
          if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && ev.delta.text) {
            full += ev.delta.text
            onToken(ev.delta.text)
          }
          if (ev.type === 'message_delta' && ev.usage) {
            onDone(full, ev.usage.output_tokens)
            return
          }
        } catch {
          // malformed SSE line — skip
        }
      }
    }
    onDone(full)
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return
    onError(err instanceof Error ? err : new Error(String(err)))
  }
}

// ─── OpenAI ──────────────────────────────────────────────────────────────────

async function streamOpenAI(
  messages: Pick<Message, 'role' | 'content'>[],
  model: ModelId,
  settings: AppSettings,
  { onToken, onDone, onError }: StreamCallbacks,
  signal?: AbortSignal
) {
  if (!settings.openaiKey) {
    onError(new Error('OpenAI API key not set. Add it in Settings.'))
    return
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.openaiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      onError(new Error(`OpenAI ${res.status}: ${body}`))
      return
    }

    const reader = res.body?.getReader()
    if (!reader) { onError(new Error('No response body')); return }

    const decoder = new TextDecoder()
    let full = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') { onDone(full); return }
        try {
          const ev = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> }
          const token = ev.choices?.[0]?.delta?.content
          if (token) { full += token; onToken(token) }
        } catch {
          // skip
        }
      }
    }
    onDone(full)
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return
    onError(err instanceof Error ? err : new Error(String(err)))
  }
}
