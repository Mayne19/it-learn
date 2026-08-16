import { buildFlashcardPrompt } from '@/lib/study/flashcard-prompt'
import { getApiErrorMessage } from '@/lib/api-errors'

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

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
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

  try {
    const parsed = JSON.parse(text.slice(start, end + 1))
    return Response.json(parsed)
  } catch {
    return Response.json({ error: 'JSON invalide' }, { status: 500 })
  }
}
