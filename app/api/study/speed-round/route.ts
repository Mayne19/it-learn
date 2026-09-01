import { buildSpeedRoundPrompt } from '@/lib/study/speed-round-prompt'
import { getApiErrorMessage } from '@/lib/api-errors'
import { callClaude, extractJSON, ClaudeApiError } from '@/lib/study/ai-client'
import type { CourseProfile } from '@/lib/study/types'

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: getApiErrorMessage('ANTHROPIC_API_KEY') },
      { status: 500 }
    )
  }

  const { chapter, profile } = await req.json()
  if (!chapter?.title_de || !Array.isArray(chapter?.concepts)) {
    return Response.json({ error: 'Chapitre invalide' }, { status: 400 })
  }
  if (!['programming', 'theory', 'mixed'].includes(profile)) {
    return Response.json({ error: 'Profil invalide' }, { status: 400 })
  }

  const prompt = buildSpeedRoundPrompt(chapter, profile as CourseProfile)

  try {
    const text = await callClaude({ model: 'claude-haiku-4-5', prompt, maxTokens: 3000 })
    const parsed = extractJSON(text)
    return Response.json(parsed)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[study/speed-round]', message)
    return Response.json({ error: message }, { status: e instanceof ClaudeApiError ? e.status : 500 })
  }
}
