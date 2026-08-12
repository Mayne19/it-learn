import { getCourse } from '@/lib/courses'
import { buildKlausurPrompt } from '@/lib/prompts'
import { isKlausurRelevant } from '@/lib/chapters/types'
import { getApiErrorMessage } from '@/lib/api-errors'

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: getApiErrorMessage('ANTHROPIC_API_KEY') },
      { status: 500 }
    )
  }

  const { courseId, variantNumber } = await req.json()
  const course = getCourse(courseId)
  if (!course) return Response.json({ error: 'Cours non trouvé' }, { status: 404 })

  const klausurChapters = course.chapters.filter(isKlausurRelevant)
  if (klausurChapters.length === 0) {
    return Response.json({ error: "Le mode Klausur n'est pas disponible pour ce cours." }, { status: 400 })
  }

  const prompt = buildKlausurPrompt(klausurChapters, variantNumber ?? 1)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
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
    const klausur = JSON.parse(text.slice(start, end + 1))
    return Response.json(klausur)
  } catch {
    return Response.json({ error: 'JSON invalide' }, { status: 500 })
  }
}
