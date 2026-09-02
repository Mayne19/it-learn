import { getSupabaseServerClient } from "@/lib/supabase-server"
import type { CourseProfile } from "./types"

/**
 * Champs d'un chapitre réellement consommés par les prompts de génération
 * (lesson-prompt, flashcard-prompt, speed-round-prompt) — voir
 * docs/security-fixes.md. Utilisé par les routes /api/study/lesson,
 * /api/study/flashcards, /api/study/speed-round : elles recevaient
 * auparavant un objet "chapter" entier envoyé tel quel par le client, sans
 * aucune vérification de session ni d'appartenance — n'importe qui pouvait
 * inventer un chapitre et déclencher un appel Anthropic payant sans compte.
 * Elles ne reçoivent plus qu'un chapterId, résolu ici via RLS (donc
 * implicitement authentifié et cantonné aux chapitres de l'appelant).
 */
export interface PromptChapter {
  title_de: string
  title_fr: string
  concepts: string[]
  summary: string
  has_code: boolean
  profile: CourseProfile
}

export async function getChapterForPrompt(chapterId: string): Promise<PromptChapter | null> {
  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase
    .from("study_chapters")
    .select("title_de, title_fr, concepts, summary, has_code, profile")
    .eq("id", chapterId)
    .maybeSingle()

  if (error || !data) return null

  return data as PromptChapter
}
