/**
 * Passe 1 de l'ingestion d'un PDF volumineux (voir lib/study/pdf-split.ts) :
 * repère uniquement les pages où commence chaque chapitre, à partir du
 * texte brut extrait (pas du PDF natif — cette passe n'a pas besoin de
 * voir les schémas, seulement la structure/les titres). Tourne sur Haiku,
 * quasi gratuit, pour ne pas payer deux fois le coût du PDF natif.
 */
export function buildChapterBoundariesPrompt(pageTexts: { page: number; text: string }[]): string {
  const numbered = pageTexts
    .map(p => `--- Page ${p.page} ---\n${p.text.slice(0, 1500)}`)
    .join("\n\n")

  return `Voici le texte brut extrait d'un support de cours, page par page (texte tronqué à 1500 caractères par page — largement suffisant pour repérer un titre de chapitre).

Identifie à quelle page commence chaque nouvelle unité thématique cohérente (un chapitre, pas une simple sous-section) — page de garde et sommaire non compris.

Règles :
- La première unité commence obligatoirement page 1, même sans titre explicite.
- Ne découpe pas trop finement : un chapitre = un thème cohérent sur plusieurs pages, pas un titre de slide isolé.
- Si le document ne montre aucune structure claire en chapitres, renvoie une seule frontière à la page 1.

Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans backticks :
{
  "chapter_start_pages": [1, 12, 28]
}

Texte du document :

${numbered}`
}
