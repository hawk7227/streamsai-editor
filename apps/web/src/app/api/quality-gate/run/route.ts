import { NextResponse } from 'next/server'
import { createRun } from '@/lib/quality-gate/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const uploadId = String(body?.uploadId || '')
    if (!uploadId) {
      return NextResponse.json({ error: 'Missing uploadId' }, { status: 400 })
    }
    const run = await createRun(uploadId)
    return NextResponse.json({ runId: run.id, status: run.status, gateStatuses: run.gateStatuses })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Run failed' }, { status: 500 })
  }
}
