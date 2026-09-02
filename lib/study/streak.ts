import { getSupabaseClient } from "@/lib/supabase"

/**
 * Streak de jours consécutifs de révision — mécanisme de motivation le
 * plus efficace du plan d'origine (docs/plan-implementation.md §3c,
 * "streak sur plusieurs jours, milestone à 5/10/25/50"), jamais
 * implémenté : le seul "streak" existant avant ce module ne durait qu'une
 * session (bonnes réponses d'affilée en Speed Round/flashcards).
 *
 * Pas de nouvelle table : une "journée d'activité" est dérivée des deux
 * sources déjà écrites à chaque révision — study_flashcards_progress
 * (updated_at, écrit à chaque notation SM-2) et study_exercise_history
 * (answered_at, écrit à chaque réponse Speed Round).
 */

export interface StudyStreak {
  /** Jours consécutifs jusqu'à aujourd'hui (0 si rien fait aujourd'hui ni hier). */
  current: number
  /** Le plus long streak jamais atteint, sur tout l'historique disponible. */
  best: number
  /** true si une activité a déjà eu lieu aujourd'hui. */
  activeToday: boolean
}

/** Paliers de célébration — mêmes valeurs que le plan d'origine (§3c). */
export const STREAK_MILESTONES = [5, 10, 25, 50, 100] as const

/** Le plus grand palier atteint par `current`, ou null si aucun. */
export function highestReachedMilestone(current: number): number | null {
  const reached = STREAK_MILESTONES.filter(m => current >= m)
  return reached.length > 0 ? reached[reached.length - 1] : null
}

function toDayKey(iso: string): string {
  return iso.slice(0, 10) // "2026-09-02T10:00:00Z" -> "2026-09-02"
}

function addDays(dayKey: string, delta: number): string {
  const d = new Date(dayKey + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

/**
 * Calcul pur à partir d'un ensemble de jours actifs (clés "YYYY-MM-DD") et
 * du jour courant — séparé de la requête DB pour rester testable sans
 * dépendance réseau/horloge système imprévisible.
 */
export function computeStreak(activeDays: Set<string>, todayKey: string): StudyStreak {
  const activeToday = activeDays.has(todayKey)

  // Le streak courant part d'aujourd'hui s'il y a une activité aujourd'hui,
  // sinon d'hier (ne casse pas le streak avant la fin de la journée) —
  // sinon 0.
  let cursor = activeToday ? todayKey : addDays(todayKey, -1)
  let current = 0
  if (activeDays.has(cursor)) {
    while (activeDays.has(cursor)) {
      current++
      cursor = addDays(cursor, -1)
    }
  }

  // Meilleur streak historique : parcourt tous les jours actifs triés,
  // compte les runs consécutifs.
  const sorted = Array.from(activeDays).sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const day of sorted) {
    run = prev !== null && addDays(prev, 1) === day ? run + 1 : 1
    best = Math.max(best, run)
    prev = day
  }

  return { current, best: Math.max(best, current), activeToday }
}

export async function getStudyStreak(userId: string): Promise<StudyStreak> {
  const client = getSupabaseClient()

  const [flashcardDates, exerciseDates] = await Promise.all([
    client
      .from("study_flashcards_progress")
      .select("updated_at")
      .eq("user_id", userId),
    client
      .from("study_exercise_history")
      .select("answered_at")
      .eq("user_id", userId),
  ])

  if (flashcardDates.error) {
    throw new Error(`Impossible de charger le streak: ${flashcardDates.error.message}`)
  }
  if (exerciseDates.error) {
    throw new Error(`Impossible de charger le streak: ${exerciseDates.error.message}`)
  }

  const activeDays = new Set<string>()
  for (const row of flashcardDates.data ?? []) activeDays.add(toDayKey(row.updated_at))
  for (const row of exerciseDates.data ?? []) activeDays.add(toDayKey(row.answered_at))

  const todayKey = new Date().toISOString().slice(0, 10)
  return computeStreak(activeDays, todayKey)
}
