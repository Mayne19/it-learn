export interface RawChapterCandidate {
  order: number
  title_de: string
  title_fr: string
  concepts: string[]
  summary: string
  has_code: boolean
}

export interface ChapterValidationIssue {
  chapterOrder: number
  kind:
    | "missing_title"
    | "no_concepts"
    | "duplicate_title"
    | "orphan_concept"
    | "order_gap"
  message: string
}

/**
 * Vérifications structurelles du découpage en chapitres renvoyé par
 * l'ingestion IA (étape 1). Purement mécanique, aucun appel réseau —
 * détecte les anomalies avant l'écran de confirmation, plutôt que de les
 * laisser passer silencieusement. Ne bloque rien : les résultats sont
 * affichés à l'utilisateur qui valide ou corrige.
 */
export function validateChapters(chapters: RawChapterCandidate[]): ChapterValidationIssue[] {
  const issues: ChapterValidationIssue[] = []
  const seenTitles = new Set<string>()
  const sortedOrders = [...chapters].map(c => c.order).sort((a, b) => a - b)

  for (const chapter of chapters) {
    if (!chapter.title_de.trim() || !chapter.title_fr.trim()) {
      issues.push({
        chapterOrder: chapter.order,
        kind: "missing_title",
        message: `Chapitre ${chapter.order} : titre manquant (DE ou FR).`,
      })
    }

    if (chapter.concepts.length === 0) {
      issues.push({
        chapterOrder: chapter.order,
        kind: "no_concepts",
        message: `Chapitre ${chapter.order} ("${chapter.title_de}") : aucun concept listé.`,
      })
    }

    const normalizedTitle = chapter.title_de.trim().toLowerCase()
    if (normalizedTitle && seenTitles.has(normalizedTitle)) {
      issues.push({
        chapterOrder: chapter.order,
        kind: "duplicate_title",
        message: `Chapitre ${chapter.order} : titre "${chapter.title_de}" dupliqué avec un autre chapitre.`,
      })
    }
    seenTitles.add(normalizedTitle)

    const summaryLower = chapter.summary.toLowerCase()
    for (const concept of chapter.concepts) {
      const conceptLower = concept.toLowerCase()
      if (conceptLower.length > 2 && !summaryLower.includes(conceptLower)) {
        issues.push({
          chapterOrder: chapter.order,
          kind: "orphan_concept",
          message: `Chapitre ${chapter.order} : le concept "${concept}" n'apparaît pas dans le résumé.`,
        })
      }
    }
  }

  for (let i = 1; i < sortedOrders.length; i++) {
    if (sortedOrders[i] - sortedOrders[i - 1] > 1) {
      issues.push({
        chapterOrder: sortedOrders[i],
        kind: "order_gap",
        message: `Rupture dans la numérotation des chapitres entre ${sortedOrders[i - 1]} et ${sortedOrders[i]}.`,
      })
    }
  }

  return issues
}
