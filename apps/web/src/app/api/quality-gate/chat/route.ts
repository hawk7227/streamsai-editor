import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { buildHonestFeedback, type AuditReport } from '@/lib/quality-gate'

export const runtime = 'nodejs'
export const maxDuration = 30

type ChatBody = {
  message?: string
  report?: AuditReport
}

export async function POST(req: NextRequest) {
  let body: ChatBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body?.report) {
    return NextResponse.json({ error: 'Missing report' }, { status: 400 })
  }

  const fallback = buildHonestFeedback(body.report, body.message)

  if (!env.openaiApiKey) {
    return NextResponse.json({ reply: fallback, mode: 'local' })
  }

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You are a blunt but fair release reviewer. Be honest, specific, and useful. Prioritize reliability, polish, mobile behavior, and what blocks shipping. Keep the answer under 220 words.'
          },
          {
            role: 'user',
            content: JSON.stringify({
              question: body.message || 'Review this audit honestly.',
              report: body.report,
              fallback,
            }),
          },
        ],
      }),
      signal: req.signal,
    })

    if (!upstream.ok) {
      return NextResponse.json({ reply: fallback, mode: 'local-fallback' })
    }

    const data = await upstream.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const reply = data.choices?.[0]?.message?.content?.trim() || fallback
    return NextResponse.json({ reply, mode: 'openai' })
  } catch {
    return NextResponse.json({ reply: fallback, mode: 'local-fallback' })
  }
}
