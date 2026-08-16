export type Grade = "again" | "hard" | "good" | "easy"

interface CardState {
  interval_days: number
  ease_factor: number
  reviews: number
}

const MIN_EASE = 1.3

/**
 * SM-2 simplifié : calcule le prochain état d'une carte après un grade.
 * Logique pure, pas d'effet de bord, testable sans mock.
 *
 * - again : on recommence (interval = 1), ease baisse
 * - hard : interval × 1.2, ease baisse légèrement
 * - good : interval × ease_factor, ease stable ou léger bonus
 * - easy : interval × ease_factor × 1.3, ease augmente
 */
export function scheduleNext(state: CardState, grade: Grade): CardState {
  const { interval_days, ease_factor, reviews } = state

  switch (grade) {
    case "again":
      return {
        interval_days: 1,
        ease_factor: Math.max(MIN_EASE, ease_factor - 0.2),
        reviews: reviews + 1,
      }

    case "hard":
      return {
        interval_days: Math.max(1, Math.ceil(interval_days * 1.2)),
        ease_factor: Math.max(MIN_EASE, ease_factor - 0.15),
        reviews: reviews + 1,
      }

    case "good": {
      const newEase = reviews === 0
        ? ease_factor
        : Math.min(ease_factor + 0.05, 3.0)
      return {
        interval_days: Math.max(1, Math.ceil(interval_days * ease_factor)),
        ease_factor: newEase,
        reviews: reviews + 1,
      }
    }

    case "easy":
      return {
        interval_days: Math.max(1, Math.ceil(interval_days * ease_factor * 1.3)),
        ease_factor: Math.min(ease_factor + 0.15, 3.0),
        reviews: reviews + 1,
      }
  }
}

export function daysUntilDue(state: CardState, grade: Grade): number {
  return scheduleNext(state, grade).interval_days
}
