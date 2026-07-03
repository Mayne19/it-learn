"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
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

interface Element {
  id: number
  term_de: string
  term_fr: string
  explanation_fr: string
}

interface MatchingData {
  instruction: string
  code: string | null
  elements?: Element[]
  items_left?: string[]
  items_right?: string[]
  correct_pairs?: [number, string][]
  explanation_de?: string
  explanation_fr?: string
}

interface Props {
  data: MatchingData
  lang?: Lang
  onResult: (correct: boolean) => void
  onNext: () => void
  onBack: () => void
}

export function MatchingExercise({ data, lang, onResult, onNext, onBack }: Props) {
  const isConceptMatching = Boolean(!data.code && data.items_left && data.items_right && data.correct_pairs)
  const conceptItems = useMemo(() => data.items_left ?? [], [data.items_left])
  const conceptDefinitions = useMemo(() => data.items_right ?? [], [data.items_right])
  const correctPairs = useMemo(() => data.correct_pairs ?? [], [data.correct_pairs])
  const markerIds = isConceptMatching
    ? conceptItems.map((_, index) => index)
    : (data.elements ?? []).map(e => e.id)

  const [assignments, setAssignments] = useState<Record<number, number | null>>(
    Object.fromEntries(markerIds.map(id => [id, null]))
  )
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [showFr, setShowFr] = useState(false)

  const shuffled = useMemo(
    () => [...(data.elements ?? [])].sort((a, b) => stableHash(`${a.id}-${a.term_de}`) - stableHash(`${b.id}-${b.term_de}`)),
    [data.elements]
  )

  const shuffledConcepts = useMemo(
    () => conceptItems
      .map((term, index) => ({ id: index, term }))
      .sort((a, b) => stableHash(`${a.id}-${a.term}`) - stableHash(`${b.id}-${b.term}`)),
    [conceptItems]
  )

  const usedTermIds = new Set(Object.values(assignments).filter(v => v !== null) as number[])

  const handleTermClick = (termId: number) => {
    if (submitted) return
    setSelectedTerm(termId === selectedTerm ? null : termId)
  }

  const handleSlotClick = (markerId: number) => {
    if (submitted) return
    if (selectedTerm !== null) {
      const prevSlot = Object.entries(assignments).find(([, v]) => v === selectedTerm)
      const newAssignments = { ...assignments }
      if (prevSlot) newAssignments[parseInt(prevSlot[0])] = null
      newAssignments[markerId] = selectedTerm
      setAssignments(newAssignments)
      setSelectedTerm(null)
    } else if (assignments[markerId] !== null) {
      setSelectedTerm(assignments[markerId])
      setAssignments({ ...assignments, [markerId]: null })
    }
  }

  const allAssigned = Object.values(assignments).every(v => v !== null)
  const correctTermFor = (markerId: number) => {
    if (!isConceptMatching) return markerId

    const pair = correctPairs.find(([, rightLetter]) => rightLetter.toUpperCase().charCodeAt(0) - 65 === markerId)
    if (!pair) return markerId

    return pair[0]
  }
  const isCorrect = (markerId: number) => assignments[markerId] === correctTermFor(markerId)

  const handleSubmit = () => {
    setSubmitted(true)
    const allCorrect = markerIds.every(id => isCorrect(id))
    onResult(allCorrect)
  }

  const getAssignedTerm = (markerId: number) => {
    const termId = assignments[markerId]
    return termId !== null ? (data.elements ?? []).find(e => e.id === termId) : null
  }

  return (
    <div className="space-y-5">
      <p className="font-medium leading-relaxed">{data.instruction}</p>

      {isConceptMatching ? (
        <div className="grid gap-2">
          {conceptDefinitions.map((definition, index) => {
            const assignedId = assignments[index]
            const assignedTerm = assignedId !== null ? conceptItems[assignedId] : null
            const correct = submitted && isCorrect(index)
            const wrong = submitted && !isCorrect(index)

            return (
              <button
                key={index}
                onClick={() => handleSlotClick(index)}
                disabled={submitted}
                className={cn(
                  "rounded-lg border p-3 text-left transition-all",
                  submitted
                    ? correct ? "border-success/50 bg-success/10" : wrong ? "border-destructive/50 bg-destructive/10" : "border-border"
                    : assignments[index] !== null
                      ? "border-warning/50 bg-warning/10"
                      : selectedTerm !== null ? "border-warning/40 bg-warning/5" : "border-border hover:border-ring"
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-6">{definition}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {assignedTerm ? `Zugeordnet: ${assignedTerm}` : "nicht zugeordnet"}
                    </p>
                  </div>
                  {submitted && (correct ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />)}
                </div>
              </button>
            )
          })}
        </div>
      ) : data.code ? (
        <CodeBlock
          code={data.code}
          lang={lang}
          renderMarkers={(id) => (
            <button
              onClick={() => handleSlotClick(id)}
              className={cn(
                "inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold transition-all",
                submitted
                  ? isCorrect(id) ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
                  : assignments[id] !== null
                    ? "bg-warning text-warning-foreground cursor-pointer"
                    : selectedTerm !== null ? "bg-warning/30 text-foreground cursor-pointer animate-pulse" : "bg-warning/50 text-warning-foreground cursor-pointer"
              )}
            >
              {id}
            </button>
          )}
        />
      ) : null}

      {/* Assignment display */}
      {!isConceptMatching && (
        <div className="grid gap-2 sm:grid-cols-2">
          {(data.elements ?? []).map(el => {
          const assigned = getAssignedTerm(el.id)
          const correct = submitted && isCorrect(el.id)
          const wrong = submitted && !isCorrect(el.id)

          return (
            <div
              key={el.id}
              className={cn(
                "rounded-lg border p-3 text-sm",
                correct ? "border-success/50 bg-success/10" : wrong ? "border-destructive/50 bg-destructive/10" : "border-border"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-5 rounded-full bg-warning text-warning-foreground text-xs flex items-center justify-center font-bold flex-shrink-0">
                  {el.id}
                </span>
                {assigned ? (
                  <span className="font-medium">{assigned.term_de}</span>
                ) : (
                  <span className="text-muted-foreground italic">nicht zugeordnet</span>
                )}
                {submitted && (correct ? <CheckCircle2 className="h-3.5 w-3.5 text-success ml-auto" /> : <XCircle className="h-3.5 w-3.5 text-destructive ml-auto" />)}
              </div>
              {submitted && (
                <p className="text-xs text-muted-foreground pl-7">
                  {showFr ? el.explanation_fr : `Richtig: ${el.term_de}`}
                </p>
              )}
            </div>
          )
          })}
        </div>
      )}

      {/* Term bank */}
      {!submitted && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            {isConceptMatching ? "Wortbank - klicke einen Begriff, dann eine Definition:" : "Wortbank - klicke einen Begriff, dann einen Marker:"}
          </p>
          <div className="flex flex-wrap gap-2">
            {(isConceptMatching ? shuffledConcepts : shuffled.map(el => ({ id: el.id, term: el.term_de }))).map(el => {
              const isUsed = usedTermIds.has(el.id)
              const isSelected = selectedTerm === el.id
              return (
                <button
                  key={el.id}
                  onClick={() => handleTermClick(el.id)}
                  disabled={isUsed}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                    isSelected ? "bg-warning text-warning-foreground border-warning" :
                    isUsed ? "opacity-30 border-border cursor-not-allowed" :
                    "border-border hover:border-ring cursor-pointer"
                  )}
                >
                  {el.term}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {!submitted && (
        <Button onClick={handleSubmit} disabled={!allAssigned} className="w-full">
          Lösung prüfen
        </Button>
      )}

      {submitted && (
        <>
          {isConceptMatching && (
            <div className="rounded-lg border border-border bg-muted/35 p-3 text-sm leading-6">
              {showFr ? data.explanation_fr : data.explanation_de}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowFr(f => !f)}>
            {showFr ? 'Erklärung auf Deutsch' : 'Explication en français'}
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
