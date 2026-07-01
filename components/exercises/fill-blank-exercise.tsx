"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CodeBlock } from "@/components/code-block"
import { CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Lang } from "@/lib/chapters/types"

const stableHash = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) % 9973
  }
  return hash
}

interface Blank {
  id: number
  answer: string
  explanation_de: string
}

interface FillBlankData {
  variant: 'assisted' | 'free'
  instruction: string
  code: string
  blanks: Blank[]
  word_bank?: string[]
  explanation_fr: string
}

interface Props {
  data: FillBlankData
  lang?: Lang
  onResult: (correct: boolean) => void
  onNext: () => void
  onBack: () => void
}

export function FillBlankExercise({ data, lang, onResult, onNext, onBack }: Props) {
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>(
    Object.fromEntries(data.blanks.map(b => [b.id, '']))
  )
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [showFr, setShowFr] = useState(false)

  const shuffledBank = useMemo(
    () => data.word_bank ? [...data.word_bank].sort((a, b) => stableHash(a) - stableHash(b)) : [],
    [data.word_bank]
  )

  const isBlankCorrect = (id: number) =>
    userAnswers[id].trim().toLowerCase() === data.blanks.find(b => b.id === id)?.answer.toLowerCase()

  const allFilled = Object.values(userAnswers).every(v => v.trim() !== '')

  const handleWordClick = (word: string) => {
    if (submitted) return
    setSelectedWord(word === selectedWord ? null : word)
  }

  const handleSlotClick = (id: number) => {
    if (submitted) return
    if (selectedWord !== null) {
      const prev = Object.entries(userAnswers).find(([, v]) => v === selectedWord)
      const newAnswers = { ...userAnswers }
      if (prev) newAnswers[parseInt(prev[0])] = ''
      newAnswers[id] = selectedWord
      setUserAnswers(newAnswers)
      setSelectedWord(null)
    } else if (userAnswers[id]) {
      setSelectedWord(userAnswers[id])
      setUserAnswers({ ...userAnswers, [id]: '' })
    }
  }

  const handleFreeInput = (id: number, value: string) => {
    setUserAnswers({ ...userAnswers, [id]: value })
  }

  const handleSubmit = () => {
    setSubmitted(true)
    const allCorrect = data.blanks.every(b => isBlankCorrect(b.id))
    onResult(allCorrect)
  }

  const usedWords = new Set(Object.values(userAnswers).filter(v => v !== ''))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={data.variant === 'assisted' ? 'secondary' : 'outline'}>
          {data.variant === 'assisted' ? 'Mit Wortbank' : 'Ohne Hilfe'}
        </Badge>
        <p className="text-sm text-muted-foreground">{data.instruction}</p>
      </div>

      <CodeBlock
        code={data.code}
        lang={lang}
        renderBlanks={(id) => {
          const filled = userAnswers[id]
          const correct = submitted && isBlankCorrect(id)

          if (data.variant === 'free') {
            return (
              <input
                type="text"
                value={filled}
                onChange={(e) => handleFreeInput(id, e.target.value)}
                disabled={submitted}
                placeholder={`___`}
                className={cn(
                  "mx-1 inline-block w-24 rounded border bg-background/70 px-1 py-0.5 text-center font-mono text-xs",
                  submitted
                    ? correct ? "border-success text-success" : "border-destructive text-destructive"
                    : "border-warning text-warning focus:outline-none"
                )}
              />
            )
          }

          return (
            <button
              onClick={() => handleSlotClick(id)}
              className={cn(
                "mx-1 inline-flex min-w-[56px] items-center justify-center rounded border px-2 py-0.5 font-mono text-xs",
                submitted
                  ? correct ? "border-success bg-success/20 text-success" : "border-destructive bg-destructive/20 text-destructive"
                  : filled
                    ? "border-warning bg-warning/20 text-warning cursor-pointer"
                    : selectedWord !== null ? "border-warning/50 animate-pulse cursor-pointer text-muted-foreground" : "border-dashed border-warning/30 text-muted-foreground cursor-pointer"
              )}
            >
              {filled || `_${id}_`}
            </button>
          )
        }}
      />

      {/* Word bank for assisted mode */}
      {data.variant === 'assisted' && !submitted && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Wortbank:</p>
          <div className="flex flex-wrap gap-2">
            {shuffledBank.map((word, i) => {
              const isUsed = usedWords.has(word)
              const isSel = selectedWord === word
              return (
                <button
                  key={i}
                  onClick={() => handleWordClick(word)}
                  disabled={isUsed}
                  className={cn(
                    "px-3 py-1.5 rounded border text-sm font-mono transition-all",
                    isSel ? "bg-warning text-warning-foreground border-warning" :
                    isUsed ? "opacity-30 border-border cursor-not-allowed" :
                    "border-border hover:border-ring cursor-pointer"
                  )}
                >
                  {word}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {!submitted && (
        <Button onClick={handleSubmit} disabled={!allFilled} className="w-full">
          Lücken prüfen
        </Button>
      )}

      {submitted && (
        <div className="space-y-3">
          {data.blanks.map(blank => {
            const correct = isBlankCorrect(blank.id)
            return (
              <div key={blank.id} className={cn("text-sm p-3 rounded-lg border", correct ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10")}>
                <div className="flex items-center gap-2">
                  {correct ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  <span>Lücke {blank.id}: </span>
                  {!correct && <span className="text-destructive line-through">{userAnswers[blank.id]}</span>}
                  <span className="font-mono font-bold text-success">{blank.answer}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 pl-6">{blank.explanation_de}</p>
              </div>
            )
          })}

          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p>{showFr ? data.explanation_fr : 'Erklärung:'}</p>
            {!showFr && <p className="text-xs text-muted-foreground mt-1">{data.explanation_fr}</p>}
          </div>

          <Button variant="outline" size="sm" onClick={() => setShowFr(f => !f)}>
            {showFr ? '🇩🇪 Erklärung auf Deutsch' : '🇫🇷 Explication en français'}
          </Button>
          <div className="flex flex-col gap-2 min-[420px]:flex-row">
            <Button variant="outline" onClick={onBack} className="flex-1">Andere Übung</Button>
            <Button onClick={onNext} className="flex-1">Neue Frage →</Button>
          </div>
        </div>
      )}
    </div>
  )
}
