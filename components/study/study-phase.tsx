import { cn } from "@/lib/utils"

interface Props {
  /** 1, 2, 3 — encode la progression pédagogique réelle (comprendre puis
   * mémoriser puis s'entraîner), pas une numérotation décorative. */
  step: number
  title: string
  subtitle: string
  tone: "ring" | "warning" | "success"
  children: React.ReactNode
}

const TONE: Record<Props["tone"], { badge: string; rule: string }> = {
  ring: { badge: "bg-ring/12 text-ring", rule: "bg-ring/25" },
  warning: { badge: "bg-warning/12 text-warning", rule: "bg-warning/25" },
  success: { badge: "bg-success/12 text-success", rule: "bg-success/25" },
}

/**
 * Une phase d'apprentissage sur la page chapitre. La page empilait avant
 * quatre blocs de même poids visuel (concepts, cours, sources, cartes,
 * exercices) sans indiquer par où commencer — les phases donnent un ordre
 * de parcours lisible d'un coup d'œil. Volontairement pas une Card : le
 * conteneur ne doit pas concurrencer visuellement les vraies cartes
 * (accordéons, exercices) qu'il contient.
 */
export function StudyPhase({ step, title, subtitle, tone, children }: Props) {
  const t = TONE[tone]

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
            t.badge,
          )}
        >
          {step}
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className={cn("ml-1 h-px flex-1 rounded-full", t.rule)} />
      </div>

      <div className="space-y-4 sm:pl-10">{children}</div>
    </section>
  )
}
