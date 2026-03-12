import { NextRequest, NextResponse } from 'next/server'
import { getRunReport } from '@/lib/quality-gate/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get('runId')
  if (!runId) {
    return NextResponse.json({ error: 'Missing runId' }, { status: 400 })
  }
  const report = await getRunReport(runId)
  if (!report) {
    return NextResponse.json({ error: 'Report not ready' }, { status: 404 })
  }
  return NextResponse.json(report)
}
