"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { CodeBlock } from "@/components/code-block"
import { Spinner } from "@/components/ui/spinner"
import { CheckCircle2, XCircle, Play, Lightbulb } from "lucide-react"
import { runPython } from "@/lib/pyodide"
import type { Lang } from "@/lib/chapters/types"

interface CodeData {
  variant: "write" | "complete" | "fix"
  instruction_de: string
  instruction_fr: string
  starter_code: string | null
  solution_code: string
  expected_output: string
  hints: string[]
  explanation_de: string
  explanation_fr: string
}

interface Props {
  data: CodeData
  lang?: Lang
  onResult: (correct: boolean) => void
  onNext: () => void
  onBack: () => void
}

const VARIANT_LABELS: Record<CodeData["variant"], string> = {
  write: "Schreiben",
  complete: "Vervollständigen",
  fix: "Fehler korrigieren",
}

export function CodeExercise({ data, onResult, onNext, onBack }: Props) {
  const [code, setCode] = useState(data.starter_code ?? "")
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState<string | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [showHints, setShowHints] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const [selfEval, setSelfEval] = useState<boolean | null>(null)
  const [showFr, setShowFr] = useState(false)

  const normalize = (s: string) => s.trim().replace(/\r\n/g, "\n")
  const matchesExpected = output !== null && normalize(output) === normalize(data.expected_output)

  const handleRun = async () => {
    setRunning(true)
    setRunError(null)
    setOutput(null)
    try {
      const result = await runPython(code)
      if (result.error) {
        setRunError(result.error)
      } else {
        setOutput(result.output)
      }
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Ausführung fehlgeschlagen.")
    } finally {
      setRunning(false)
    }
  }

  const handleSelfEval = (correct: boolean) => {
    setSelfEval(correct)
    onResult(correct)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">{VARIANT_LABELS[data.variant]}</Badge>
        </div>
        <p className="font-medium text-sm">{showFr ? data.instruction_fr : data.instruction_de}</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/80 bg-code shadow-sm">
        <div className="flex items-center justify-between border-b border-border/70 bg-muted/35 px-3 py-2">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-destructive/75" />
            <span className="size-2.5 rounded-full bg-warning/80" />
            <span className="size-2.5 rounded-full bg-success/75" />
          </div>
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Python — Éditeur</span>
        </div>
        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          placeholder="# Schreibe deinen Python-Code hier..."
          className="min-h-48 resize-y rounded-none border-0 bg-transparent font-mono text-[13px] leading-6 shadow-none focus-visible:ring-0 sm:text-sm"
        />
      </div>

      <div className="flex flex-col gap-2 min-[420px]:flex-row">
        <Button onClick={handleRun} disabled={running || code.trim().length === 0} className="flex-1">
          {running ? <Spinner className="size-4" /> : <Play className="h-4 w-4" />}
          {running ? "Exécution..." : "Ausführen"}
        </Button>
        {data.hints.length > 0 && (
          <Button variant="outline" onClick={() => setShowHints(h => !h)}>
            <Lightbulb className="h-4 w-4" />
            {showHints ? "Hinweise ausblenden" : "Hinweise"}
          </Button>
        )}
      </div>

      {showHints && (
        <ul className="space-y-1 rounded-lg border border-ring/25 bg-ring/5 p-3">
          {data.hints.map((hint, i) => (
            <li key={i} className="text-sm flex items-start gap-2">
              <span className="text-ring mt-1">•</span> {hint}
            </li>
          ))}
        </ul>
      )}

      {runError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-xs font-medium text-destructive uppercase tracking-wide mb-2">Fehler</p>
          <pre className="whitespace-pre-wrap font-mono text-xs text-destructive/90">{runError}</pre>
        </div>
      )}

      {output !== null && !runError && (
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Ausgabe</p>
            <pre className="whitespace-pre-wrap font-mono text-sm">{output || "(keine Ausgabe)"}</pre>
          </div>

          <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${matchesExpected ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning"}`}>
            {matchesExpected ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <XCircle className="h-4 w-4 flex-shrink-0" />}
            <span>{matchesExpected ? "Die Ausgabe stimmt mit der erwarteten Lösung überein !" : "Die Ausgabe stimmt (noch) nicht mit der erwarteten Lösung überein."}</span>
          </div>
        </div>
      )}

      {!showSolution && (
        <Button variant="outline" size="sm" onClick={() => setShowSolution(true)} className="w-full">
          Musterlösung anzeigen
        </Button>
      )}

      {showSolution && (
        <div className="space-y-3">
          <CodeBlock code={data.solution_code} lang="python" />
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Erwartete Ausgabe</p>
            <pre className="whitespace-pre-wrap font-mono text-sm">{data.expected_output}</pre>
          </div>
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
            <p className="text-xs font-medium text-warning uppercase tracking-wide mb-2">Erklärung</p>
            <p className="text-sm">{showFr ? data.explanation_fr : data.explanation_de}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFr(f => !f)}>
            {showFr ? '🇩🇪 Erklärung auf Deutsch' : '🇫🇷 Explication en français'}
          </Button>
        </div>
      )}

      {showSolution && selfEval === null && (
        <>
          <p className="text-sm font-medium text-center">Hast du die Aufgabe richtig gelöst?</p>
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
          <Button onClick={onNext} className="flex-1">Neue Aufgabe →</Button>
        </div>
      )}
    </div>
  )
}
