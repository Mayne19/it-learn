"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

/**
 * Le mode étude (/etude/*) a sa propre coquille plein écran (sidebar,
 * voir components/study/app-shell.tsx) — pas de header horizontal ni de
 * conteneur centré avec padding. Le reste du site (mode Klausur) garde
 * le conteneur classique défini ici.
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isStudyMode = pathname?.startsWith("/etude")

  if (isStudyMode) {
    return <div className="min-h-screen">{children}</div>
  }

  return (
    <main className={cn("mx-auto max-w-screen-xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8")}>
      {children}
    </main>
  )
}
