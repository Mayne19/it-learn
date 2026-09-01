import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Client Supabase pour les routes API (app/api/*) — même principe que
 * app/api/auth/callback/route.ts : reconstitue la session depuis les
 * cookies de la requête entrante, avec la clé anon (donc RLS s'applique
 * normalement, comme côté navigateur). Contrairement à
 * lib/supabase.ts::getSupabaseClient(), utilisable côté serveur.
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase non configuré côté serveur')
  }

  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      },
    },
  })
}
