import { NextRequest } from 'next/server'
import { env } from '@/lib/env'

export const runtime = 'nodejs'
export const maxDuration = 60

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function callClaude(prompt: string, apiKey: string): Promise<string> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!r.ok) {
    const body = await r.text()
    throw new Error(`Anthropic ${r.status}: ${body}`)
  }
  const data = await r.json()
  return data.content?.find((b: { type: string }) => b.type === 'text')?.text ?? ''
}

export async function POST(req: NextRequest): Promise<Response> {
  let apiKey: string
  try {
    apiKey = env.anthropicApiKey
  } catch {
    return err('ANTHROPIC_API_KEY not configured on server', 503)
  }

  let body: { action: string; tsx?: string; changes?: { prop: string; value: string; elText: string }[] }
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON')
  }

  // ── ACTION: tsx-to-html ───────────────────────────────────────────────────
  if (body.action === 'tsx-to-html') {
    const tsx = body.tsx?.trim()
    if (!tsx) return err('tsx is required')

    const prompt = `Convert this React/Next.js TSX component to a single self-contained HTML snippet that visually matches the UI exactly.

Rules:
- Output ONLY the inner HTML body content — no <!DOCTYPE>, no <html>, no <head>, no <body> tags
- Preserve ALL inline styles exactly character-for-character
- Replace Tailwind classes with equivalent inline styles
- Replace JSX expressions like {variable} with realistic placeholder values matching the context
- Remove all event handlers, useState, imports, TypeScript types, "use client"
- Keep all text content, colors, spacing, borders, shadows, and layout intact
- Use only plain HTML elements and inline styles
- Add <script src="https://cdn.tailwindcss.com"></script> at the very top if Tailwind classes exist
- The result must render correctly as static HTML in an iframe

TSX source:
\`\`\`tsx
${tsx.slice(0, 14000)}
\`\`\`

Respond with ONLY the HTML content, no explanation, no markdown code fences.`

    try {
      const html = await callClaude(prompt, apiKey)
      const clean = html.replace(/^```html?\n?/i, '').replace(/\n?```$/,'').trim()
      return new Response(JSON.stringify({ html: clean }), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (e) {
      return err(`Conversion failed: ${e instanceof Error ? e.message : e}`, 502)
    }
  }

  // ── ACTION: write-back ────────────────────────────────────────────────────
  if (body.action === 'write-back') {
    const tsx = body.tsx?.trim()
    const changes = body.changes
    if (!tsx) return err('tsx is required')
    if (!changes?.length) return err('changes is required')

    const changeDesc = changes
      .map(c =>
        c.prop === '__text__'
          ? `- Set text content to: "${c.value}" (on element containing: "${c.elText}")`
          : `- Set CSS property "${c.prop}" to "${c.value}" (on element containing text: "${c.elText}")`
      )
      .join('\n')

    const prompt = `Apply these visual edits to the TSX source. Modify ONLY the affected style/className/text values — do not restructure, reformat, or change anything else.

Changes to apply:
${changeDesc}

TSX source:
\`\`\`tsx
${tsx.slice(0, 14000)}
\`\`\`

Return ONLY the complete updated TSX file, no explanation, no markdown fences.`

    try {
      const updated = await callClaude(prompt, apiKey)
      const clean = updated.replace(/^```tsx?\n?/i, '').replace(/\n?```$/, '').trim()
      // Sanity check — must still look like TSX
      if (!clean.includes('export default') && !clean.includes('use client') && !clean.includes('return (')) {
        return err('Write-back produced invalid TSX', 502)
      }
      return new Response(JSON.stringify({ tsx: clean }), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (e) {
      return err(`Write-back failed: ${e instanceof Error ? e.message : e}`, 502)
    }
  }

  return err(`Unknown action: ${body.action}`)
}
