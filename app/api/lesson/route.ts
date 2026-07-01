import { getChapter } from '@/lib/courses'
import { getLangLabel } from '@/lib/lang'
import { getApiErrorMessage } from '@/lib/api-errors'

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: getApiErrorMessage('ANTHROPIC_API_KEY') },
      { status: 500 }
    )
  }

  const { courseId, chapterId } = await req.json()
  const chapter = getChapter(courseId, chapterId)
  if (!chapter) return Response.json({ error: 'Chapitre non trouvé' }, { status: 404 })

  const langLabel = getLangLabel(chapter.lang)

  const prompt = `Tu es un professeur ${langLabel} expert. Génère un mini-cours de révision très concis (3 minutes maximum) sur le chapitre "${chapter.de}" (${chapter.fr}).

Concepts clés à couvrir : ${chapter.concepts.join(', ')}
Résumé du chapitre : ${chapter.summary}

Le cours doit être utile pour un étudiant francophone qui passe un examen en Allemagne.
Reste court: exactement 2 sections maximum, 1 exemple de code maximum, phrases directes, pas de développement long.

Antworte AUSSCHLIESSLICH mit gültigem JSON. Kein Markdown, keine Backticks.

{
  "title_de": "Titre du cours en allemand",
  "intro_fr": "Introduction courte en français (1 phrase) expliquant l'importance de ce chapitre",
  "sections": [
    {
      "heading_de": "Titre de section en allemand",
      "content_de": "Explication en allemand (1-2 phrases, vocabulaire d'examen)",
      "content_fr": "Même explication en français (1-2 phrases)",
      "code": "Exemple de code ${langLabel} illustratif (ou null si pas pertinent)"
    }
  ],
  "key_points_de": ["Point clé 1 en allemand", "Point clé 2"],
  "traps": [
    {
      "trap_de": "Piège fréquent en allemand",
      "trap_fr": "Explication du piège en français"
    }
  ]
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1600,
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
    const lesson = JSON.parse(text.slice(start, end + 1))
    return Response.json(lesson)
  } catch {
    return Response.json({ error: 'JSON invalide' }, { status: 500 })
  }
}
