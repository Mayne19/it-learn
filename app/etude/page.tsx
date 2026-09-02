"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Flame, ArrowRight, Zap, Star, CheckCircle, Clock, AlertCircle, BookOpen, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { getSupabaseClient } from "@/lib/supabase"
import {
  listAllStudyChaptersForUser,
  type StudyChapterWithCourse,
} from "@/lib/study/lesson-queries"
import { listStudyCourses } from "@/lib/study/queries"
import { getExerciseSlots } from "@/lib/study/exercise-strategy"
import { getExerciseHistory } from "@/lib/study/exercise-history-queries"
import { pickNextExercise } from "@/lib/study/next-up"
import { getStudyStreak, type StudyStreak } from "@/lib/study/streak"
import { StreakBadge } from "@/components/study/streak-badge"
import type { StudyExerciseType } from "@/lib/study/types"

const EXERCISE_LABELS: Record<StudyExerciseType, string> = {
  mcq: "un QCM",
  matching: "un appariement",
  trueFalse: "un vrai/faux",
  fillBlank: "un texte à trous",
  codeAnalysis: "une analyse de code",
  code: "un exercice de code",
  speedRound: "un Speed Round",
  bugHunt: "un Bug Hunt",
  conceptMap: "une carte de concepts",
}

interface CourseSummary {
  courseId: string
  title: string
  chapterCount: number
  doneCount: number
}

export default function EtudeDashboardPage() {
  const [chapters, setChapters] = useState<StudyChapterWithCourse[]>([])
  const [hasCourses, setHasCourses] = useState(false)
  const [streak, setStreak] = useState<StudyStreak | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    async function run() {
      const { data: { user } } = await getSupabaseClient().auth.getUser()
      if (cancelled || !user) return
      try {
        // Distinguer "aucun cours créé" de "cours créé, chapitres pas encore
        // générés" — sans ça, les deux affichaient le même écran vide
        // trompeur ("Crée ton premier cours") alors que dans le second cas
        // le cours existe déjà, il manque juste l'étape de génération.
        const [all, courses, streakResult] = await Promise.all([
          listAllStudyChaptersForUser(user.id),
          listStudyCourses(user.id),
          getStudyStreak(user.id),
        ])
        if (cancelled) return
        setChapters(all)
        setHasCourses(courses.length > 0)
        setStreak(streakResult)
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

  // Chapitre le plus prioritaire (même ordre que les sections ci-dessous :
  // à réviser d'abord, sinon en cours, sinon jamais exploré) — un seul
  // chapitre plutôt que d'interroger l'historique de tous, pour rester
  // léger sur cette page qui se recharge à chaque visite.
  const priorityChapter = dueChapters[0] ?? inProgress[0] ?? neverExplored[0] ?? null

  // chapterId associé au résultat, pour ignorer une recommandation
  // devenue obsolète si priorityChapter change avant la fin du fetch.
  const [nextExercise, setNextExercise] = useState<{ chapterId: string; type: StudyExerciseType } | null>(null)

  useEffect(() => {
    if (!priorityChapter) return
    let cancelled = false
    getExerciseHistory(priorityChapter.id)
      .then(history => {
        if (cancelled) return
        const slots = getExerciseSlots(priorityChapter.profile, priorityChapter.has_code)
        const candidates = slots.map(s => ({ studyChapterId: priorityChapter.id, exerciseType: s.type }))
        const mix = slots.map(s => ({ exerciseType: s.type, weight: s.weight }))
        const pick = pickNextExercise(candidates, mix, history)
        if (pick) setNextExercise({ chapterId: priorityChapter.id, type: pick.exerciseType as StudyExerciseType })
      })
      .catch(() => {
        // Recommandation best-effort — la page reste utilisable sans elle,
        // les sections À réviser/En cours/Pas exploré ci-dessous suffisent.
      })
    return () => { cancelled = true }
  }, [priorityChapter])

  const nextExerciseType =
    priorityChapter && nextExercise?.chapterId === priorityChapter.id ? nextExercise.type : null

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
            {hasCourses ? (
              <div className="space-y-1">
                <p className="text-lg font-semibold">Aucun chapitre généré pour l&apos;instant</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Ton cours existe déjà — il manque juste l&apos;étape de génération. Ouvre-le pour lancer la génération des chapitres à partir du PDF importé.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-lg font-semibold">Aucun cours encore</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Crée ton premier cours dans le tableau de bord pour commencer à réviser.
                </p>
              </div>
            )}
            <Link href="/etude/dashboard">
              <Button>
                {hasCourses ? "Voir mes cours" : "Créer un cours"} <ArrowRight className="ml-2 h-4 w-4" />
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
        <div className="flex items-center gap-3">
          {streak && <StreakBadge streak={streak} />}
          <Link href="/etude/dashboard">
            <Button variant="outline" size="sm" className="gap-2">
              <Star className="h-4 w-4" /> Gérer mes cours
            </Button>
          </Link>
        </div>
      </div>

      {/* Prochain exercice recommandé — pondéré par pickNextExercise selon
          le dosage du profil et le taux de réussite réel déjà observé sur
          ce chapitre (lib/study/next-up.ts). Pointe vers le chapitre plutôt
          qu'un type d'exercice précis : seul le Speed Round a une UI
          dédiée aujourd'hui, les autres types n'ont qu'un badge sur la
          page chapitre. */}
      {priorityChapter && nextExerciseType && (
        <Link href={`/etude/${priorityChapter.study_course_id}/kapitel/${priorityChapter.id}`}>
          <Card className="border border-ring/25 bg-ring/5 shadow-none transition-colors hover:border-ring/45 hover:bg-ring/10 cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-ring/15 text-ring">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  Recommandé : {EXERCISE_LABELS[nextExerciseType]} sur <span className="truncate">{priorityChapter.title}</span>
                </p>
                <p className="text-xs text-muted-foreground truncate">{priorityChapter.course_title}</p>
              </div>
              <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      )}

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


