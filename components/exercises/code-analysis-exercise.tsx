"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { CodeBlock } from "@/components/code-block"
import { CheckCircle2, XCircle } from "lucide-react"
import type { Lang } from "@/lib/chapters/types"

interface CodeAnalysisData {
  code: string
  target_line: number
  question: string
  expected_answer: string
  key_terms: string[]
  explanation_fr: string
}

interface Props {
  data: CodeAnalysisData
  lang?: Lang
  onResult: (correct: boolean) => void
  onNext: () => void
  onBack: () => void
}

export function CodeAnalysisExercise({ data, lang, onResult, onNext, onBack }: Props) {
  const [answer, setAnswer] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [selfEval, setSelfEval] = useState<boolean | null>(null)
  const [showFr, setShowFr] = useState(false)

  const handleSubmit = () => {
    setSubmitted(true)
  }

  const handleSelfEval = (correct: boolean) => {
    setSelfEval(correct)
    onResult(correct)
  }

  const keyTermsFound = data.key_terms.filter(term =>
    answer.toLowerCase().includes(term.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground mb-1">
          Zeile <strong className="text-warning">{data.target_line}</strong> ist hervorgehoben:
        </p>
        <CodeBlock code={data.code} lang={lang} highlightLine={data.target_line} />
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <p className="font-medium text-sm">{data.question}</p>
        {data.key_terms.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-xs text-muted-foreground">Schlüsselbegriffe:</span>
            {data.key_terms.map(term => (
              <Badge key={term} variant={keyTermsFound.includes(term) && submitted ? 'default' : 'outline'} className="text-xs">
                {term}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {!submitted ? (
        <>
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Schreibe deine Antwort auf Deutsch..."
              className="min-h-32 resize-none"
          />
          <Button onClick={handleSubmit} disabled={answer.trim().length < 10} className="w-full">
            Meine Antwort vergleichen
          </Button>
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Deine Antwort</p>
            <p className="text-sm">{answer}</p>
          </div>

          <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
            <p className="text-xs font-medium text-warning uppercase tracking-wide mb-2">
              Musterlösung
            </p>
            <p className="text-sm">{showFr ? data.explanation_fr : data.expected_answer}</p>
          </div>

          {keyTermsFound.length > 0 && (
            <p className="text-xs text-success">
              ✓ {keyTermsFound.length}/{data.key_terms.length} Schlüsselbegriffe verwendet: {keyTermsFound.join(', ')}
            </p>
          )}

          <Button variant="outline" size="sm" onClick={() => setShowFr(f => !f)}>
            {showFr ? '🇩🇪 Musterlösung auf Deutsch' : '🇫🇷 Explication en français'}
          </Button>

          {selfEval === null && (
            <>
              <p className="text-sm font-medium text-center">Wie war deine Antwort?</p>
              <div className="flex flex-col gap-2 min-[420px]:flex-row">
                <button
                  onClick={() => handleSelfEval(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-success px-3 py-3 text-success transition-all hover:bg-success/10"
                >
                  <CheckCircle2 className="h-5 w-5" /> Richtig
                </button>
                <button
                  onClick={() => handleSelfEval(false)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-destructive px-3 py-3 text-destructive transition-all hover:bg-destructive/10"
                >
                  <XCircle className="h-5 w-5" /> Falsch
                </button>
              </div>
            </>
          )}

          {selfEval !== null && (
            <div className="flex flex-col gap-2 min-[420px]:flex-row">
              <Button variant="outline" onClick={onBack} className="flex-1">Andere Übung</Button>
              <Button onClick={onNext} className="flex-1">Neue Frage →</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
