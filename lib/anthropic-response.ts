interface AnthropicContentBlock {
  type: string
  text?: string
}

/**
 * Le premier bloc de `content` d'une réponse Messages API n'est pas
 * forcément du texte — Claude peut répondre avec un bloc "thinking" en tête
 * suivi du bloc "text" (observé en pratique sur claude-sonnet-5 avec un PDF
 * volumineux en pièce jointe : content = [thinking, text]). Lire
 * content[0].text donnait alors une chaîne vide, silencieusement, malgré
 * une réponse complète et valide juste derrière — cherche le premier bloc
 * de type "text" peu importe sa position. Partagé entre le mode étude
 * (lib/study/ai-client.ts) et le mode Klausur (app/api/{klausur,exercise,
 * lesson}/route.ts), qui faisaient chacun la même erreur indépendamment.
 */
export function extractTextBlock(content: AnthropicContentBlock[] | undefined): string {
  return content?.find(b => b.type === "text")?.text ?? ""
}
