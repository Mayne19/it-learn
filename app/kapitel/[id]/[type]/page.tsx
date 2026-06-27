"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { isSupabaseConfigured, getSupabaseClient, updateProgress } from "@/lib/supabase"
import { localUpdateProgress } from "@/lib/local-progress"
import { CHAPTERS } from "@/lib/chapters"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MCQExercise } from "@/components/exercises/mcq-exercise"
import { MatchingExercise } from "@/components/exercises/matching-exercise"
import { TrueFalseExercise } from "@/components/exercises/true-false-exercise"
import { FillBlankExercise } from "@/components/exercises/fill-blank-exercise"
import { CodeAnalysisExercise } from "@/components/exercises/code-analysis-exercise"
import { Spinner } from "@/components/ui/spinner"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, RefreshCw, AlertCircle } from "lucide-react"
import { getApiErrorMessage } from "@/lib/api-errors"
import type { User } from "@supabase/supabase-js"

const TYPE_LABELS: Record<string, string> = {
  mcq: 'Multiple Choice',
  matching: 'Zuordnung',
  trueFalse: 'Wahr/Falsch',
  fillBlank: 'Lückentext',
  codeAnalysis: 'Code-Analyse',
}

export default function ExercisePage() {
  const params = useParams()
  const router = useRouter()
  const chapterId = parseInt(params.id as string)
  const exerciseType = params.type as string
  const chapter = CHAPTERS.find(c => c.id === chapterId)

  const [user, setUser] = useState<User | null>(null)
  const [exercise, setExercise] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [progressError, setProgressError] = useState("")
  const [fillBlankMode, setFillBlankMode] = useState<'assisted' | 'free' | null>(
    exerciseType !== 'fillBlank' ? 'assisted' : null
  )
  const [score, setScore] = useState({ correct: 0, total: 0 })

  const loadExercise = useCallback(async (mode?: string) => {
    setLoading(true)
    setError("")
    setExercise(null)
    try {
      const res = await fetch('/api/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId,
          exerciseType,
          fillBlankMode: mode || fillBlankMode
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setExercise(data)
    } catch (e) {
      setError(getApiErrorMessage(e instanceof Error ? e.message : 'Erreur API'))
    } finally {
      setLoading(false)
    }
  }, [chapterId, exerciseType, fillBlankMode])

  useEffect(() => {
    Promise.resolve().then(() => {
      if (!isSupabaseConfigured()) {
        if (exerciseType !== 'fillBlank') loadExercise()
        else setLoading(false)
        return
      }
      getSupabaseClient().auth.getUser().then(({ data }) => {
        if (data.user) setUser(data.user)
        if (exerciseType !== 'fillBlank') loadExercise()
        else setLoading(false)
      })
    })
  }, [exerciseType, loadExercise])

  const handleResult = async (correct: boolean) => {
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))
    setProgressError("")
    try {
      if (isSupabaseConfigured() && user) {
        await updateProgress(user.id, chapterId, exerciseType, correct)
      } else {
        localUpdateProgress(chapterId, exerciseType, correct)
      }
    } catch (error) {
      setProgressError(error instanceof Error ? error.message : "Progression non enregistrée")
    }
  }

  const handleNext = () => loadExercise()
  const handleBack = () => router.push(`/kapitel/${chapterId}`)

  if (!chapter) return <div>Chapitre non trouvé</div>

  const showModeSelector = exerciseType === 'fillBlank' && !fillBlankMode

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href={`/kapitel/${chapterId}`} className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge variant="secondary" className="text-xs">#{chapter.id}</Badge>
            <span className="text-sm font-medium truncate">{chapter.de}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="text-xs">{TYPE_LABELS[exerciseType] || exerciseType}</Badge>
            {score.total > 0 && (
              <span className="text-xs text-muted-foreground">
                Session: {score.correct}/{score.total}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Fill blank mode selector */}
      {showModeSelector && (
        <div className="space-y-3">
          <p className="font-medium">Choisir le mode :</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => { setFillBlankMode('assisted'); loadExercise('assisted') }}
              className="rounded-lg border border-border p-4 text-left transition-all hover:border-ring hover:bg-muted/35"
            >
              <p className="font-semibold text-sm">Avec aide</p>
              <p className="text-xs text-muted-foreground mt-1">Banque de mots fournie — cliquer pour remplir</p>
            </button>
            <button
              onClick={() => { setFillBlankMode('free'); loadExercise('free') }}
              className="rounded-lg border border-border p-4 text-left transition-all hover:border-ring hover:bg-muted/35"
            >
              <p className="font-semibold text-sm">Sans aide</p>
              <p className="text-xs text-muted-foreground mt-1">Taper librement — plus difficile</p>
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && !showModeSelector && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Spinner className="size-8 text-primary" />
          <p className="text-sm text-muted-foreground">Claude génère votre question…</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                <AlertCircle className="h-4 w-4" />
              </span>
              <div className="space-y-1">
                <p className="font-semibold">Impossible de générer l&apos;exercice</p>
                <p className="max-w-2xl text-sm leading-6 text-destructive/85">{error}</p>
              </div>
            </div>
            <Button
              onClick={() => loadExercise()}
              variant="outline"
              size="sm"
              className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 sm:w-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
          </div>
        </div>
      )}
      {progressError && (
        <Alert>
          <AlertCircle />
          <AlertTitle>Progression non enregistrée</AlertTitle>
          <AlertDescription>{progressError}</AlertDescription>
        </Alert>
      )}

      {/* Exercise content */}
      {!loading && !error && exercise && (
        <>
          {exerciseType === 'mcq' && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <MCQExercise data={exercise as any} onResult={handleResult} onNext={handleNext} onBack={handleBack} />
          )}
          {exerciseType === 'matching' && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <MatchingExercise data={exercise as any} onResult={handleResult} onNext={handleNext} onBack={handleBack} />
          )}
          {exerciseType === 'trueFalse' && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <TrueFalseExercise data={exercise as any} onResult={handleResult} onNext={handleNext} onBack={handleBack} />
          )}
          {exerciseType === 'fillBlank' && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <FillBlankExercise data={exercise as any} onResult={handleResult} onNext={handleNext} onBack={handleBack} />
          )}
          {exerciseType === 'codeAnalysis' && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <CodeAnalysisExercise data={exercise as any} onResult={handleResult} onNext={handleNext} onBack={handleBack} />
          )}
        </>
      )}
    </div>
  )
}
