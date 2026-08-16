import type { FlashcardGrade } from "./types"

export interface ReviewState {
  intervalDays: number
  easeFactor: number
  dueAt: string
}

const MIN_EASE_FACTOR = 1.3
const INITIAL_EASE_FACTOR = 2.5

function addDays(from: Date, days: number): Date {
  const result = new Date(from)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

/**
 * SM-2 simplifié : "again" réinitialise l'intervalle, les trois autres notes
 * font grandir l'intervalle en ajustant le facteur de facilité. Fonction pure
 * — aucun accès réseau ni horloge implicite, `now` est injecté pour rester
 * testable avec des dates simulées.
 */
export function scheduleNext(
  state: ReviewState | null,
  grade: FlashcardGrade,
  now: Date = new Date()
): ReviewState {
  const current: ReviewState = state ?? {
    intervalDays: 0,
    easeFactor: INITIAL_EASE_FACTOR,
    dueAt: now.toISOString(),
  }

  if (grade === "again") {
    return {
      intervalDays: 0,
      easeFactor: Math.max(MIN_EASE_FACTOR, current.easeFactor - 0.2),
      dueAt: addDays(now, 1).toISOString(),
    }
  }

  const easeDelta = grade === "hard" ? -0.15 : grade === "easy" ? 0.15 : 0
  const nextEaseFactor = Math.max(MIN_EASE_FACTOR, current.easeFactor + easeDelta)

  let nextIntervalDays: number
  if (current.intervalDays === 0) {
    nextIntervalDays = grade === "hard" ? 1 : grade === "easy" ? 4 : 1
  } else if (current.intervalDays === 1) {
    nextIntervalDays = grade === "hard" ? 2 : grade === "easy" ? 8 : 6
  } else {
    const multiplier = grade === "hard" ? 1.2 : nextEaseFactor
    nextIntervalDays = Math.round(current.intervalDays * multiplier)
  }

  return {
    intervalDays: nextIntervalDays,
    easeFactor: nextEaseFactor,
    dueAt: addDays(now, nextIntervalDays).toISOString(),
  }
}

export function isDue(state: ReviewState, now: Date = new Date()): boolean {
  return new Date(state.dueAt).getTime() <= now.getTime()
}
