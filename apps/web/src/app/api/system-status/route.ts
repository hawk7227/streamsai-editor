import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

interface ServiceStatus {
  name: string
  status: 'ok' | 'degraded' | 'down'
  latencyMs?: number
  error?: string
}

async function checkAnthropic(apiKey: string): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      signal: AbortSignal.timeout(5000),
    })
    return {
      name: 'anthropic',
      status: res.ok ? 'ok' : 'degraded',
      latencyMs: Date.now() - start,
    }
  } catch (err) {
    return { name: 'anthropic', status: 'down', error: String(err), latencyMs: Date.now() - start }
  }
}

async function checkOpenAI(apiKey: string | undefined): Promise<ServiceStatus> {
  if (!apiKey) return { name: 'openai', status: 'degraded', error: 'Key not configured' }
  const start = Date.now()
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    })
    return {
      name: 'openai',
      status: res.ok ? 'ok' : 'degraded',
      latencyMs: Date.now() - start,
    }
  } catch (err) {
    return { name: 'openai', status: 'down', error: String(err), latencyMs: Date.now() - start }
  }
}

export async function GET(req: NextRequest): Promise<Response> {
  // Admin-only check via secret header or query param
  const adminKey = process.env.SYSTEM_STATUS_KEY
  const provided = req.headers.get('x-admin-key') ?? req.nextUrl.searchParams.get('key')
  if (adminKey && provided !== adminKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''
  const openaiKey = process.env.OPENAI_API_KEY

  const [anthropic, openai] = await Promise.all([
    checkAnthropic(anthropicKey),
    checkOpenAI(openaiKey),
  ])

  const services = [anthropic, openai]
  const allOk = services.every(s => s.status === 'ok')
  const anyDown = services.some(s => s.status === 'down')
  const overall = allOk ? 'ok' : anyDown ? 'down' : 'degraded'

  return new Response(
    JSON.stringify({
      status: overall,
      timestamp: new Date().toISOString(),
      services,
      build: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      },
    }),
    {
      status: overall === 'down' ? 503 : 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
