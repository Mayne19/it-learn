import type { StudyChapterWithCourse } from "./lesson-queries"

export interface ScheduledDay {
  date: string // YYYY-MM-DD
  chapters: StudyChapterWithCourse[]
}

// Jamais plus que ça en une journée, même si peu de jours restent avant
// l'examen — mieux vaut étaler sur les jours suivants (voir
// buildExamSchedule) qu'un jour surchargé et démotivant à ouvrir.
const MAX_CHAPTERS_PER_DAY = 6

/**
 * Répartit les chapitres d'un cours (pas encore maîtrisés à 100%, ou dus
 * pour révision) sur les jours restants avant `examDate`, en priorisant
 * ceux déjà dus (next_review dépassé) avant ceux jamais explorés. Pure —
 * aucun accès DB, testable directement. Utilisée par
 * app/api/study/exam-schedule pour générer l'export .ics.
 *
 * Le régime dernier-jour n'a pas de sens (réviser le jour de l'examen
 * n'est pas un vrai jour de préparation) : le dernier jour de planning
 * est la veille de examDate.
 */
export function buildExamSchedule(
  chapters: StudyChapterWithCourse[],
  examDate: string,
  today: Date = new Date()
): ScheduledDay[] {
  const exam = new Date(examDate + "T00:00:00")
  const start = new Date(today)
  start.setHours(0, 0, 0, 0)

  const lastPrepDay = new Date(exam)
  lastPrepDay.setDate(lastPrepDay.getDate() - 1)

  const daysAvailable = Math.floor((lastPrepDay.getTime() - start.getTime()) / 86_400_000) + 1
  if (daysAvailable <= 0) return []

  // Priorité : dû (next_review dépassé) > jamais exploré (mastery 0) >
  // en cours (mastery entre 0 et 100), le reste (déjà maîtrisé) est
  // exclu — pas besoin de reprogrammer une révision pour un chapitre acquis.
  const now = today.getTime()
  const pending = chapters
    .filter(c => c.mastery_pct < 100)
    .sort((a, b) => {
      const aDue = a.next_review ? new Date(a.next_review).getTime() <= now : false
      const bDue = b.next_review ? new Date(b.next_review).getTime() <= now : false
      if (aDue !== bDue) return aDue ? -1 : 1
      return a.mastery_pct - b.mastery_pct
    })

  if (pending.length === 0) return []

  const perDay = Math.min(MAX_CHAPTERS_PER_DAY, Math.ceil(pending.length / daysAvailable))
  const schedule: ScheduledDay[] = []
  let cursor = 0

  for (let d = 0; d < daysAvailable && cursor < pending.length; d++) {
    const date = new Date(start)
    date.setDate(date.getDate() + d)
    const dayChapters = pending.slice(cursor, cursor + perDay)
    if (dayChapters.length === 0) break
    schedule.push({ date: toISODate(date), chapters: dayChapters })
    cursor += perDay
  }

  return schedule
}

// toISOString() convertirait toujours en UTC — un utilisateur à l'ouest
// de UTC pourrait voir le premier jour du planning daté de la veille par
// rapport à sa date locale réelle. On formate la date locale directement.
function toISODate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
