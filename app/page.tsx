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
import { BookOpen, ClipboardList, Coffee, Sparkles, Zap } from "lucide-react"

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
  projektmanagement: ClipboardList,
}

const COURSE_TONE: Record<string, string> = {
  java: "text-ring bg-ring/10",
  dynsprachen: "text-warning bg-warning/10",
  projektmanagement: "text-success bg-success/10",
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
      {/* Each course tracks its own progress — there is no cross-course score. */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-ring bg-ring/10">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <p className="text-lg font-semibold">Vos cours</p>
          <p className="text-sm text-muted-foreground">{COURSES.length} cours disponibles — chaque cours a sa propre progression</p>
        </div>
      </div>
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
            const pct = course.chapters.length > 0 ? Math.round((exploredChapters / course.chapters.length) * 100) : 0
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
