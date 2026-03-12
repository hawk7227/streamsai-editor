import { NextResponse } from 'next/server'
import { createUpload } from '@/lib/quality-gate/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('files')
    if (!files.length) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }
    const upload = await createUpload(formData)
    return NextResponse.json({
      uploadId: upload.id,
      fileCount: upload.files.length,
      extractedArchives: upload.extractedRoots.length,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload failed' }, { status: 500 })
  }
}
