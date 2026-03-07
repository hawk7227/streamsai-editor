import type { StreamRequest } from '@/lib/schemas'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const TIMEOUT_MS = 60_000

export async function streamAnthropic(
  req: StreamRequest,
  apiKey: string,
  signal: AbortSignal
): Promise<ReadableStream<Uint8Array>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  // Combine signals
  signal.addEventListener('abort', () => controller.abort())

  const response = await fetch(ANTHROPIC_API, {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: req.model,
      max_tokens: req.maxTokens,
      stream: true,
      messages: req.messages.filter(m => m.role !== 'system'),
    }),
  })

  clearTimeout(timeout)

  if (!response.ok) {
    const body = await response.text()
    let message = `Anthropic API error ${response.status}`
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } }
      if (parsed.error?.message) message = parsed.error.message
    } catch { /* use default */ }
    throw new ApiError(message, response.status)
  }

  if (!response.body) throw new ApiError('No response body from Anthropic', 500)

  return response.body
}

export async function streamOpenAI(
  req: StreamRequest,
  apiKey: string,
  signal: AbortSignal
): Promise<ReadableStream<Uint8Array>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  signal.addEventListener('abort', () => controller.abort())

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: req.model,
      max_tokens: req.maxTokens,
      stream: true,
      messages: req.messages.map(m => ({ role: m.role, content: m.content })),
    }),
  })

  clearTimeout(timeout)

  if (!response.ok) {
    const body = await response.text()
    let message = `OpenAI API error ${response.status}`
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } }
      if (parsed.error?.message) message = parsed.error.message
    } catch { /* use default */ }
    throw new ApiError(message, response.status)
  }

  if (!response.body) throw new ApiError('No response body from OpenAI', 500)

  return response.body
}

export class ApiError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function generateTitle(
  userMessage: string,
  assistantMessage: string,
  apiKey: string
): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const response = await fetch(ANTHROPIC_API, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 20,
        messages: [{
          role: 'user',
          content: `Generate a short 3-5 word title for this conversation. Return ONLY the title, no quotes, no punctuation at the end.\n\nUser: ${userMessage.slice(0, 200)}\nAssistant: ${assistantMessage.slice(0, 200)}`,
        }],
      }),
    })

    clearTimeout(timeout)
    if (!response.ok) return 'New conversation'

    const data = await response.json() as { content?: Array<{ text?: string }> }
    return data.content?.[0]?.text?.trim() ?? 'New conversation'
  } catch {
    clearTimeout(timeout)
    return 'New conversation'
  }
}
