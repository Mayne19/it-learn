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

export async function getStudyChapter(studyChapterId: string): Promise<StudyChapter | null> {
  const { data, error } = await getSupabaseClient()
    .from("study_chapters")
    .select("*")
    .eq("id", studyChapterId)
    .maybeSingle()

  if (error) {
    throw new Error(`Impossible de charger le chapitre: ${error.message}`)
  }

  return (data as StudyChapter) ?? null
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
 * titre du cours parent — alimente le tableau de bord "aujourd'hui"
 * (étape 6). RLS filtre déjà via study_courses.user_id, mais on filtre
 * explicitement pour ne dépendre que de ce que l'appelant a passé.
 */
export interface StudyChapterWithCourse extends StudyChapter {
  course_title: string
}

export async function listAllStudyChaptersForUser(userId: string): Promise<StudyChapterWithCourse[]> {
  const { data, error } = await getSupabaseClient()
    .from("study_chapters")
    .select("*, study_courses!inner(user_id, title)")
    .eq("study_courses.user_id", userId)

  if (error) {
    throw new Error(`Impossible de charger les chapitres: ${error.message}`)
  }

  return (data ?? []).map(row => {
    const { study_courses, ...chapter } = row as StudyChapter & { study_courses: { title: string } }
    return { ...chapter, course_title: study_courses.title }
  })
}
