"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Alert, AlertDescription, AlertAction } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { CodeBlock } from "@/components/code-block"
import { Snippet } from "@/components/snippet"
import { AlertCircleIcon, AlertTriangle, BookOpen, CheckCircle2, ChevronDown, RefreshCw } from "lucide-react"
import { getApiErrorMessage } from "@/lib/api-errors"
import type { Lang } from "@/lib/chapters/types"

const isShellCmd = (code: string) =>
  /^(\$\s+|javac\s|java\s|python3?\s|perl\s|node\s|npm\s|pip3?\s|mvn\s|gradle\s|jar\s)/.test(code.trim())

interface LessonSection {
  heading_de: string
  content_de: string
  content_fr: string
  code: string | null
}

interface Trap {
  trap_de: string
  trap_fr: string
}

interface Lesson {
  title_de: string
  intro_fr: string
  sections: LessonSection[]
  key_points_de: string[]
  traps: Trap[]
}

interface Props {
  courseId: string
  chapterId: number
  lang: Lang
}

export function LessonView({ courseId, chapterId, lang }: Props) {
  const [open, setOpen] = useState(false)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showFr, setShowFr] = useState(false)

  const storageKey = `lesson-${courseId}-${chapterId}`

  const loadLesson = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch('/api/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, chapterId })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setLesson(data)
      sessionStorage.setItem(storageKey, JSON.stringify(data))
    } catch (e) {
      setError(getApiErrorMessage(e instanceof Error ? e.message : 'Erreur'))
    } finally {
      setLoading(false)
    }
  }, [courseId, chapterId, storageKey])

  useEffect(() => {
    if (!open || lesson) return

    Promise.resolve().then(() => {
      const cached = sessionStorage.getItem(storageKey)
      if (cached) {
        try {
          setLesson(JSON.parse(cached))
          return
        } catch { /* ignore */ }
      }
      loadLesson()
    })
  }, [loadLesson, lesson, open, storageKey])

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="overflow-hidden rounded-lg border border-border/70 bg-muted/25">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/55">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-ring/10">
            <BookOpen className="h-4 w-4 text-ring" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold">Cours — 3 min</p>
            <p className="text-sm text-muted-foreground">Réviser les notions avant de s&apos;exercer</p>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-5 p-4 pt-0 sm:p-5 sm:pt-0">
        {loading && (
          <div className="flex flex-col items-center py-8 gap-3">
            <Spinner className="size-6 text-primary" />
            <p className="text-sm text-muted-foreground">Claude prépare le cours…</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="items-center gap-3 p-3 sm:grid-cols-[auto_1fr_auto]">
            <AlertCircleIcon />
            <AlertDescription className="text-sm leading-6">{error}</AlertDescription>
            <AlertAction className="static mt-2 sm:mt-0">
              <Button
                variant="outline"
                size="sm"
                onClick={loadLesson}
                className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 sm:w-auto"
              >
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </Button>
            </AlertAction>
          </Alert>
        )}

        {lesson && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground italic">{lesson.intro_fr}</p>
              <Button variant="outline" size="sm" onClick={() => setShowFr(f => !f)} className="w-fit flex-shrink-0">
                {showFr ? '🇩🇪 Deutsch' : '🇫🇷 Français'}
              </Button>
            </div>

            <div className="space-y-5">
              {lesson.sections.map((section, i) => (
                <div key={i} className="space-y-2">
                  <h3 className="scroll-m-20 text-xl font-semibold tracking-tight sm:text-2xl">{section.heading_de}</h3>
                  <p className="leading-7">{showFr ? section.content_fr : section.content_de}</p>
                  {section.code && (
                    isShellCmd(section.code)
                      ? <Snippet text={section.code.trim().replace(/^\$\s*/, '')} />
                      : <CodeBlock code={section.code} lang={lang} />
                  )}
                </div>
              ))}
            </div>

            {lesson.key_points_de.length > 0 && (
              <div className="rounded-lg bg-success/10 border border-success/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-success">
                  <CheckCircle2 className="h-4 w-4" /> À retenir
                </div>
                <ul className="space-y-1">
                  {lesson.key_points_de.map((pt, i) => (
                    <li key={i} className="leading-7 flex items-start gap-2">
                      <span className="text-success mt-1">•</span> {pt}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {lesson.traps.length > 0 && (
              <div className="rounded-lg bg-warning/10 border border-warning/20 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-warning">
                  <AlertTriangle className="h-4 w-4" /> Häufige Fehler / Pièges fréquents
                </div>
                <div className="space-y-2">
                  {lesson.traps.map((trap, i) => (
                    <div key={i} className="space-y-0.5">
                      <p className="text-sm font-medium">{trap.trap_de}</p>
                      <p className="text-sm text-muted-foreground">{trap.trap_fr}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="lg"
              onClick={loadLesson}
              className="h-9 w-full rounded-lg border-border bg-background font-medium hover:bg-muted"
            >
              <RefreshCw className="h-4 w-4" />
              Régénérer le cours
            </Button>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
