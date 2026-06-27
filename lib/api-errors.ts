export function getApiErrorMessage(message: string) {
  if (message.includes("ANTHROPIC_API_KEY")) {
    return "La clé serveur Anthropic n'est pas configurée. Ajoute ANTHROPIC_API_KEY dans les variables d'environnement Vercel, puis redéploie."
  }

  return message
}
