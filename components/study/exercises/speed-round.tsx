"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { CodeBlock } from "@/components/code-block"
import { Zap, Flame, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { getApiErrorMessage } from "@/lib/api-errors"
import type { CourseProfile, StudyChapter } from "@/lib/study/types"
import type { SpeedRoundQuestion } from "@/lib/study/speed-round-prompt"
import type { Lang } from "@/lib/chapters/types"

interface Props {
  chapter: StudyChapter
  profile: CourseProfile
  lang: Lang
}

const SECONDS_PER_QUESTION = 12

interface ShuffledQuestion extends SpeedRoundQuestion {
  options: string[]
  correctIndex: number
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function prepareQuestions(questions: SpeedRoundQuestion[]): ShuffledQuestion[] {
  return questions.map(q => {
    const options = shuffle([q.answer, ...q.distractors])
    return { ...q, options, correctIndex: options.indexOf(q.answer) }
  })
}

export function SpeedRound({ chapter, profile, lang }: Props) {
  const [questions, setQuestions] = useState<ShuffledQuestion[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(SECONDS_PER_QUESTION)
  const [selected, setSelected] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)

  const loadQuestions = useCallback(async () => {
    setLoading(true)
    setError("")
    setIndex(0)
    setScore(0)
    setStreak(0)
    setBestStreak(0)
    setFinished(false)
    setSelected(null)
    try {
      const res = await fetch('/api/study/speed-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter, profile })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      setQuestions(prepareQuestions(data.questions))
      setSecondsLeft(SECONDS_PER_QUESTION)
    } catch (e) {
      setError(getApiErrorMessage(e instanceof Error ? e.message : 'Erreur'))
    } finally {
      setLoading(false)
    }
  }, [chapter, profile])

  useEffect(() => {
    Promise.resolve().then(() => loadQuestions())
  }, [loadQuestions])

  const current = useMemo(() => questions?.[index] ?? null, [questions, index])

  const handleAnswer = useCallback((optionIndex: number | null) => {
    if (!current || selected !== null) return
    setSelected(optionIndex)
    const correct = optionIndex === current.correctIndex
    if (correct) {
      setScore(s => s + 1)
      setStreak(s => {
        const next = s + 1
        setBestStreak(b => Math.max(b, next))
        return next
      })
    } else {
      setStreak(0)
    }
  }, [current, selected])

  useEffect(() => {
    if (!current || selected !== null || finished) return
    if (secondsLeft <= 0) {
      Promise.resolve().then(() => handleAnswer(null))
      return
    }
    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft, current, selected, finished, handleAnswer])

  function next() {
    if (!questions) return
    if (index + 1 >= questions.length) {
      setFinished(true)
      return
    }
    setIndex(i => i + 1)
    setSelected(null)
    setSecondsLeft(SECONDS_PER_QUESTION)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center py-8 gap-3">
        <Spinner className="size-6 text-primary" />
        <p className="text-sm text-muted-foreground">Préparation du Speed Round…</p>
      </div>
    )
  }

  if (error) {
    return <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
  }

  if (!questions || questions.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">Aucune question générée.</p>
  }

  if (finished) {
    return (
      <Card className="border border-ring/30 bg-ring/5 shadow-none">
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
          <Zap className="h-6 w-6 text-ring" />
          <p className="text-lg font-semibold">Speed Round terminé</p>
          <p className="text-sm text-muted-foreground">
            {score}/{questions.length} correctes · meilleure série : {bestStreak}
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={loadQuestions}>
            <RefreshCw className="h-4 w-4" /> Rejouer avec de nouvelles questions
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!current) return null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{index + 1} / {questions.length}</span>
        <div className="flex items-center gap-3">
          {streak > 1 && (
            <span className="inline-flex items-center gap-1 text-warning">
              <Flame className="h-4 w-4" /> {streak}
            </span>
          )}
          <span className="font-mono tabular-nums">{score} pts</span>
          <span className={cn("font-mono tabular-nums", secondsLeft <= 3 && "text-destructive")}>
            {secondsLeft}s
          </span>
        </div>
      </div>

      <Card className="border border-border/70 bg-card shadow-none">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <p className="text-lg font-semibold">{current.question}</p>
          {current.code && lang !== 'none' && <CodeBlock code={current.code} lang={lang} />}

          <div className="grid gap-2 sm:grid-cols-2">
            {current.options.map((option, i) => {
              const isCorrect = i === current.correctIndex
              const isSelected = i === selected
              const revealed = selected !== null

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={revealed}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    !revealed && "border-border hover:border-ring/40 hover:bg-muted/40",
                    revealed && isCorrect && "border-success/40 bg-success/10 text-success",
                    revealed && isSelected && !isCorrect && "border-destructive/40 bg-destructive/10 text-destructive",
                    revealed && !isCorrect && !isSelected && "border-border/50 opacity-60"
                  )}
                >
                  {option}
                </button>
              )
            })}
          </div>

          {selected !== null && (
            <Button onClick={next} className="w-full">
              {index + 1 >= questions.length ? "Voir le résultat" : "Question suivante"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
