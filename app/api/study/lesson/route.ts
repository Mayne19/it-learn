import { buildDetailedLessonPrompt, type DetailedLesson } from '@/lib/study/lesson-prompt'
import { getApiErrorMessage } from '@/lib/api-errors'
import { callClaude, extractJSON, ClaudeApiError } from '@/lib/study/ai-client'
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

  try {
    await checkAndConsumeAiQuota(await getSupabaseServerClient(), 'heavy')
  } catch (e) {
    if (e instanceof RateLimitError) return Response.json({ error: e.message }, { status: 429 })
    throw e
  }

  // Résolu via RLS — voir get-chapter-for-prompt.ts pour le contexte
  // (avant : chapitre entier envoyé par le client, sans authentification).
  const chapter = await getChapterForPrompt(chapterId)
  if (!chapter) {
    return Response.json({ error: 'Chapitre introuvable ou accès refusé' }, { status: 404 })
  }

  const prompt = buildDetailedLessonPrompt(chapter)

  try {
    const text = await callClaude({ model: 'claude-sonnet-5', prompt, maxTokens: 6000 })
    const lesson = extractJSON(text) as DetailedLesson
    return Response.json(lesson)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[study/lesson]', message)
    return Response.json({ error: message }, { status: e instanceof ClaudeApiError ? e.status : 500 })
  }
}
