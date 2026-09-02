"use client"

import { Flame, Trophy } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface Props {
  milestone: number | null
  onClose: () => void
}

const MILESTONE_COPY: Record<number, { title: string; detail: string }> = {
  5: { title: "5 jours d'affilée", detail: "Une bonne habitude commence à se former." },
  10: { title: "10 jours d'affilée", detail: "Deux semaines de régularité, presque." },
  25: { title: "25 jours d'affilée", detail: "Ce n'est plus de la chance, c'est une routine." },
  50: { title: "50 jours d'affilée", detail: "Peu de monde tient aussi longtemps. Bravo." },
  100: { title: "100 jours d'affilée", detail: "Un semestre entier de régularité sans faute." },
}

/**
 * Célébration ponctuelle à chaque nouveau palier de streak (5/10/25/50/100
 * jours) — pas un toast générique : dialog centré avec un vrai moment
 * d'arrêt, dégradé chaleureux cohérent avec la carte "Étude" de la page
 * d'accueil plutôt que des confettis animés génériques. N'apparaît qu'une
 * fois par palier — voir l'appelant pour la mémorisation côté client
 * (localStorage, purement cosmétique, pas de valeur à synchroniser entre
 * appareils).
 */
export function MilestoneCelebration({ milestone, onClose }: Props) {
  const copy = milestone !== null ? MILESTONE_COPY[milestone] : null

  return (
    <Dialog open={milestone !== null} onOpenChange={open => !open && onClose()}>
      <DialogContent showCloseButton={false} className="overflow-hidden">
        {copy && (
          <>
            <div className="relative -m-4 mb-0 flex flex-col items-center gap-3 bg-gradient-to-br from-warning/15 via-destructive/10 to-warning/5 px-4 pt-8 pb-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-warning to-destructive text-white shadow-lg">
                <Flame className="h-8 w-8 fill-white" />
              </div>
              <DialogTitle className="text-xl font-bold">{copy.title}</DialogTitle>
            </div>
            <div className="space-y-4 px-1 pb-1 text-center">
              <DialogDescription className="text-sm">{copy.detail}</DialogDescription>
              <Button onClick={onClose} className="w-full gap-2">
                <Trophy className="h-4 w-4" /> Continuer
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
