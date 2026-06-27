"use client"

import { useEffect, useState } from "react"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { BookOpen, LogIn, LogOut } from "lucide-react"
import type { User } from "@supabase/supabase-js"

export function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const supabaseConfigured = isSupabaseConfigured()
  const router = useRouter()

  useEffect(() => {
    if (!supabaseConfigured) {
      Promise.resolve().then(() => setAuthChecked(true))
      return
    }

    let subscription: { unsubscribe: () => void } | undefined

    Promise.resolve().then(() => {
      try {
        const client = getSupabaseClient()
        client.auth.getUser().then(({ data }) => {
          setUser(data.user)
          setAuthChecked(true)
        })
        const { data } = client.auth.onAuthStateChange((_, session) => {
          setUser(session?.user ?? null)
          setAuthChecked(true)
        })
        subscription = data.subscription
      } catch {
        setAuthChecked(true)
      }
    })

    return () => subscription?.unsubscribe()
  }, [supabaseConfigured])

  const handleLogout = async () => {
    try { await getSupabaseClient().auth.signOut() } catch { /* ignore */ }
    router.push("/login")
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-bold text-lg">Java Lernen</span>
        </div>

        <div className="flex items-center gap-3">
          {authChecked && supabaseConfigured && !user && (
            <Button variant="outline" size="sm" onClick={() => router.push("/login")}>
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Connexion</span>
            </Button>
          )}
          {user && (
            <>
              <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[140px]">
                {user.email}
              </span>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Déconnexion">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
          <ThemeSwitcher small />
        </div>
      </div>
    </header>
  )
}
