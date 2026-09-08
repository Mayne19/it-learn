import { buildDetailedLessonPrompt, type DetailedLesson } from '@/lib/study/lesson-prompt'
import { getApiErrorMessage } from '@/lib/api-errors'
import { callClaude, extractJSON, ClaudeApiError } from '@/lib/study/ai-client'
import { getChapterForPrompt } from '@/lib/study/get-chapter-for-prompt'
import { getSupabaseServerClient } from '@/lib/supabase-server'
import { checkAndConsumeAiQuota, RateLimitError } from '@/lib/study/rate-limit'

/**
 * Route de test A/B, temporaire — jamais appelée par l'UI normale. Génère
 * le même cours détaillé avec Sonnet 5 (actuel) ET Haiku 4.5 (candidat) en
 * parallèle, pour comparer manuellement la qualité avant de basculer
 * app/api/study/lesson/route.ts. Ne touche jamais study_lessons_cache —
 * purement une comparaison, rien n'est persisté. À supprimer une fois la
 * décision Haiku/Sonnet tranchée.
 */
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

  // Compte double sur le quota (heavy) puisque ça déclenche deux appels —
  // ce n'est qu'un test manuel ponctuel, pas un chemin utilisateur normal.
  const supabase = await getSupabaseServerClient()
  try {
    await checkAndConsumeAiQuota(supabase, 'heavy')
    await checkAndConsumeAiQuota(supabase, 'heavy')
  } catch (e) {
    if (e instanceof RateLimitError) return Response.json({ error: e.message }, { status: 429 })
    throw e
  }

  const chapter = await getChapterForPrompt(chapterId)
  if (!chapter) {
    return Response.json({ error: 'Chapitre introuvable ou accès refusé' }, { status: 404 })
  }

  const prompt = buildDetailedLessonPrompt(chapter)

  const runModel = async (model: 'claude-sonnet-5' | 'claude-haiku-4-5') => {
    const start = Date.now()
    try {
      // effort:medium n'existe que pour Sonnet — voir ai-client.ts.
      const text = await callClaude({
        model,
        prompt,
        maxTokens: 6000,
        ...(model === 'claude-sonnet-5' ? { effort: 'medium' as const } : {}),
      })
      const lesson = extractJSON(text) as DetailedLesson
      return { model, ok: true as const, lesson, ms: Date.now() - start }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      return { model, ok: false as const, error: message, ms: Date.now() - start }
    }
  }

  const [sonnet, haiku] = await Promise.all([
    runModel('claude-sonnet-5'),
    runModel('claude-haiku-4-5'),
  ])

  return Response.json({ chapterTitle: chapter.title_de, sonnet, haiku })
}
