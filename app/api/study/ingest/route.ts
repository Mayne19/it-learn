import { buildIngestPrompt, type IngestResult } from '@/lib/study/ingest-prompt'
import { validateChapters } from '@/lib/study/validate-chapters'
import { getApiErrorMessage } from '@/lib/api-errors'

// Limite dure de l'API Anthropic pour les PDF en pièce jointe (contexte 1M) —
// voir docs/etude-mode-plan.md §5.3 étape 1. Un fichier plus gros doit être
// découpé en tranches par l'appelant avant d'arriver ici.
const MAX_PDF_BASE64_BYTES = 32 * 1024 * 1024

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: getApiErrorMessage('ANTHROPIC_API_KEY') },
      { status: 500 }
    )
  }

  const { pdfBase64, filename } = await req.json()
  if (!pdfBase64 || typeof pdfBase64 !== 'string') {
    return Response.json({ error: 'Fichier PDF manquant' }, { status: 400 })
  }

  if (pdfBase64.length > MAX_PDF_BASE64_BYTES) {
    return Response.json(
      { error: `Le fichier "${filename ?? ''}" dépasse la limite de 32 Mo par requête. Découpe-le en plusieurs fichiers plus petits avant de l'uploader.` },
      { status: 413 }
    )
  }

  const prompt = buildIngestPrompt()

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 }
          },
          { type: 'text', text: prompt }
        ]
      }]
    })
  })

  const data = await res.json()
  if (!res.ok) {
    return Response.json(
      { error: data.error?.message ?? 'Erreur Anthropic' },
      { status: res.status }
    )
  }

  const text = data.content?.[0]?.text ?? ''
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) {
    return Response.json({ error: 'Réponse invalide' }, { status: 500 })
  }

  let ingestResult: IngestResult
  try {
    ingestResult = JSON.parse(text.slice(start, end + 1))
  } catch {
    return Response.json({ error: 'JSON invalide' }, { status: 500 })
  }

  const issues = validateChapters(
    ingestResult.chapters.map(c => ({
      order: c.order,
      title_de: c.title_de,
      title_fr: c.title_fr,
      concepts: c.concepts,
      summary: c.summary,
      has_code: c.has_code,
    }))
  )

  return Response.json({ ...ingestResult, validationIssues: issues })
}
