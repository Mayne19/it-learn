import { CHAPTERS } from '@/lib/chapters'
import { buildPrompt } from '@/lib/prompts'

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY manquante côté serveur' }, { status: 500 })
  }

  const { chapterId, exerciseType, fillBlankMode } = await req.json()
  const chapter = CHAPTERS.find(c => c.id === chapterId)
  if (!chapter) return Response.json({ error: 'Chapitre non trouvé' }, { status: 404 })

  const prompt = buildPrompt(chapter, exerciseType, fillBlankMode)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
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
  if (start === -1 || end === -1) return Response.json({ error: 'Réponse invalide' }, { status: 500 })

  try {
    const exercise = JSON.parse(text.slice(start, end + 1))
    return Response.json(exercise)
  } catch {
    return Response.json({ error: 'JSON invalide' }, { status: 500 })
  }
}
