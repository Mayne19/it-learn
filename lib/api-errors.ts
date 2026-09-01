export function getApiErrorMessage(message: string) {
  if (message.includes("ANTHROPIC_API_KEY")) {
    return "La clé serveur Anthropic n'est pas configurée. Ajoute ANTHROPIC_API_KEY dans les variables d'environnement Vercel, puis redéploie."
  }

  // Codes d'erreur Postgres les plus fréquents côté écriture study_* — voir
  // lib/study/queries.ts, qui préserve le code dans "[code]: message".
  if (message.includes("[23505]")) {
    return "Cette génération a déjà été enregistrée entre-temps (par un autre onglet ouvert sur ce cours, par exemple). Recharge la page : les chapitres sont probablement déjà là."
  }
  if (message.includes("[23502]")) {
    return "La réponse de l'IA était incomplète (un champ obligatoire manquait). Réessaie la génération."
  }

  return message
}
