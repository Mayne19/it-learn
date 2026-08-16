import { getSupabaseClient } from "@/lib/supabase"
import type { DetailedLesson } from "./lesson-prompt"
import type { StudyChapter } from "./types"

/**
 * Cache-first : le cours détaillé n'est jamais régénéré automatiquement
 * (voir docs/etude-mode-plan.md §4.5/§4.6) — seulement sur action
 * explicite "régénérer" côté UI, qui appelle saveLessonToCache derrière
 * un nouvel appel à /api/study/lesson.
 */
export async function getCachedLesson(studyChapterId: string): Promise<DetailedLesson | null> {
  const { data, error } = await getSupabaseClient()
    .from("study_lessons_cache")
    .select("content")
    .eq("study_chapter_id", studyChapterId)
    .maybeSingle()

  if (error) {
    throw new Error(`Impossible de charger le cours en cache: ${error.message}`)
  }

  return (data?.content as DetailedLesson) ?? null
}

export async function saveLessonToCache(studyChapterId: string, lesson: DetailedLesson): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("study_lessons_cache")
    .upsert({ study_chapter_id: studyChapterId, content: lesson, generated_at: new Date().toISOString() })

  if (error) {
    throw new Error(`Impossible d'enregistrer le cours en cache: ${error.message}`)
  }
}

export interface StudyChapterWithCourseTitle extends StudyChapter {
  course_title: string
}

/**
 * Charge un chapitre avec le titre de son cours parent — la page chapitre
 * (app/etude/[courseId]/kapitel/[id]/page.tsx) affiche course_title dans
 * son fil d'Ariane et dérive un StudyCourse partiel depuis le retour.
 */
export async function getStudyChapter(studyChapterId: string): Promise<StudyChapterWithCourseTitle | null> {
  const { data, error } = await getSupabaseClient()
    .from("study_chapters")
    .select("*, study_courses(title)")
    .eq("id", studyChapterId)
    .maybeSingle()

  if (error) {
    throw new Error(`Impossible de charger le chapitre: ${error.message}`)
  }

  if (!data) return null

  const { study_courses, ...chapter } = data as StudyChapter & { study_courses: { title: string } | null }
  return { ...chapter, course_title: study_courses?.title ?? "" }
}

export async function listStudyChapters(studyCourseId: string): Promise<StudyChapter[]> {
  const { data, error } = await getSupabaseClient()
    .from("study_chapters")
    .select("*")
    .eq("study_course_id", studyCourseId)
    .order("order", { ascending: true })

  if (error) {
    throw new Error(`Impossible de charger les chapitres: ${error.message}`)
  }

  return (data ?? []) as StudyChapter[]
}

/**
 * Tous les chapitres de tous les cours étude d'un utilisateur, avec le
 * titre du cours parent, la maîtrise (%) et la prochaine échéance de
 * révision — alimente le tableau de bord "aujourd'hui" (app/etude/page.tsx).
 * mastery_pct/next_review viennent de la vue study_chapters_with_progress
 * (voir docs/db-anpassung.md §4) : calculées à la volée depuis
 * study_flashcards_progress, jamais stockées ni à maintenir manuellement.
 * RLS filtre déjà via study_courses.user_id, mais on filtre explicitement
 * pour ne dépendre que de ce que l'appelant a passé.
 */
export interface StudyChapterWithCourse extends StudyChapter {
  course_title: string
  mastery_pct: number
  next_review: string | null
}

export async function listAllStudyChaptersForUser(userId: string): Promise<StudyChapterWithCourse[]> {
  const { data, error } = await getSupabaseClient()
    .from("study_chapters_with_progress")
    .select("*, study_courses!inner(user_id, title)")
    .eq("study_courses.user_id", userId)

  if (error) {
    throw new Error(`Impossible de charger les chapitres: ${error.message}`)
  }

  return (data ?? []).map(row => {
    const { study_courses, ...chapter } = row as StudyChapter & {
      mastery_pct: number
      next_review: string | null
      study_courses: { title: string }
    }
    return { ...chapter, course_title: study_courses.title }
  })
}
