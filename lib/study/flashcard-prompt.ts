import type { StudyChapter } from "./types"

export interface GeneratedFlashcard {
  front_de: string
  back_de: string
  back_fr: string
}

/**
 * Prompt de génération de flashcards (étape 4, Haiku — génération fréquente
 * et format court, pas besoin de Sonnet, voir docs/etude-mode-plan.md §4.1).
 * Une carte par concept du chapitre, mise en cache après génération
 * (jamais régénérée automatiquement).
 */
export function buildFlashcardPrompt(chapter: Pick<StudyChapter, "title_de" | "concepts" | "summary">): string {
  const conceptList = chapter.concepts.join(", ")

  return `Génère une Lernkartei (jeu de flashcards) pour réviser le chapitre "${chapter.title_de}".

Résumé du chapitre : ${chapter.summary}
Concepts à couvrir : ${conceptList}

Crée UNE carte par concept listé (ni plus, ni moins). Chaque carte :
- "front_de" : le concept ou une question courte en allemand (recto)
- "back_de" : la réponse/définition courte en allemand (verso, 1-2 phrases)
- "back_fr" : la même réponse en français (verso, 1-2 phrases)

Reste concis — une flashcard se lit en quelques secondes, ce n'est pas un cours.

Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans backticks :
{
  "cards": [
    { "front_de": "...", "back_de": "...", "back_fr": "..." }
  ]
}`
}
