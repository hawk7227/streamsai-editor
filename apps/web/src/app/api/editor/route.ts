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

function extractReturnBlock(src: string): string {
  const returnMatch = src.match(/return\s*\(\s*([\s\S]+)/);
  if (!returnMatch) return src.slice(0, 8000);
  const after = returnMatch[1];
  let depth = 1, i = 0;
  while (i < after.length && depth > 0) {
    if (after[i] === '(') depth++;
    else if (after[i] === ')') depth--;
    i++;
  }
  const jsx = after.slice(0, i - 1).trim();
  return jsx.length > 200 ? jsx : src.slice(0, 8000);
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

    const jsxBlock = extractReturnBlock(tsx);
    const hasTailwind = /className=/.test(tsx);

    const prompt = `You are converting a React JSX snippet to plain static HTML that renders visually correctly.

INPUT JSX (this is the return value of a React component — treat it as HTML):
\`\`\`
${jsxBlock.slice(0, 10000)}
\`\`\`

OUTPUT RULES — follow every rule exactly:
1. Output a complete self-contained HTML document: <!DOCTYPE html><html><head>...</head><body>...</body></html>
2. ${hasTailwind ? 'Include <script src="https://cdn.tailwindcss.com"></script> in <head>' : 'No Tailwind needed'}
3. Convert JSX to HTML: className → class, style={{...}} → style="..." (camelCase → kebab-case)
4. Replace {variable} expressions with realistic placeholder text matching context (e.g. "Dr. Sarah Johnson", "$189", "Step 1 of 3")
5. Remove all event handlers (onClick, onChange, onSubmit etc) — keep the element
6. Keep ALL text content, colors, spacing, borders, shadows intact
7. Add <style>body{margin:0;padding:0;background:#0b0f0c;} *{box-sizing:border-box;}</style> in head
8. The page must render without errors or blank content

CRITICAL: Do NOT output the JSX source. Output ONLY valid HTML. No markdown fences. No explanation.`

    try {
      const html = await callClaude(prompt, apiKey)
      const clean = html.replace(/^```html?\n?/i, '').replace(/\n?```$/, '').trim()
      // Validate it looks like HTML (not raw JSX/TSX source)
      const looksLikeHtml = clean.includes('<!DOCTYPE') || clean.includes('<html') || clean.includes('<div') || clean.includes('<section')
      const looksLikeTsx = clean.startsWith('"use client"') || clean.includes('import {') || clean.includes('export default')
      if (looksLikeTsx || !looksLikeHtml) {
        return err('Conversion returned source code instead of HTML — model did not follow instructions', 502)
      }
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
