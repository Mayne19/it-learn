import { getSupabaseClient } from "@/lib/supabase"
import type { WebEnrichmentResult } from "./web-enrichment-prompt"

/**
 * Cache-first, comme lesson-queries.ts::getCachedLesson — jamais régénéré
 * automatiquement, seulement via le bouton explicite "Pour aller plus
 * loin" côté UI (voir docs/db-anpassung.md §3bis).
 */
export async function getCachedWebEnrichment(studyChapterId: string): Promise<WebEnrichmentResult | null> {
  const { data, error } = await getSupabaseClient()
    .from("study_web_enrichment")
    .select("content")
    .eq("study_chapter_id", studyChapterId)
    .maybeSingle()

  if (error) {
    throw new Error(`Impossible de charger les sources en cache: ${error.message}`)
  }

  return (data?.content as WebEnrichmentResult) ?? null
}

export async function saveWebEnrichmentToCache(
  studyChapterId: string,
  result: WebEnrichmentResult,
  model: string
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from("study_web_enrichment")
    .upsert({ study_chapter_id: studyChapterId, content: result, model, generated_at: new Date().toISOString() })

  if (error) {
    throw new Error(`Impossible d'enregistrer les sources en cache: ${error.message}`)
  }
}
