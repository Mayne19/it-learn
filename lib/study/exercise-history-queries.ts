import { getSupabaseClient } from "@/lib/supabase"
import type { ExerciseHistoryEntry } from "./types"

/**
 * Enregistre une réponse au Speed Round — alimente next-up.ts
 * (pickNextExercise), qui pondère le prochain exercice suggéré par le taux
 * de réussite réel observé. Volontairement silencieux en cas d'échec : un
 * insert raté ici ne doit jamais interrompre le Speed Round en cours, ce
 * n'est qu'un signal d'apprentissage, pas une donnée critique comme une
 * flashcard ou un chapitre.
 */
export async function recordExerciseAttempt(
  studyChapterId: string,
  exerciseType: string,
  correct: boolean
): Promise<void> {
  try {
    const client = getSupabaseClient()
    const { data: userData, error: userError } = await client.auth.getUser()
    if (userError || !userData.user) return

    await client.from("study_exercise_history").insert({
      study_chapter_id: studyChapterId,
      user_id: userData.user.id,
      exercise_type: exerciseType,
      correct,
    })
  } catch {
    // Signal d'apprentissage best-effort — jamais bloquant pour l'exercice.
  }
}

export async function getExerciseHistory(studyChapterId: string): Promise<ExerciseHistoryEntry[]> {
  const { data, error } = await getSupabaseClient()
    .from("study_exercise_history")
    .select("study_chapter_id, exercise_type, correct, answered_at")
    .eq("study_chapter_id", studyChapterId)

  if (error) {
    throw new Error(`Impossible de charger l'historique d'exercices: ${error.message}`)
  }

  return (data ?? []) as ExerciseHistoryEntry[]
}
