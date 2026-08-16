import type { ExerciseHistoryEntry, ExerciseTypeWeight } from "./types"

export interface NextUpCandidate {
  studyChapterId: string
  exerciseType: string
}

interface Stats {
  correct: number
  total: number
}

const NEVER_PRACTICED_BOOST = 2
const MIN_ATTEMPTS_FOR_ERROR_SIGNAL = 3

function statsKey(chapterId: string, exerciseType: string): string {
  return `${chapterId}::${exerciseType}`
}

function buildStatsIndex(history: ExerciseHistoryEntry[]): Map<string, Stats> {
  const index = new Map<string, Stats>()
  for (const entry of history) {
    const key = statsKey(entry.study_chapter_id, entry.exercise_type)
    const existing = index.get(key) ?? { correct: 0, total: 0 }
    existing.total += 1
    if (entry.correct) existing.correct += 1
    index.set(key, existing)
  }
  return index
}

/**
 * Pondère chaque combinaison (chapitre, type d'exercice) candidate en
 * croisant le dosage par défaut du profil (getExerciseMix) avec le taux
 * de réussite réel observé dans l'historique. Un type d'exercice en échec
 * récurrent sur un chapitre est boosté ; un chapitre jamais pratiqué l'est
 * aussi. Pondération linéaire simple, pas de bandit — fonction pure,
 * testable avec un historique simulé, aucun appel réseau.
 */
export function pickNextExercise(
  candidates: NextUpCandidate[],
  mix: ExerciseTypeWeight[],
  history: ExerciseHistoryEntry[]
): NextUpCandidate | null {
  if (candidates.length === 0) return null

  const mixWeight = new Map(mix.map(m => [m.exerciseType, m.weight]))
  const statsIndex = buildStatsIndex(history)

  let best: NextUpCandidate | null = null
  let bestScore = -Infinity

  for (const candidate of candidates) {
    const baseWeight = mixWeight.get(candidate.exerciseType) ?? 1
    const stats = statsIndex.get(statsKey(candidate.studyChapterId, candidate.exerciseType))

    let score: number
    if (!stats || stats.total === 0) {
      score = baseWeight * NEVER_PRACTICED_BOOST
    } else if (stats.total < MIN_ATTEMPTS_FOR_ERROR_SIGNAL) {
      score = baseWeight
    } else {
      const errorRate = 1 - stats.correct / stats.total
      score = baseWeight * (1 + errorRate * 2)
    }

    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }

  return best
}
