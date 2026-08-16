import type { Lang } from "@/lib/chapters/types"

export type CourseProfile = "programming" | "theory" | "mixed"

export interface StudyCourse {
  id: string
  user_id: string
  title: string
  profile: CourseProfile
  detected_lang: Lang | null
  created_at: string
}

export type StudyCourseFileStatus = "pending" | "processing" | "done" | "error"

export interface StudyCourseFile {
  id: string
  study_course_id: string
  user_id: string
  storage_path: string
  filename: string
  /** Colonne générée côté DB (voir docs/db-anpassung.md §3) — alias de filename. */
  file_name: string
  status: StudyCourseFileStatus
  error_message: string | null
  uploaded_at: string
  processed_at: string | null
}

export interface StudyChapter {
  id: string
  study_course_id: string
  user_id: string
  order: number

  // Titres bilingues (ingestion IA + cours détaillé) et titre simple pour
  // l'affichage. `title` est rempli automatiquement depuis `title_de` par
  // un trigger DB si non fourni — voir docs/db-anpassung.md §3.
  title_de: string
  title_fr: string
  title: string

  concepts: string[]
  summary: string

  has_code: boolean
  code_snippets: string[]
  code_lang: Lang | null

  /** Dupliqué depuis study_courses.profile par trigger DB — jamais à écrire à la main. */
  profile: CourseProfile

  source_file_id: string | null
  created_at: string
}

export interface Flashcard {
  id: string
  study_chapter_id: string
  user_id: string
  front_de: string
  back_de: string
  back_fr: string
}

export type FlashcardGrade = "again" | "hard" | "good" | "easy"

export interface FlashcardProgress {
  flashcard_id: string
  user_id: string
  interval_days: number
  ease_factor: number
  due_at: string
  last_grade: FlashcardGrade | null
  reviews: number
}

export type StudyExerciseType =
  | "mcq"
  | "matching"
  | "trueFalse"
  | "fillBlank"
  | "codeAnalysis"
  | "code"
  | "speedRound"
  | "bugHunt"
  | "conceptMap"

/** One completed exercise attempt, used by the next-up selection algorithm. */
export interface ExerciseHistoryEntry {
  study_chapter_id: string
  exercise_type: string
  correct: boolean
  answered_at: string
}

export interface ExerciseTypeWeight {
  exerciseType: string
  weight: number
}
