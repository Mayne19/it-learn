type ClaudeModel = "claude-sonnet-4-6" | "claude-haiku-4-5"

interface CallClaudeOptions {
  model: ClaudeModel
  prompt: string
  maxTokens?: number
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
  if (!res.ok) throw new Error(data.error?.message ?? "Erreur Anthropic")

  const text = data.content?.[0]?.text ?? ""
  return text
}

export function extractJSON(text: string): unknown {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start === -1 || end === -1) throw new Error("Pas de JSON trouvé dans la réponse IA")
  return JSON.parse(text.slice(start, end + 1))
}
