import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  try {
    return !!url && !!key && new URL(url).protocol.startsWith('http')
  } catch {
    return false
  }
}

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key || !isSupabaseConfigured()) {
      throw new Error('Supabase non configuré — remplissez .env.local')
    }
    _client = createClient(url, key)
  }
  return _client
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabaseClient()[prop as keyof SupabaseClient]
  }
})

export async function getProgress(userId: string) {
  const { data, error } = await getSupabaseClient()
    .from('progress')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Impossible de charger la progression: ${error.message}`)
  }

  return data ?? []
}

export async function updateProgress(
  userId: string,
  chapterId: number,
  exerciseType: string,
  correct: boolean
) {
  const { error } = await getSupabaseClient().rpc('upsert_progress', {
    p_user_id: userId,
    p_chapter_id: chapterId,
    p_exercise_type: exerciseType,
    p_correct: correct ? 1 : 0
  })

  if (error) {
    throw new Error(`Impossible d'enregistrer la progression: ${error.message}`)
  }
}
