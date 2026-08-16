import type { CourseProfile, ExerciseTypeWeight, StudyChapter } from "./types"

const PROGRAMMING_MIX: ExerciseTypeWeight[] = [
  { exerciseType: "code", weight: 3 },
  { exerciseType: "codeAnalysis", weight: 2 },
  { exerciseType: "flashcard", weight: 2 },
  { exerciseType: "mcq", weight: 1 },
  { exerciseType: "speedRound", weight: 2 },
]

const THEORY_MIX: ExerciseTypeWeight[] = [
  { exerciseType: "flashcard", weight: 3 },
  { exerciseType: "mcq", weight: 2 },
  { exerciseType: "matching", weight: 1 },
  { exerciseType: "trueFalse", weight: 1 },
  { exerciseType: "speedRound", weight: 3 },
]

/**
 * Dosage par défaut des types d'exercice, selon le profil de cours détecté
 * à l'ingestion. Table de règles pure — aucun appel IA. Pour un cours
 * "mixed", le dosage suit chapter.has_code chapitre par chapitre plutôt
 * qu'une moyenne globale sur tout le cours.
 */
export function getExerciseMix(
  profile: CourseProfile,
  chapter: Pick<StudyChapter, "has_code">
): ExerciseTypeWeight[] {
  if (profile === "programming") return PROGRAMMING_MIX
  if (profile === "theory") return THEORY_MIX
  return chapter.has_code ? PROGRAMMING_MIX : THEORY_MIX
}
