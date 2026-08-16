import type { CourseProfile, StudyChapter } from "./types"

export interface SpeedRoundQuestion {
  question: string
  code: string | null
  answer: string
  distractors: string[]
}

export interface SpeedRoundSet {
  questions: SpeedRoundQuestion[]
}

/**
 * Prompt du Speed Round (étape 5, premier exercice "fun") — série de
 * questions courtes à choix rapide, chronométrées côté client. Génération
 * Haiku, jamais mise en cache : l'intérêt vient de sa variabilité à chaque
 * partie (voir docs/etude-mode-plan.md §4.5).
 */
export function buildSpeedRoundPrompt(
  chapter: Pick<StudyChapter, "title_de" | "concepts" | "summary" | "has_code">,
  profile: CourseProfile
): string {
  const conceptList = chapter.concepts.join(", ")
  const style = profile === "programming" || (profile === "mixed" && chapter.has_code)
    ? "des questions de syntaxe/comportement rapides à trancher (ex: \"que fait cette ligne ?\", \"quel mot-clé manque ici ?\")"
    : "des questions de définition/reconnaissance rapides (ex: \"quel terme correspond à cette définition ?\")"

  return `Génère 8 questions courtes pour un mini-jeu chronométré ("Speed Round") sur le chapitre "${chapter.title_de}".

Résumé : ${chapter.summary}
Concepts : ${conceptList}

Style de questions attendu : ${style}. Chaque question doit se lire et se répondre en quelques secondes — pas de question à tiroirs.

Pour chaque question, fournis une réponse correcte courte ("answer") et 3 réponses fausses plausibles ("distractors") de longueur similaire, pour un affichage à choix rapide (4 options mélangées côté client).
${chapter.has_code ? 'Le champ "code" peut contenir un extrait très court (1-3 lignes) pour les questions qui en ont besoin, sinon null.' : 'Le champ "code" doit toujours être null (ce chapitre n\'a pas de code).'}

Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans backticks :
{
  "questions": [
    {
      "question": "Texte de la question",
      "code": ${chapter.has_code ? "\"extrait de code ou null\"" : "null"},
      "answer": "Réponse correcte courte",
      "distractors": ["Distracteur 1", "Distracteur 2", "Distracteur 3"]
    }
  ]
}`
}
