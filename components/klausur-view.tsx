"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { CodeBlock } from "@/components/code-block"
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress"
import { CheckCircle2, XCircle, Trophy, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Lang } from "@/lib/chapters/types"

type TaskType =
  | "short_answer" | "free_text" | "mcq_single" | "mcq_multi" | "true_false"
  | "code_write" | "code_output" | "find_errors" | "matching" | "fill_blank" | "define"

interface KlausurTask {
  number: number
  points: number
  type: TaskType
  prompt_de: string
  code: string | null
  options: string[] | null
  max_marks: number | null
  items_left: string[] | null
  items_right: string[] | null
  correct_answer_de: string
  explanation_fr: string
}

export interface KlausurData {
  title: string
  total_points: number
  tasks: KlausurTask[]
}

interface Props {
  data: KlausurData
  lang?: Lang
  onFinish: (score: number, total: number) => void
}

const TYPE_LABELS: Record<TaskType, string> = {
  short_answer: "Kurzantwort",
  free_text: "Freitext",
  mcq_single: "Multiple Choice (1 richtig)",
  mcq_multi: "Multiple Choice (mehrere richtig)",
  true_false: "Wahr/Falsch",
  code_write: "Quellcode schreiben",
  code_output: "Ausgabe ermitteln",
  find_errors: "Fehler finden",
  matching: "Zuordnung",
  fill_blank: "Lückentext",
  define: "Begriff bestimmen",
}

const NEEDS_TEXTAREA = new Set<TaskType>(["free_text", "code_write", "code_output", "find_errors"])
const PASS_THRESHOLD_RATIO = 45 / 90

