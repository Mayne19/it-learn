import { buildDetailedLessonPrompt, type DetailedLesson } from '@/lib/study/lesson-prompt'
import { getApiErrorMessage } from '@/lib/api-errors'
import { callClaude, extractJSON, ClaudeApiError } from '@/lib/study/ai-client'

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: getApiErrorMessage('ANTHROPIC_API_KEY') },
      { status: 500 }
    )
  }

  const { chapter } = await req.json()
  if (!chapter?.title_de || !Array.isArray(chapter?.concepts)) {
    return Response.json({ error: 'Chapitre invalide' }, { status: 400 })
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
