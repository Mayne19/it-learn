"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Flame, ArrowRight, Zap, Star, CheckCircle, Clock, AlertCircle, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { getSupabaseClient } from "@/lib/supabase"
import {
  listAllStudyChaptersForUser,
  type StudyChapterWithCourse,
} from "@/lib/study/lesson-queries"

interface CourseSummary {
  courseId: string
  title: string
  chapterCount: number
  doneCount: number
}

export default function EtudeDashboardPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [chapters, setChapters] = useState<StudyChapterWithCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    async function run() {
      const { data: { user } } = await getSupabaseClient().auth.getUser()
      if (cancelled || !user) return
      setUserId(user.id)
      try {
        const all = await listAllStudyChaptersForUser(user.id)
        if (cancelled) return
        setChapters(all)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  const dueChapters = useMemo(
    () => chapters.filter(c => c.next_review && new Date(c.next_review) <= new Date()),
    [chapters],
  )

  const neverExplored = useMemo(
    () => chapters.filter(c => c.mastery_pct === 0),
    [chapters],
  )

  const inProgress = useMemo(
    () => chapters.filter(c => c.mastery_pct > 0 && c.mastery_pct < 100),
    [chapters],
  )

  const courseSummaries = useMemo(() => {
    const map = new Map<string, CourseSummary>()
    for (const c of chapters) {
      if (!map.has(c.study_course_id)) {
        map.set(c.study_course_id, {
          courseId: c.study_course_id,
          title: c.course_title,
          chapterCount: 0,
          doneCount: 0,
        })
      }
      const s = map.get(c.study_course_id)!
      s.chapterCount++
      if (c.mastery_pct === 100) s.doneCount++
    }
    return Array.from(map.values())
  }, [chapters])

  const totalMastery = useMemo(() => {
    if (chapters.length === 0) return 0
    const sum = chapters.reduce((acc, c) => acc + c.mastery_pct, 0)
    return Math.round(sum / chapters.length)
  }, [chapters])

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="h-8 w-48 rounded bg-muted/60 animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-lg bg-muted/40 animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      </main>
    )
  }

  if (chapters.length === 0) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Étude</h1>
        <Card className="border-dashed border-2 border-muted-foreground/20 bg-muted/10">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ring/10">
              <BookOpen className="h-6 w-6 text-ring" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">Aucun cours encore</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Crée ton premier cours dans le tableau de bord pour commencer à réviser.
              </p>
            </div>
            <Link href="/etude/dashboard">
              <Button>
                Créer un cours <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header with streak & progress */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aujourd&apos;hui</h1>
          <p className="text-muted-foreground mt-1">
            {dueChapters.length > 0
              ? `${dueChapters.length} carte${dueChapters.length > 1 ? "s" : ""} à réviser`
              : "Tout est à jour — bravo !"}
          </p>
        </div>
        <Link href="/etude/dashboard">
          <Button variant="outline" size="sm" className="gap-2">
            <Star className="h-4 w-4" /> Gérer mes cours
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Flame className="h-5 w-5 text-warning" />}
          label="Chapitres"
          value={chapters.length}
          tone="default"
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5 text-success" />}
          label="Maîtrisés"
          value={chapters.filter(c => c.mastery_pct === 100).length}
          tone="success"
        />
        <StatCard
          icon={<Zap className="h-5 w-5 text-ring" />}
          label="Moy. maîtrise"
          value={`${totalMastery}%`}
          tone="ring"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-warning" />}
          label="À réviser"
          value={dueChapters.length}
          tone="warning"
        />
      </div>

      {/* Due cards — priority */}
      {dueChapters.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" /> À réviser
          </h2>
          <div className="space-y-2">
            {dueChapters.slice(0, 5).map(ch => (
              <ChapterCard key={ch.id} chapter={ch} showDue />
            ))}
          </div>
        </section>
      )}

      {/* In progress */}
      {inProgress.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Zap className="h-5 w-5 text-ring" /> En cours
          </h2>
          <div className="space-y-2">
            {inProgress.slice(0, 5).map(ch => (
              <ChapterCard key={ch.id} chapter={ch} />
            ))}
          </div>
        </section>
      )}

      {/* Never explored */}
      {neverExplored.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" /> Pas encore explorés
          </h2>
          <div className="space-y-2">
            {neverExplored.slice(0, 5).map(ch => (
              <ChapterCard key={ch.id} chapter={ch} showNew />
            ))}
          </div>
        </section>
      )}

      {/* Course summaries */}
      {courseSummaries.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Mes cours</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {courseSummaries.map(s => (
              <Link key={s.courseId} href={`/etude/${s.courseId}`}>
                <Card className="border border-border/70 bg-card shadow-none transition-colors hover:border-ring/40 cursor-pointer h-full">
                  <CardContent className="p-4">
                    <p className="font-semibold truncate">{s.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {s.doneCount}/{s.chapterCount} chapitres maîtrisés
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

/* ---------- helpers ---------- */

function StatCard({ icon, label, value, tone }: {
  icon: React.ReactNode
  label: string
  value: number | string
  tone: "default" | "success" | "ring" | "warning"
}) {
  const bg: Record<string, string> = {
    default: "bg-muted/40",
    success: "bg-success/10",
    ring: "bg-ring/10",
    warning: "bg-warning/10",
  }
  return (
    <Card className={cn("border border-border/50 shadow-none", bg[tone])}>
      <CardContent className="flex items-center gap-3 p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/80">
          {icon}
        </div>
        <div>
          <p className="text-xl font-bold leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ChapterCard({
  chapter,
  showDue,
  showNew,
}: {
  chapter: StudyChapterWithCourse
  showDue?: boolean
  showNew?: boolean
}) {
  return (
    <Link href={`/etude/${chapter.study_course_id}/kapitel/${chapter.id}`}>
      <Card className={cn(
        "border border-border/70 bg-card shadow-none transition-all hover:border-ring/40 cursor-pointer",
        showDue && "border-warning/30 bg-warning/5",
      )}>
        <CardContent className="flex items-center justify-between gap-3 p-3 sm:p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{chapter.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {chapter.course_title} · Maîtrise {chapter.mastery_pct}%
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {showDue && (
              <Badge variant="outline" className="text-xs border-warning/40 text-warning">
                À réviser
              </Badge>
            )}
            {showNew && (
              <Badge variant="outline" className="text-xs border-ring/40 text-ring">
                Nouveau
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}


