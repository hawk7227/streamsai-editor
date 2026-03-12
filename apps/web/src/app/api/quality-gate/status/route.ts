import { NextRequest, NextResponse } from 'next/server'
import { getRunStatus } from '@/lib/quality-gate/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get('runId')
  if (!runId) {
    return NextResponse.json({ error: 'Missing runId' }, { status: 400 })
  }
  const status = getRunStatus(runId)
  if (!status) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }
  return NextResponse.json(status)
}
