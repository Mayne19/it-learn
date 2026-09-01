import { buildIngestPrompt, type IngestResult } from '@/lib/study/ingest-prompt'
import { validateChapters } from '@/lib/study/validate-chapters'
import { getApiErrorMessage } from '@/lib/api-errors'
import { getSupabaseServerClient } from '@/lib/supabase-server'

// Limite dure de l'API Anthropic pour les PDF en pièce jointe (contexte 1M) —
// voir docs/etude-mode-plan.md §5.3 étape 1. Un fichier plus gros doit être
// découpé en tranches par l'appelant avant d'arriver ici.
const MAX_PDF_BASE64_BYTES = 32 * 1024 * 1024

const BUCKET = 'study-course-files'

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: getApiErrorMessage('ANTHROPIC_API_KEY') },
      { status: 500 }
    )
  }

  const { fileId } = await req.json()
  if (!fileId || typeof fileId !== 'string') {
    return Response.json({ error: 'fileId manquant' }, { status: 400 })
  }

  const supabase = await getSupabaseServerClient()

  // Le fichier n'a jamais transité par le navigateur ici — la route lit le
  // PDF directement depuis Storage côté serveur, plutôt que de le recevoir
  // en base64 du client (ça dépassait la limite de payload des fonctions
  // Vercel, ~4,5 Mo, pour n'importe quel PDF de cours réaliste). RLS
  // s'applique normalement : ce select ne renvoie la ligne que si fileId
  // appartient à l'utilisateur de la session courante.
  const { data: fileRow, error: fileError } = await supabase
    .from('study_course_files')
    .select('storage_path, filename')
    .eq('id', fileId)
    .maybeSingle()

  if (fileError || !fileRow) {
    return Response.json({ error: 'Fichier introuvable ou accès refusé' }, { status: 404 })
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(fileRow.storage_path)

  if (downloadError || !blob) {
    return Response.json(
      { error: `Échec du téléchargement: ${downloadError?.message ?? 'fichier introuvable'}` },
      { status: 500 }
    )
  }

  const buffer = Buffer.from(await blob.arrayBuffer())
  const pdfBase64 = buffer.toString('base64')

  if (pdfBase64.length > MAX_PDF_BASE64_BYTES) {
    return Response.json(
      { error: `Le fichier "${fileRow.filename}" dépasse la limite de 32 Mo. Découpe-le en plusieurs fichiers plus petits avant de l'uploader.` },
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
