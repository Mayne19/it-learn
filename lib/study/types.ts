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

export interface StudyCourseFile {
  id: string
  study_course_id: string
  user_id: string
  storage_path: string
  filename: string
  status: "pending" | "processing" | "done" | "error"
  error_message: string | null
  uploaded_at: string
  processed_at: string | null
}

export interface StudyChapter {
  id: string
  study_course_id: string
  user_id: string
  order: number
  title_de: string
  title_fr: string
  concepts: string[]
  summary: string
  has_code: boolean
  source_file_id: string | null
  created_at: string
}

export interface LessonCache {
  study_chapter_id: string
  content: DetailedLesson
  model: string
  generated_at: string
}

export interface DetailedLesson {
  title_de: string
  intro_fr: string
  sections: {
    heading_de: string
    content_de: string
    content_fr: string | null
    code: string | null
    method_fr: string
    example_concret: string | null
  }[]
  key_points_de: string[]
  traps: { trap_de: string; trap_fr: string }[]
}

export interface Flashcard {
  id: string
  study_chapter_id: string
  user_id: string
  front_de: string
  back_de: string
  back_fr: string
}

export interface FlashcardProgress {
  flashcard_id: string
  user_id: string
  interval_days: number
  ease_factor: number
  due_at: string
  last_grade: "again" | "hard" | "good" | "easy" | null
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
