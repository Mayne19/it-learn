"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CodeBlock } from "@/components/code-block"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Flag } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Lang } from "@/lib/chapters/types"

interface MCQData {
  question: string
  code: string | null
  options: string[]
  correct_indices: number[]
  trap: string
  explanation_de: string
  explanation_fr: string
}

interface Props {
  data: MCQData
  lang?: Lang
  onResult: (correct: boolean) => void
  onNext: () => void
  onBack: () => void
}

export function MCQExercise({ data, lang, onResult, onNext, onBack }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [submitted, setSubmitted] = useState(false)
  const [showFr, setShowFr] = useState(false)

  const isMultiple = data.correct_indices.length > 1
  const isCorrectAnswer = () => {
    if (selected.size !== data.correct_indices.length) return false
    return data.correct_indices.every(i => selected.has(i))
  }

  const toggleOption = (idx: number) => {
    if (submitted) return
    const next = new Set(selected)
    if (isMultiple) {
      if (next.has(idx)) {
        next.delete(idx)
      } else {
        next.add(idx)
      }
    } else {
      next.clear()
      next.add(idx)
    }
    setSelected(next)
  }

  const handleSubmit = () => {
    setSubmitted(true)
    onResult(isCorrectAnswer())
  }

  const correct = submitted && isCorrectAnswer()

  return (
    <div className="space-y-5">
      {isMultiple && (
        <Badge variant="secondary" className="text-xs">Mehrere richtige Antworten möglich</Badge>
      )}
      <p className="text-lg font-medium leading-snug text-balance">{data.question}</p>

      {data.code && (
        <CodeBlock code={data.code} lang={lang} />
      )}

      <div className="space-y-2">
        {data.options.map((opt, idx) => {
          const isSelected = selected.has(idx)
          const isCorrectOpt = data.correct_indices.includes(idx)
          let optClass = "border border-border hover:border-ring"

          if (submitted) {
            if (isCorrectOpt) optClass = "border-2 border-success bg-success/10"
            else if (isSelected && !isCorrectOpt) optClass = "border-2 border-destructive bg-destructive/10"
          } else if (isSelected) {
            optClass = "border-2 border-primary bg-primary/10"
          }

          return (
            <button
              key={idx}
              onClick={() => toggleOption(idx)}
              disabled={submitted}
              className={cn("flex w-full items-start gap-3 rounded-lg px-4 py-3 text-left transition-all", optClass)}
            >
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="text-sm flex-1">{opt.replace(/^[A-D]:\s*/, '')}</span>
              {submitted && isCorrectOpt && <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />}
              {submitted && isSelected && !isCorrectOpt && <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
            </button>
          )
        })}
      </div>

      {!submitted && (
        <Button onClick={handleSubmit} disabled={selected.size === 0} className="w-full">
          Antwort prüfen
        </Button>
      )}

      {submitted && (
        <div className={cn("rounded-lg p-4 space-y-3", correct ? "bg-success/10 border border-success/30" : "bg-destructive/10 border border-destructive/30")}>
          <div className="flex items-center gap-2">
            {correct ? (
              <><CheckCircle2 className="h-5 w-5 text-success" /><span className="font-semibold text-success">Richtig!</span></>
            ) : (
              <><XCircle className="h-5 w-5 text-destructive" /><span className="font-semibold text-destructive">Falsch!</span></>
            )}
          </div>

          {data.trap && (
            <div className="flex items-start gap-2 text-sm text-warning">
              <Flag className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span><strong>Falle:</strong> {data.trap}</span>
            </div>
          )}

          <p className="text-sm">{showFr ? data.explanation_fr : data.explanation_de}</p>
          <Button variant="outline" size="sm" onClick={() => setShowFr(f => !f)}>
            {showFr ? '🇩🇪 Erklärung auf Deutsch' : '🇫🇷 Explication en français'}
          </Button>
        </div>
      )}

      {submitted && (
        <div className="flex flex-col gap-2 min-[420px]:flex-row">
          <Button variant="outline" onClick={onBack} className="flex-1">Andere Übung</Button>
          <Button onClick={onNext} className="flex-1">Neue Frage →</Button>
        </div>
      )}
    </div>
  )
}
