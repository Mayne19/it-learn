"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { isSupabaseConfigured, getSupabaseClient, getProgress } from "@/lib/supabase"
import { localGetProgress } from "@/lib/local-progress"
import { COURSES } from "@/lib/courses"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Gauge } from "@/components/gauge"
import { Coffee, Sparkles, Zap } from "lucide-react"

interface ProgressRow {
  course_id: string
  chapter_id: number
  exercise_type: string
  correct: number
  total: number
}

const COURSE_ICON: Record<string, typeof Coffee> = {
  java: Coffee,
  dynsprachen: Zap,
}

const COURSE_TONE: Record<string, string> = {
  java: "text-ring bg-ring/10",
  dynsprachen: "text-warning bg-warning/10",
}

export default function HomePage() {
  const [progress, setProgress] = useState<ProgressRow[]>([])
  const [loading, setLoading] = useState(true)
  const [progressError, setProgressError] = useState("")

  useEffect(() => {
    Promise.resolve().then(() => {
      if (!isSupabaseConfigured()) {
        setProgress(localGetProgress())
        setLoading(false)
        return
      }
      getSupabaseClient().auth.getUser().then(async ({ data }) => {
        if (!data.user) {
          setProgress(localGetProgress())
          setLoading(false)
          return
        }
        try {
          const rows = await getProgress(data.user.id)
          setProgress(rows as ProgressRow[])
        } catch (error) {
          setProgressError(error instanceof Error ? error.message : "Progression indisponible")
        }
        setLoading(false)
      })
    })
  }, [])

  const getCourseStats = (courseId: string) => {
    const rows = progress.filter(r => r.course_id === courseId)
    const total = rows.reduce((s, r) => s + r.total, 0)
    const correct = rows.reduce((s, r) => s + r.correct, 0)
    const exploredChapters = new Set(rows.filter(r => r.total > 0).map(r => r.chapter_id)).size
    return { total, correct, exploredChapters }
  }

  const globalCorrect = progress.reduce((s, r) => s + r.correct, 0)
  const globalTotal = progress.reduce((s, r) => s + r.total, 0)
  const globalPct = globalTotal > 0 ? Math.round((globalCorrect / globalTotal) * 100) : 0

  if (loading) {
    return (
      <div className="space-y-5 sm:space-y-6">
        <Skeleton className="h-24 w-full rounded-xl sm:h-28" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-7 sm:space-y-8">
      {/* Global progress across every course */}
      <Card className="border border-border/80 border-l-ring bg-muted/30 shadow-none">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 min-[420px]:flex-row min-[420px]:items-center">
            <Gauge value={globalPct} size="large" showValue className="flex-shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Sparkles className="h-4 w-4 text-ring" />
                <p className="text-lg font-semibold">Progression globale</p>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <p>{COURSES.length} cours disponibles</p>
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
        <p className="text-sm text-muted-foreground uppercase tracking-wide font-medium">
          Choisir un cours
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {COURSES.map(course => {
            const { total, correct, exploredChapters } = getCourseStats(course.id)
            const pct = total > 0 ? Math.round((correct / total) * 100) : 0
            const Icon = COURSE_ICON[course.id] ?? Sparkles
            const tone = COURSE_TONE[course.id] ?? "text-ring bg-ring/10"

            return (
              <Link key={course.id} href={`/cours/${course.id}`}>
                <Card className="h-full cursor-pointer border border-border/70 bg-card shadow-none transition-colors hover:border-ring/40 hover:bg-muted/40">
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg ${tone}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="secondary" className="text-xs">{course.chapters.length} Kapitel</Badge>
                    </div>
                    <div>
                      <p className="text-xl font-semibold leading-tight">{course.de}</p>
                      <p className="text-sm text-muted-foreground">{course.fr}</p>
                    </div>
                    <p className="text-sm text-muted-foreground flex-1">{course.description_fr}</p>
                    {total > 0 && (
                      <div className="flex items-center gap-2 border-t border-border/70 pt-3">
                        <Gauge value={pct} size="small" className="flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {exploredChapters}/{course.chapters.length} chapitres explorés
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">{correct}/{total} réponses correctes</p>
                        </div>
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