export function KlausurView({ data, lang, onFinish }: Props) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [mcqSelections, setMcqSelections] = useState<Record<number, Set<number>>>({})
  const [finished, setFinished] = useState(false)
  const [earnedPoints, setEarnedPoints] = useState<Record<number, number>>({})

  const passThreshold = useMemo(() => Math.round(data.total_points * PASS_THRESHOLD_RATIO), [data.total_points])

  const setAnswer = (taskNumber: number, value: string) => {
    setAnswers(prev => ({ ...prev, [taskNumber]: value }))
  }

  const toggleMcq = (taskNumber: number, optionIdx: number, single: boolean) => {
    setMcqSelections(prev => {
      const current = new Set(prev[taskNumber] ?? [])
      if (single) {
        current.clear()
        current.add(optionIdx)
      } else if (current.has(optionIdx)) {
        current.delete(optionIdx)
      } else {
        current.add(optionIdx)
      }
      return { ...prev, [taskNumber]: current }
    })
  }

  const handleFinish = () => setFinished(true)

  const gradeTask = (task: KlausurTask, correct: boolean) => {
    setEarnedPoints(prev => ({ ...prev, [task.number]: correct ? task.points : 0 }))
  }

  const totalEarned = Object.values(earnedPoints).reduce((s, p) => s + p, 0)
  const gradedCount = Object.keys(earnedPoints).length
  const allGraded = finished && gradedCount === data.tasks.length
  const passed = totalEarned >= passThreshold

  if (finished && allGraded) {
    return (
      <div className="space-y-6">
        <div className={cn(
          "rounded-xl border p-6 text-center space-y-3",
          passed ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"
        )}>
          <Trophy className={cn("mx-auto h-10 w-10", passed ? "text-success" : "text-destructive")} />
          <p className="text-2xl font-bold tabular-nums">{totalEarned} / {data.total_points} Punkte</p>
          <p className={cn("text-sm font-medium", passed ? "text-success" : "text-destructive")}>
            {passed ? `Bestanden (Grenze: ${passThreshold} Punkte)` : `Nicht bestanden (Grenze: ${passThreshold} Punkte)`}
          </p>
          <Progress value={(totalEarned / data.total_points) * 100}>
            <ProgressTrack>
              <ProgressIndicator className={passed ? "bg-success" : "bg-destructive"} />
            </ProgressTrack>
          </Progress>
        </div>

        <div className="space-y-3">
          {data.tasks.map(task => (
            <div key={task.number} className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
              <span className="text-sm">Aufgabe {task.number} — {TYPE_LABELS[task.type]}</span>
              <Badge variant={earnedPoints[task.number] > 0 ? "default" : "outline"} className="tabular-nums">
                {earnedPoints[task.number]}/{task.points} P.
              </Badge>
            </div>
          ))}
        </div>

        <Button onClick={() => onFinish(totalEarned, data.total_points)} className="w-full">
          <RefreshCw className="h-4 w-4" />
          Zur Klausur-Übersicht
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="sticky top-0 z-10 -mx-4 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur sm:-mx-0 sm:rounded-lg sm:border sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">{data.title}</p>
          <Badge variant="secondary" className="tabular-nums">{data.total_points} Punkte · {data.tasks.length} Aufgaben</Badge>
        </div>
      </div>

      {data.tasks.map(task => (
        <div key={task.number} className="space-y-3 rounded-lg border border-border/80 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">Aufgabe {task.number}</Badge>
            <Badge variant="outline" className="text-xs">{TYPE_LABELS[task.type]}</Badge>
            <Badge variant="secondary" className="ml-auto text-xs tabular-nums">{task.points} P.</Badge>
          </div>

          <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed">{task.prompt_de}</p>

          {task.code && <CodeBlock code={task.code} lang={lang} />}

          {(task.type === "mcq_single" || task.type === "mcq_multi") && task.options && (
            <div className="space-y-2">
              {task.options.map((opt, idx) => {
                const selected = mcqSelections[task.number]?.has(idx) ?? false
                return (
                  <button
                    key={idx}
                    onClick={() => toggleMcq(task.number, idx, task.type === "mcq_single")}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-all",
                      selected ? "border-2 border-primary bg-primary/10" : "border-border hover:border-ring"
                    )}
                  >
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1">{opt.replace(/^[A-F]:\s*/, '')}</span>
                  </button>
                )
              })}
              {task.type === "mcq_multi" && task.max_marks && (
                <p className="text-xs text-muted-foreground">Maximal {task.max_marks} Kreuze erlaubt.</p>
              )}
            </div>
          )}

          {task.type === "matching" && task.items_left && task.items_right && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                {task.items_left.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-2 text-sm">{idx + 1}. {item}</div>
                ))}
              </div>
              <div className="space-y-1.5">
                {task.items_right.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-2 text-sm">{String.fromCharCode(65 + idx)}. {item}</div>
                ))}
              </div>
              <Textarea
                value={answers[task.number] ?? ""}
                onChange={(e) => setAnswer(task.number, e.target.value)}
                placeholder="Deine Zuordnung, z. B. 1-A, 2-C, ..."
                className="sm:col-span-2 min-h-16 resize-none"
              />
            </div>
          )}

          {(task.type === "short_answer" || task.type === "define" || task.type === "fill_blank" || task.type === "true_false") && (
            <Textarea
              value={answers[task.number] ?? ""}
              onChange={(e) => setAnswer(task.number, e.target.value)}
              placeholder="Deine Antwort..."
              className="min-h-16 resize-none"
            />
          )}

          {NEEDS_TEXTAREA.has(task.type) && (
            <Textarea
              value={answers[task.number] ?? ""}
              onChange={(e) => setAnswer(task.number, e.target.value)}
              placeholder="Deine Antwort / dein Code..."
              className="min-h-28 resize-y font-mono text-sm"
            />
          )}
        </div>
      ))}

      {!finished && (
        <Button onClick={handleFinish} size="lg" className="w-full">
          Klausur abgeben und korrigieren
        </Button>
      )}

      {finished && !allGraded && (
        <div className="space-y-6">
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            Vergleiche jede Aufgabe mit der Musterlösung und bewerte selbst ehrlich, ob deine Antwort richtig war.
          </div>
          {data.tasks.map(task => {
            const graded = task.number in earnedPoints
            return (
              <div key={task.number} className="space-y-3 rounded-lg border border-border/80 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">Aufgabe {task.number}</Badge>
                  <Badge variant="secondary" className="ml-auto text-xs tabular-nums">{task.points} P.</Badge>
                </div>
                <p className="text-sm font-medium">{task.prompt_de}</p>
                {task.code && <CodeBlock code={task.code} lang={lang} />}
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Deine Antwort</p>
                  <p className="whitespace-pre-wrap text-sm">
                    {(task.type === "mcq_single" || task.type === "mcq_multi") && task.options
                      ? [...(mcqSelections[task.number] ?? [])].map(i => String.fromCharCode(65 + i)).join(", ") || "(keine Auswahl)"
                      : answers[task.number] || "(keine Antwort)"}
                  </p>
                </div>
                <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                  <p className="text-xs font-medium text-warning uppercase tracking-wide mb-1">Musterlösung</p>
                  <p className="whitespace-pre-wrap text-sm">{task.correct_answer_de}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{task.explanation_fr}</p>
                </div>
                {!graded ? (
                  <div className="flex flex-col gap-2 min-[420px]:flex-row">
                    <button
                      onClick={() => gradeTask(task, true)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-success px-3 py-2 text-sm text-success transition-all hover:bg-success/10"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Richtig ({task.points} P.)
                    </button>
                    <button
                      onClick={() => gradeTask(task, false)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-destructive px-3 py-2 text-sm text-destructive transition-all hover:bg-destructive/10"
                    >
                      <XCircle className="h-4 w-4" /> Falsch (0 P.)
                    </button>
                  </div>
                ) : (
                  <Badge variant={earnedPoints[task.number] > 0 ? "default" : "outline"} className="tabular-nums">
                    {earnedPoints[task.number]}/{task.points} Punkte gewertet
                  </Badge>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
