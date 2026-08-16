import type { Lang } from "@/lib/chapters/types"

export type CourseProfile = "programming" | "theory" | "mixed"

export interface StudyCourse {
  id: string
  user_id: string
  title: string
  profile: CourseProfile
  detected_language: Lang | null
  created_at: string
}

export type StudyCourseFileStatus = "pending" | "processing" | "done" | "error"

export interface StudyCourseFile {
  id: string
  study_course_id: string
  filename: string
  storage_path: string
  status: StudyCourseFileStatus
  error_message: string | null
  uploaded_at: string
}

export interface StudyChapter {
  id: string
  study_course_id: string
  order: number
  title_de: string
  title_fr: string
  concepts: string[]
  summary: string
  has_code: boolean
  source_file_id: string
}

export interface Flashcard {
  id: string
  study_chapter_id: string
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
}

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
