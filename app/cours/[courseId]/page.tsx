"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { isSupabaseConfigured, getSupabaseClient, getProgress } from "@/lib/supabase"
import { localGetProgress } from "@/lib/local-progress"
import { getCourse } from "@/lib/courses"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Gauge } from "@/components/gauge"
import { StatusDot } from "@/components/status-dot"
import type { DotState } from "@/components/status-dot"
import { ArrowLeft, Sparkles } from "lucide-react"

interface ProgressRow {
  course_id: string
  chapter_id: number
  exercise_type: string
  correct: number
  total: number
}

export default function CoursePage() {
  const params = useParams()
  const courseId = params.courseId as string
  const course = getCourse(courseId)

  const [progress, setProgress] = useState<ProgressRow[]>([])
  const [loading, setLoading] = useState(true)
  const [progressError, setProgressError] = useState("")

  useEffect(() => {
    Promise.resolve().then(() => {
      if (!isSupabaseConfigured()) {
        setProgress(localGetProgress().filter(r => r.course_id === courseId))
        setLoading(false)
        return
      }
      getSupabaseClient().auth.getUser().then(async ({ data }) => {
        if (!data.user) {
          setProgress(localGetProgress().filter(r => r.course_id === courseId))
          setLoading(false)
          return
        }
        try {
          const rows = await getProgress(data.user.id)
          setProgress((rows as ProgressRow[]).filter(r => r.course_id === courseId))
        } catch (error) {
          setProgressError(error instanceof Error ? error.message : "Progression indisponible")
        }
        setLoading(false)
      })
    })
  }, [courseId])

  if (!course) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-10 text-center">
        <p className="text-lg font-medium">Cours non trouvé</p>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ring hover:underline">
          <ArrowLeft className="h-4 w-4" /> Retour aux cours
        </Link>
      </div>
    )
  }

  const getChapterProgress = (chapterId: number) => {
    const rows = progress.filter(r => r.chapter_id === chapterId)
    const total = rows.reduce((s, r) => s + r.total, 0)
    const correct = rows.reduce((s, r) => s + r.correct, 0)
    return { total, correct, explored: total > 0 }
  }

  const totalExplored = course.chapters.filter(c => getChapterProgress(c.id).explored).length
  const globalCorrect = progress.reduce((s, r) => s + r.correct, 0)
  const globalTotal = progress.reduce((s, r) => s + r.total, 0)
  const globalPct = globalTotal > 0 ? Math.round((globalCorrect / globalTotal) * 100) : 0

  if (loading) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <Skeleton className="h-24 w-full rounded-xl sm:h-28" />
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl sm:h-28" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-7 sm:space-y-8">
      {/* Header */}
      <div className="flex items-start gap-3 sm:gap-4">
        <Link href="/" className="mt-1 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <Badge variant="secondary" className="mb-2">Cours</Badge>
          <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            {course.de}
          </h1>
          <p className="mt-1 text-lg text-muted-foreground sm:text-xl">{course.fr}</p>
        </div>
      </div>

      {/* Global progress with Gauge */}
      <Card className="border border-border/80 border-l-ring bg-muted/30 shadow-none">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 min-[420px]:flex-row min-[420px]:items-center">
            <Gauge value={globalPct} size="large" showValue className="flex-shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Sparkles className="h-4 w-4 text-ring" />
                <p className="text-lg font-semibold">Progression du cours</p>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <p>{totalExplored}/{course.chapters.length} chapitres explorés</p>
                <p>{globalCorrect}/{globalTotal} réponses correctes</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {progressError && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-muted-foreground">
          {progressError}
        </p>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium">
            {course.chapters.length} Kapitel — Cliquer pour réviser
          </p>
          <Sparkles className="hidden h-4 w-4 text-warning sm:block" />
        </div>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {course.chapters.map(chapter => {
            const { total, correct, explored } = getChapterProgress(chapter.id)
            const pct = total > 0 ? Math.round((correct / total) * 100) : 0
            const dotState: DotState = !explored ? 'QUEUED' : pct >= 70 ? 'READY' : 'BUILDING'

            return (
              <Link key={chapter.id} href={`/cours/${courseId}/kapitel/${chapter.id}`}>
                <Card className="h-full min-h-28 cursor-pointer border border-border/70 bg-card shadow-none transition-colors hover:border-ring/40 hover:bg-muted/40">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">#{chapter.id}</Badge>
                      <StatusDot state={dotState} />
                    </div>
                    <p className="text-sm font-semibold leading-tight mb-1">{chapter.de}</p>
                    <p className="text-xs text-muted-foreground leading-tight mb-2">{chapter.fr}</p>
                    {explored && (
                      <div className="flex items-center gap-2">
                        <Gauge value={pct} size="tiny" className="flex-shrink-0" />
                        <span className="text-xs text-muted-foreground tabular-nums">{correct}/{total}</span>
                      </div>
                    )}
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
