import { getSupabaseClient } from "@/lib/supabase"
import type { CourseProfile, StudyCourse, StudyCourseFile, StudyCourseFileStatus } from "./types"
import type { IngestResult } from "./ingest-prompt"

export async function createStudyCourse(userId: string, title: string): Promise<StudyCourse> {
  const { data, error } = await getSupabaseClient()
    .from("study_courses")
    .insert({ user_id: userId, title, profile: "mixed" })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Impossible de créer le cours: ${error?.message ?? "erreur inconnue"}`)
  }

  return data as StudyCourse
}

export async function listStudyCourses(userId: string): Promise<StudyCourse[]> {
  const { data, error } = await getSupabaseClient()
    .from("study_courses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`Impossible de charger les cours: ${error.message}`)
  }

  return (data ?? []) as StudyCourse[]
}

export async function createStudyCourseFile(
  studyCourseId: string,
  filename: string,
  storagePath: string
): Promise<StudyCourseFile> {
  const { data, error } = await getSupabaseClient()
    .from("study_course_files")
    .insert({ study_course_id: studyCourseId, filename, storage_path: storagePath, status: "pending" })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Impossible d'enregistrer le fichier: ${error?.message ?? "erreur inconnue"}`)
  }

  return data as StudyCourseFile
}

export async function updateStudyCourseFileStatus(
  fileId: string,
  status: StudyCourseFileStatus,
  errorMessage?: string
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("study_course_files")
    .update({ status, error_message: errorMessage ?? null })
    .eq("id", fileId)

  if (error) {
    throw new Error(`Impossible de mettre à jour le statut: ${error.message}`)
  }
}

export async function listStudyCourseFiles(studyCourseId: string): Promise<StudyCourseFile[]> {
  const { data, error } = await getSupabaseClient()
    .from("study_course_files")
    .select("*")
    .eq("study_course_id", studyCourseId)
    .order("uploaded_at", { ascending: true })

  if (error) {
    throw new Error(`Impossible de charger les fichiers: ${error.message}`)
  }

  return (data ?? []) as StudyCourseFile[]
}

/**
 * Enregistre le découpage en chapitres validé par l'utilisateur, met à
 * jour le profil détecté du cours, et rattache les chapitres au fichier
 * source. chapterOrderOffset permet de numéroter en continu quand un cours
 * a été ingéré en plusieurs fichiers/tranches (§5.3 étape 1).
 */
export async function saveIngestResult(
  studyCourseId: string,
  sourceFileId: string,
  ingestResult: Pick<IngestResult, "profile" | "detected_language" | "chapters">,
  chapterOrderOffset: number
): Promise<void> {
  const client = getSupabaseClient()

  const { error: profileError } = await client
    .from("study_courses")
    .update({ profile: ingestResult.profile as CourseProfile, detected_language: ingestResult.detected_language })
    .eq("id", studyCourseId)

  if (profileError) {
    throw new Error(`Impossible de mettre à jour le profil du cours: ${profileError.message}`)
  }

  const rows = ingestResult.chapters.map(chapter => ({
    study_course_id: studyCourseId,
    order: chapter.order + chapterOrderOffset,
    title_de: chapter.title_de,
    title_fr: chapter.title_fr,
    concepts: chapter.concepts,
    summary: chapter.summary,
    has_code: chapter.has_code,
    source_file_id: sourceFileId,
  }))

  const { error: chaptersError } = await client.from("study_chapters").insert(rows)

  if (chaptersError) {
    throw new Error(`Impossible d'enregistrer les chapitres: ${chaptersError.message}`)
  }
}
