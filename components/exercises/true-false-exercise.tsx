"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CodeBlock } from "@/components/code-block"
import { CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Lang } from "@/lib/chapters/types"

interface Statement {
  text: string
  code: string | null
  is_true: boolean
  explanation_de: string
  explanation_fr: string
}

interface TrueFalseData {
  statements: Statement[]
}

interface Props {
  data: TrueFalseData
  lang?: Lang
  onResult: (correct: boolean) => void
  onNext: () => void
  onBack: () => void
}

export function TrueFalseExercise({ data, lang, onResult, onNext, onBack }: Props) {
  const [answers, setAnswers] = useState<Record<number, boolean | null>>(
    Object.fromEntries(data.statements.map((_, i) => [i, null]))
  )
  const [submitted, setSubmitted] = useState(false)
  const [showFr, setShowFr] = useState(false)

  const allAnswered = Object.values(answers).every(v => v !== null)

  const handleAnswer = (idx: number, value: boolean) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [idx]: value }))
  }

  const handleSubmit = () => {
    setSubmitted(true)
    const allCorrect = data.statements.every((s, i) => answers[i] === s.is_true)
    const correctCount = data.statements.filter((s, i) => answers[i] === s.is_true).length
    onResult(allCorrect || correctCount >= data.statements.length - 1)
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Wahr oder falsch? Beurteile jede Aussage.</p>

      <div className="space-y-4">
        {data.statements.map((stmt, idx) => {
          const userAnswer = answers[idx]
          const correct = submitted && userAnswer === stmt.is_true

          return (
            <div
              key={idx}
              className={cn(
                "rounded-lg border p-4 space-y-3 transition-all",
                submitted
                  ? correct ? "border-success/50 bg-success/10" : "border-destructive/50 bg-destructive/10"
                  : "border-border"
              )}
            >
              <p className="text-sm font-medium">{stmt.text}</p>
              {stmt.code && <CodeBlock code={stmt.code} lang={lang} />}

              <div className="flex flex-col gap-2 min-[420px]:flex-row">
                <button
                  onClick={() => handleAnswer(idx, true)}
                  disabled={submitted}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                    userAnswer === true
                      ? "bg-success text-success-foreground border-success"
                      : "border-border hover:border-success/50"
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" /> Wahr
                </button>
                <button
                  onClick={() => handleAnswer(idx, false)}
                  disabled={submitted}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                    userAnswer === false
                      ? "bg-destructive text-destructive-foreground border-destructive"
                      : "border-border hover:border-destructive/50"
                  )}
                >
                  <XCircle className="h-4 w-4" /> Falsch
                </button>
              </div>

              {submitted && (
                <div className={cn("text-sm p-2 rounded", correct ? "text-success" : "text-destructive")}>
                  <span className="font-medium">{stmt.is_true ? '✓ Wahr' : '✗ Falsch'} — </span>
                  {showFr ? stmt.explanation_fr : stmt.explanation_de}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!submitted && (
        <Button onClick={handleSubmit} disabled={!allAnswered} className="w-full">
          Antworten prüfen
        </Button>
      )}

      {submitted && (
        <>
          <Button variant="outline" size="sm" onClick={() => setShowFr(f => !f)}>
            {showFr ? '🇩🇪 Erklärung auf Deutsch' : '🇫🇷 Explication en français'}
          </Button>
          <div className="flex flex-col gap-2 min-[420px]:flex-row">
            <Button variant="outline" onClick={onBack} className="flex-1">Andere Übung</Button>
            <Button onClick={onNext} className="flex-1">Neue Frage →</Button>
          </div>
        </>
      )}
    </div>
  )
}
