"use client"

import { Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StudyStreak } from "@/lib/study/streak"

interface Props {
  streak: StudyStreak
  className?: string
}

/**
 * Badge de streak — pas une simple icône+chiffre : la flamme change
 * réellement d'état visuel selon la situation, pour que le badge porte
 * l'information sans avoir à lire le texte à côté :
 * - actif aujourd'hui : flamme pleine, dégradé chaud, légère pulsation —
 *   récompense immédiate d'avoir déjà agi aujourd'hui
 * - streak en cours mais rien fait aujourd'hui : flamme contour, teinte
 *   ambre neutre — rappelle sans culpabiliser, la grâce dure jusqu'à
 *   minuit (voir computeStreak)
 * - streak à zéro : flamme grise discrète, invite plutôt qu'alarme
 */
export function StreakBadge({ streak, className }: Props) {
  const { current, activeToday } = streak

  if (current === 0) {
    return (
      <div className={cn("flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1.5", className)}>
        <Flame className="h-4 w-4 text-muted-foreground/60" />
        <span className="text-sm text-muted-foreground">Commence ton streak aujourd&apos;hui</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors",
        activeToday
          ? "border-warning/40 bg-gradient-to-r from-warning/15 to-destructive/10"
          : "border-warning/25 bg-warning/5",
        className
      )}
      title={activeToday ? `${current} jour${current > 1 ? "s" : ""} d'affilée — déjà fait aujourd'hui` : `${current} jour${current > 1 ? "s" : ""} d'affilée — pas encore fait aujourd'hui`}
    >
      <Flame
        className={cn(
          "h-4 w-4",
          activeToday ? "fill-warning text-warning animate-pulse" : "text-warning/70"
        )}
      />
      <span className="text-sm font-semibold tabular-nums text-foreground">
        {current}
      </span>
      <span className="text-sm text-muted-foreground">
        jour{current > 1 ? "s" : ""} {!activeToday && "— à faire aujourd'hui"}
      </span>
    </div>
  )
}
