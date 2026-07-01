const KEY = 'java-lernen-progress'

interface ProgressRow {
  course_id: string
  chapter_id: number
  exercise_type: string
  correct: number
  total: number
}

export function localGetProgress(): ProgressRow[] {
  if (typeof window === 'undefined') return []
  try {
    const rows = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Partial<ProgressRow>[]
    // Rows saved before multi-course support have no course_id — they were all Java.
    return rows.map(r => ({
      course_id: r.course_id ?? 'java',
      chapter_id: r.chapter_id!,
      exercise_type: r.exercise_type!,
      correct: r.correct ?? 0,
      total: r.total ?? 0,
    }))
  } catch {
    return []
  }
}

export function localUpdateProgress(courseId: string, chapterId: number, exerciseType: string, correct: boolean) {
  if (typeof window === 'undefined') return
  const rows = localGetProgress()
  const existing = rows.find(r => r.course_id === courseId && r.chapter_id === chapterId && r.exercise_type === exerciseType)
  if (existing) {
    existing.correct += correct ? 1 : 0
    existing.total += 1
  } else {
    rows.push({ course_id: courseId, chapter_id: chapterId, exercise_type: exerciseType, correct: correct ? 1 : 0, total: 1 })
  }
  localStorage.setItem(KEY, JSON.stringify(rows))
}
