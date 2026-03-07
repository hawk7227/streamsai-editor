import { NextRequest } from 'next/server'
import { TitleRequestSchema } from '@/lib/schemas'
import { generateTitle } from '@/lib/providers'
import { checkRateLimit } from '@/lib/rate-limit'
import { env } from '@/lib/env'

export const runtime = 'nodejs'
export const maxDuration = 20

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
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = checkRateLimit(ip)
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limited' }), { status: 429 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  const parsed = TitleRequestSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ title: 'New conversation' }), { status: 200 })
  }

  const { userMessage, assistantMessage } = parsed.data
  const title = await generateTitle(userMessage, assistantMessage, env.anthropicApiKey)

  return new Response(JSON.stringify({ title }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
