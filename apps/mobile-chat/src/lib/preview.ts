export type PreviewMessage =
  | { type: 'streamsai:preview-html'; html: string; title?: string }
  | { type: 'streamsai:preview-code'; code: string; language: string; title?: string }

const blockPattern = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g
export function extractPreviewCandidate(content: string): PreviewMessage | null {
  const blocks = [...content.matchAll(blockPattern)]
  if (!blocks.length) return null
  for (const block of blocks) {
    const language = (block[1] || '').toLowerCase()
    const code = (block[2] || '').trim()
    if (!code) continue
    if (language === 'html' || code.startsWith('<!DOCTYPE html') || code.startsWith('<html')) return { type: 'streamsai:preview-html', html: code, title: 'Chat HTML Preview' }
    if (['tsx', 'jsx', 'ts', 'js'].includes(language)) return { type: 'streamsai:preview-code', code, language, title: 'Chat Code Preview' }
  }
  return null
}
export function postPreviewCandidate(content: string) {
  if (typeof window === 'undefined' || window.parent === window) return
  const candidate = extractPreviewCandidate(content)
  if (candidate) window.parent.postMessage(candidate, '*')
}
