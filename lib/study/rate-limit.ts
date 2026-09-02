import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Limite d'appels IA par utilisateur/heure, par catégorie de coût — les
 * routes /api/study/* n'avaient aucune limite : un compte authentifié
 * (légitime ou compromis) pouvait déclencher un nombre illimité d'appels
 * Anthropic payants. Voir docs/db-anpassung.md pour la table
 * study_ai_usage et la fonction increment_ai_usage (incrémentation
 * atomique côté DB, obligatoire pour être correct sous requêtes
 * concurrentes — un simple select-puis-insert côté application serait
 * contournable par deux requêtes simultanées).
 *
 * Deux catégories, pas une limite unique : "heavy" (Sonnet, ingest/lesson,
 * coût nettement plus élevé par appel) reste restrictif ; "light" (Haiku,
 * flashcards/speed-round/ingest-plan) reste généreux pour ne pas gêner un
 * usage normal (plusieurs Speed Rounds d'affilée, par exemple).
 */
export type AiUsageCategory = "heavy" | "light"

const LIMITS: Record<AiUsageCategory, number> = {
  heavy: 20,
  light: 60,
}

export class RateLimitError extends Error {
  constructor(public category: AiUsageCategory, public limit: number) {
    super(`Limite de ${limit} appels par heure atteinte (${category}). Réessaie dans un moment.`)
    this.name = "RateLimitError"
  }
}

/**
 * Incrémente le compteur de l'utilisateur courant pour cette catégorie et
 * jette RateLimitError si la limite horaire est dépassée. À appeler avant
 * tout appel Anthropic coûteux. Fail-open volontaire en cas d'erreur
 * infrastructure (RPC indisponible) : une panne du rate-limiter ne doit
 * pas rendre le site indisponible, seule une vraie limite atteinte bloque.
 */
export async function checkAndConsumeAiQuota(
  supabase: SupabaseClient,
  category: AiUsageCategory
): Promise<void> {
  const { data, error } = await supabase.rpc("increment_ai_usage", { p_category: category })

  if (error) {
    console.error("[rate-limit] increment_ai_usage indisponible, fail-open", error.message)
    return
  }

  const count = data as number
  if (count > LIMITS[category]) {
    throw new RateLimitError(category, LIMITS[category])
  }
}
