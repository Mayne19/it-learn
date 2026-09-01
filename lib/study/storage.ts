import { getSupabaseClient } from "@/lib/supabase"

const BUCKET = "study-course-files"

/**
 * Chemin de stockage attendu par la policy RLS de 0004_study_storage.sql :
 * le premier segment doit être le user_id pour que
 * (storage.foldername(name))[1] = auth.uid()::text passe.
 */
export function buildStoragePath(userId: string, studyCourseId: string, filename: string): string {
  const safeName = filename.replace(/[^\w.\-]+/g, "_")
  return `${userId}/${studyCourseId}/${Date.now()}-${safeName}`
}

export async function uploadCourseFile(
  userId: string,
  studyCourseId: string,
  file: File
): Promise<string> {
  const path = buildStoragePath(userId, studyCourseId, file.name)
  const { error } = await getSupabaseClient().storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/pdf",
    upsert: false,
  })

  if (error) {
    throw new Error(`Échec de l'upload: ${error.message}`)
  }

  return path
}

export async function deleteCourseFile(storagePath: string): Promise<void> {
  const { error } = await getSupabaseClient().storage.from(BUCKET).remove([storagePath])

  if (error) {
    throw new Error(`Échec de la suppression: ${error.message}`)
  }
}
