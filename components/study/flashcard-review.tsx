"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Sparkles } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import { getApiErrorMessage } from "@/lib/api-errors"
import { getCachedFlashcards, saveFlashcards, getFlashcardProgress, saveFlashcardProgress } from "@/lib/study/flashcard-queries"
import { scheduleNext } from "@/lib/study/spaced-repetition"
import type { Flashcard, FlashcardGrade } from "@/lib/study/types"
import type { StudyChapter } from "@/lib/study/types"

interface Props {
  chapter: StudyChapter
}

const GRADE_LABELS: { grade: FlashcardGrade; label: string; tone: string }[] = [
  { grade: "again", label: "À revoir", tone: "border-destructive/30 text-destructive hover:bg-destructive/10" },
  { grade: "hard", label: "Difficile", tone: "border-warning/30 text-warning hover:bg-warning/10" },
  { grade: "good", label: "Bien", tone: "border-ring/30 text-ring hover:bg-ring/10" },
  { grade: "easy", label: "Facile", tone: "border-success/30 text-success hover:bg-success/10" },
]

export function FlashcardReview({ chapter }: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadCards = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      let existing = await getCachedFlashcards(chapter.id)
      if (existing.length === 0) {
        const res = await fetch('/api/study/flashcards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chapter })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Erreur')
        existing = await saveFlashcards(chapter.id, data.cards)
      }
      setCards(existing)
      setIndex(0)
      setFlipped(false)
    } catch (e) {
      setError(getApiErrorMessage(e instanceof Error ? e.message : 'Erreur'))
    } finally {
      setLoading(false)
    }
  }, [chapter])

  useEffect(() => {
    getSupabaseClient().auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  useEffect(() => {
    Promise.resolve().then(() => loadCards())
  }, [loadCards])

  async function handleGrade(grade: FlashcardGrade) {
    const card = cards[index]
    if (!card) return

    if (userId) {
      try {
        const currentState = await getFlashcardProgress(userId, card.id)
        const nextState = scheduleNext(currentState, grade)
        await saveFlashcardProgress(userId, card.id, nextState, grade)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur')
      }
    }

    setFlipped(false)
    setIndex(i => i + 1)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center py-8 gap-3">
        <Spinner className="size-6 text-primary" />
        <p className="text-sm text-muted-foreground">Préparation de la Lernkartei…</p>
      </div>
    )
  }

  if (error) {
    return <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
  }

  if (cards.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">Aucune carte pour ce chapitre.</p>
  }

  if (index >= cards.length) {
    return (
      <Card className="border border-success/30 bg-success/5 shadow-none">
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
          <Sparkles className="h-6 w-6 text-success" />
          <p className="text-lg font-semibold">Série terminée</p>
          <p className="text-sm text-muted-foreground">{cards.length} cartes révisées.</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => { setIndex(0); setFlipped(false) }}>
            Recommencer la série
          </Button>
        </CardContent>
      </Card>
    )
  }

  const card = cards[index]

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{index + 1} / {cards.length}</p>
      <Card
        className="min-h-40 cursor-pointer border border-border/70 bg-card shadow-none transition-colors hover:border-ring/40"
        onClick={() => setFlipped(f => !f)}
      >
        <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center">
          {!flipped ? (
            <p className="text-xl font-semibold">{card.front_de}</p>
          ) : (
            <div className="space-y-2">
              <p className="text-lg">{card.back_de}</p>
              <p className="text-sm text-muted-foreground italic">{card.back_fr}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{flipped ? "Clique pour revenir au recto" : "Clique pour révéler la réponse"}</p>
        </CardContent>
      </Card>

      {flipped && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GRADE_LABELS.map(({ grade, label, tone }) => (
            <Button key={grade} variant="outline" className={tone} onClick={() => handleGrade(grade)}>
              {label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
