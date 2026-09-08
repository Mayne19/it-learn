import { buildWebEnrichmentPrompt, type WebEnrichmentResult } from '@/lib/study/web-enrichment-prompt'
import { getApiErrorMessage } from '@/lib/api-errors'
import { extractTextBlock } from '@/lib/anthropic-response'
import { getChapterForPrompt } from '@/lib/study/get-chapter-for-prompt'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { checkAndConsumeAiQuota, RateLimitError } from '@/lib/study/rate-limit'

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: getApiErrorMessage('ANTHROPIC_API_KEY') },
      { status: 500 }
    )
  }

  const { chapterId } = await req.json()
  if (!chapterId || typeof chapterId !== 'string') {
    return Response.json({ error: 'chapterId manquant' }, { status: 400 })
  }

  const supabase = await getSupabaseServerClient()
  try {
    // 'websearch', pas 'heavy' : web_search facture $0.01/recherche EN
    // PLUS des tokens (jusqu'à 4/appel, voir max_uses plus bas) — la
    // limite "heavy" (20/h, pensée pour un simple appel Sonnet) autoriserait
    // jusqu'à 80 recherches/heure, un ordre de grandeur de coût différent.
    await checkAndConsumeAiQuota(supabase, 'websearch')
  } catch (e) {
    if (e instanceof RateLimitError) return Response.json({ error: e.message }, { status: 429 })
    throw e
  }

  const chapter = await getChapterForPrompt(chapterId)
  if (!chapter) {
    return Response.json({ error: 'Chapitre introuvable ou accès refusé' }, { status: 404 })
  }

  const model = 'claude-sonnet-5'
  const prompt = buildWebEnrichmentPrompt(chapter)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      tools: [
        {
          type: 'web_search_20260209',
          name: 'web_search',
          // Un chapitre = 2-3 sources visées (voir le prompt) — borne dure
          // sur le nombre de recherches pour ne jamais dépasser un coût
          // prévisible par génération, même si le modèle en ferait plus.
          max_uses: 4,
        },
      ],
      messages: [{ role: 'user', content: prompt }],
    })
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('[study/web-enrichment] Anthropic error', res.status, data)
    return Response.json(
      { error: data.error?.message ?? 'Erreur Anthropic' },
      { status: res.status }
    )
  }

  // Une erreur d'outil serveur (web_search) revient en HTTP 200 avec un
  // bloc web_search_tool_result dont le contenu est un objet d'erreur —
  // jamais une exception. On la détecte explicitement plutôt que de
  // laisser le JSON.parse plus bas échouer sans dire pourquoi.
  const searchErrorBlock = (data.content ?? []).find(
    (b: { type?: string; content?: unknown }) =>
      b.type === 'web_search_tool_result' && !Array.isArray(b.content)
  )
  if (searchErrorBlock) {
    const errorCode = (searchErrorBlock.content as { error_code?: string })?.error_code
    console.error('[study/web-enrichment] web_search error', errorCode, { chapterId })
    return Response.json(
      { error: `La recherche web a échoué (${errorCode ?? 'raison inconnue'}). Réessaie dans un moment.` },
      { status: 500 }
    )
  }

  const text = extractTextBlock(data.content)
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) {
    console.error('[study/web-enrichment] pas de JSON exploitable', {
      stopReason: data.stop_reason,
      contentTypes: (data.content ?? []).map((b: { type?: string }) => b.type),
      chapterId,
    })
    return Response.json(
      { error: 'Réponse inexploitable pour la recherche web. Réessaie, ou signale ce cas.' },
      { status: 500 }
    )
  }

  let result: WebEnrichmentResult
  try {
    result = JSON.parse(text.slice(start, end + 1))
  } catch (e) {
    console.error('[study/web-enrichment] JSON invalide', e, text.slice(0, 500))
    return Response.json(
      { error: `JSON invalide reçu de l'IA : ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    )
  }

  if (!Array.isArray(result.sources) || result.sources.length === 0) {
    return Response.json(
      { error: "Aucune source trouvée pour ce chapitre. Réessaie, ou signale ce cas." },
      { status: 500 }
    )
  }

  // Le prompt demande de ne jamais inventer d'URL, mais rien ne le
  // garantit — une URL mal formée ou hallucinée s'afficherait sinon comme
  // lien cliquable "source fiable" sans qu'on ait pu la détecter avant.
  // On ne filtre que la forme (http(s) valide), pas l'existence réelle de
  // la page — vérifier ça demanderait une requête réseau supplémentaire.
  const validSources = result.sources.filter(s => {
    try {
      const parsed = new URL(s.url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  })

  if (validSources.length === 0) {
    console.error('[study/web-enrichment] toutes les sources avaient une URL invalide', { chapterId, raw: result.sources })
    return Response.json(
      { error: "Les sources trouvées avaient un format invalide. Réessaie, ou signale ce cas." },
      { status: 500 }
    )
  }

  return Response.json({ sources: validSources, model })
}
