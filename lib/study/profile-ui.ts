import { Code2, BookMarked, Zap } from "lucide-react"
import type { CourseProfile } from "@/lib/study/types"

/**
 * Représentation UI du profil d'un cours (icône, couleur, libellé,
 * description) — auparavant dupliquée sous 3 formes différentes
 * (app/etude/[courseId]/page.tsx, app/etude/dashboard/page.tsx,
 * components/study/app-shell.tsx), un seul endroit à mettre à jour si un
 * profil est ajouté un jour.
 */
export interface ProfileUI {
  icon: typeof Code2
  dotColor: string
  label: string
  description: string
}

export const PROFILE_UI: Record<CourseProfile, ProfileUI> = {
  programming: {
    icon: Code2,
    dotColor: "bg-ring",
    label: "Programmation",
    description: "Exercices de code, Bug Hunt, analyse",
  },
  theory: {
    icon: BookMarked,
    dotColor: "bg-success",
    label: "Théorie",
    description: "QCM, appariements, vrai/faux",
  },
  mixed: {
    icon: Zap,
    dotColor: "bg-warning",
    label: "Mixte",
    description: "Combinaison équilibrée",
  },
}
