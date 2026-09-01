import { buildFlashcardPrompt } from '@/lib/study/flashcard-prompt'
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

  const prompt = buildFlashcardPrompt(chapter)

  try {
    const text = await callClaude({ model: 'claude-haiku-4-5', prompt, maxTokens: 3000 })
    const parsed = extractJSON(text)
    return Response.json(parsed)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[study/flashcards]', message)
    return Response.json({ error: message }, { status: e instanceof ClaudeApiError ? e.status : 500 })
  }
}
