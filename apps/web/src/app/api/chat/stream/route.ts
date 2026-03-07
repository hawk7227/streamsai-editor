import { NextRequest } from 'next/server'
import { StreamRequestSchema } from '@/lib/schemas'
import { streamAnthropic, streamOpenAI, ApiError } from '@/lib/providers'
import { checkRateLimit } from '@/lib/rate-limit'
import { env } from '@/lib/env'

export const runtime = 'nodejs'
export const maxDuration = 60

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

function errorResponse(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  )
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(req: NextRequest): Promise<Response> {
  // Rate limit
  const ip = getIP(req)
  const rl = checkRateLimit(ip)
  if (!rl.allowed) {
    return errorResponse(rl.error ?? 'Rate limited', 429)
  }

  // Parse + validate body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }

  const parsed = StreamRequestSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    return errorResponse(`Validation error: ${msg}`, 400)
  }

  const data = parsed.data
  const isAnthropic = data.model.startsWith('claude')

  // Key availability check
  if (isAnthropic && !env.anthropicApiKey) {
    return errorResponse('Anthropic API key not configured on server', 503)
  }
  if (!isAnthropic && !env.openaiApiKey) {
    return errorResponse('OpenAI API key not configured on server', 503)
  }

  // Stream from provider
  try {
    const upstream = isAnthropic
      ? await streamAnthropic(data, env.anthropicApiKey, req.signal)
      : await streamOpenAI(data, env.openaiApiKey!, req.signal)

    return new Response(upstream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-RateLimit-Remaining': String(rl.remaining),
        'X-RateLimit-Reset': String(rl.resetAt),
      },
    })
  } catch (err) {
    if (err instanceof ApiError) {
      return errorResponse(err.message, err.statusCode >= 500 ? 502 : err.statusCode)
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('abort') || message.includes('AbortError')) {
      return errorResponse('Request cancelled', 499)
    }
    return errorResponse(`Stream failed: ${message}`, 502)
  }
}
