"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { isSupabaseConfigured, getSupabaseClient, getProgress } from "@/lib/supabase"
import { localGetProgress } from "@/lib/local-progress"
import { CHAPTERS } from "@/lib/chapters"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Gauge } from "@/components/gauge"
import { StatusDot } from "@/components/status-dot"
import { Snippet } from "@/components/snippet"
import { ArrowLeft, LayoutList, GitMerge, ToggleLeft, Type, Code2 } from "lucide-react"
import { LessonView } from "@/components/lesson-view"

interface ProgressRow {
  chapter_id: number
  exercise_type: string
  correct: number
  total: number
}

const EXERCISE_TYPES = [
  { id: 'mcq',          label: 'QCM',          de: 'Multiple Choice', icon: LayoutList, desc: 'Question à choix multiples (1 ou 2 bonnes réponses)', tone: 'text-ring bg-ring/10' },
  { id: 'matching',     label: 'Zuordnung',     de: 'Zuordnung',       icon: GitMerge,   desc: 'Associer les éléments marqués aux bons termes', tone: 'text-success bg-success/10' },
  { id: 'trueFalse',    label: 'Vrai/Faux',     de: 'Wahr/Falsch',     icon: ToggleLeft, desc: '4 affirmations — 2 vraies, 2 fausses', tone: 'text-warning bg-warning/10' },
  { id: 'fillBlank',    label: 'Lückentext',    de: 'Lückentext',      icon: Type,       desc: 'Compléter le code Java (avec ou sans aide)', tone: 'text-code-token-type bg-code-token-type/10' },
  { id: 'codeAnalysis', label: 'Code-Analyse',  de: 'Code-Analyse',    icon: Code2,      desc: 'Expliquer une ligne de code ciblée', tone: 'text-destructive bg-destructive/10' },
]

export default function ChapterPage() {
  const params = useParams()
  const router = useRouter()
  const chapterId = parseInt(params.id as string)
  const chapter = CHAPTERS.find(c => c.id === chapterId)

  const [progress, setProgress] = useState<ProgressRow[]>([])
  const [progressError, setProgressError] = useState("")

  useEffect(() => {
    Promise.resolve().then(() => {
      if (!isSupabaseConfigured()) {
        setProgress(localGetProgress().filter(r => r.chapter_id === chapterId))
        return
      }
      getSupabaseClient().auth.getUser().then(async ({ data }) => {
        if (!data.user) {
          setProgress(localGetProgress().filter((r: ProgressRow) => r.chapter_id === chapterId))
          return
        }
        try {
          const rows = await getProgress(data.user.id)
          setProgress((rows as ProgressRow[]).filter(r => r.chapter_id === chapterId))
        } catch (error) {
          setProgressError(error instanceof Error ? error.message : "Progression indisponible")
        }
      })
    })
  }, [router, chapterId])

  if (!chapter) return <div className="text-center py-10">Chapitre non trouvé</div>

  const getTypeProgress = (typeId: string) => {
    const row = progress.find(r => r.exercise_type === typeId)
    return row ? { correct: row.correct, total: row.total } : null
  }

  const totalCorrect = progress.reduce((s, r) => s + r.correct, 0)
  const totalAnswers = progress.reduce((s, r) => s + r.total, 0)
  const chapterPct = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0

  return (
    <div className="mx-auto max-w-4xl space-y-7 sm:space-y-8">
      {/* Header */}
      <div className="flex items-start gap-3 sm:gap-4">
        <Link href="/" className="mt-1 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <Badge variant="secondary" className="mb-2">Kapitel {chapter.id}</Badge>
          <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            {chapter.de}
          </h1>
          <p className="mt-1 text-lg text-muted-foreground sm:text-xl">{chapter.fr}</p>
        </div>
      </div>

      {/* Chapter info */}
      <Card className="border border-border/80 bg-muted/25 shadow-none">
        <CardContent className="p-4 sm:p-5">
          <p className="leading-7 text-muted-foreground">{chapter.summary}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {chapter.concepts.map(c => (
              <Badge key={c} variant="outline" className="text-xs font-mono">{c}</Badge>
            ))}
          </div>
          {totalAnswers > 0 && (
            <div className="mt-5 flex items-center gap-4 border-t border-border/70 pt-4">
              <Gauge value={chapterPct} size="medium" showValue className="flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Score global ce chapitre</p>
                <p className="text-2xl font-semibold tabular-nums">{totalCorrect}/{totalAnswers}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {progressError && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-muted-foreground">
          {progressError}
        </p>
      )}

      {/* Java quick commands — Snippet */}
      <section className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Commandes utiles</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Snippet text={`javac ${chapter.de.replace(/\s+/g, '')}.java`} />
          <Snippet text={`java ${chapter.de.replace(/\s+/g, '')}`} />
        </div>
      </section>

      {/* Lesson */}
      <LessonView chapterId={chapter.id} />

      {/* Exercise types */}
      <section>
        <h2 className="mb-4 scroll-m-20 text-2xl font-semibold tracking-tight first:mt-0 sm:mb-5 sm:text-3xl">
          Choisir un type d&apos;exercice
        </h2>
        <div className="grid gap-3">
          {EXERCISE_TYPES.map(type => {
            const prog = getTypeProgress(type.id)
            const typePct = prog ? Math.round((prog.correct / prog.total) * 100) : 0
            const Icon = type.icon

            return (
              <Link key={type.id} href={`/kapitel/${chapter.id}/${type.id}`}>
                <Card className="cursor-pointer border border-border/80 bg-card shadow-none transition-colors hover:border-ring/40 hover:bg-muted/35">
                  <CardContent className="flex gap-3 p-4 sm:items-center sm:gap-4">
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${type.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-lg font-semibold">{type.label}</p>
                        <span className="text-sm text-muted-foreground">— {type.de}</span>
                        {prog && (
                          <StatusDot
                            state={typePct >= 70 ? 'READY' : 'BUILDING'}
                            className="ml-auto"
                          />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{type.desc}</p>
                      {prog && (
                        <div className="flex items-center gap-2 mt-2">
                          <Gauge value={typePct} size="tiny" />
                          <span className="text-xs text-muted-foreground">{prog.correct}/{prog.total}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
