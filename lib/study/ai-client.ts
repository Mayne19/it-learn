// claude-sonnet-4-6 n'est pas utilisé côté mode étude (seulement par le
// mode Klausur, app/api/klausur|exercise|lesson) — gardé ici uniquement si
// ce fichier est un jour partagé entre les deux modes.
type ClaudeModel = "claude-sonnet-5" | "claude-sonnet-4-6" | "claude-haiku-4-5"

interface CallClaudeOptions {
  model: ClaudeModel
  prompt: string
  maxTokens?: number
}

/** Porte le status HTTP Anthropic d'origine (ex. 429 rate-limit, 401 clé
 * invalide) — sans ça, l'appelant ne peut renvoyer qu'un 500 générique quel
 * que soit le vrai problème. */
export class ClaudeApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = "ClaudeApiError"
  }
}

export async function callClaude({ model, prompt, maxTokens = 2000 }: CallClaudeOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante")

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new ClaudeApiError(data.error?.message ?? "Erreur Anthropic", res.status)

  const text = data.content?.[0]?.text ?? ""
  return text
}

export function extractJSON(text: string): unknown {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start === -1 || end === -1) throw new Error("Pas de JSON trouvé dans la réponse IA")
  return JSON.parse(text.slice(start, end + 1))
}
