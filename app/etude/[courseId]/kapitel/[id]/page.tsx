"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Zap,
  Lightbulb,
  Code2,
  Bug,
  PenLine,
  ListChecks,
  Search,
  Link2,
  CheckCircle2,
  Network,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getApiErrorMessage } from "@/lib/api-errors"
import { listStudyChapters, getStudyChapter, type StudyChapterWithCourseTitle } from "@/lib/study/lesson-queries"
import { DetailedLessonView } from "@/components/study/detailed-lesson-view"
import { FlashcardReview } from "@/components/study/flashcard-review"
import { SpeedRound } from "@/components/study/exercises/speed-round"
import { getExerciseSlots } from "@/lib/study/exercise-strategy"
import type { StudyChapter } from "@/lib/study/types"
import type { Lang } from "@/lib/chapters/types"

export default function StudyChapterPage({
  params,
}: {
  params: Promise<{ courseId: string; id: string }>
}) {
  const [chapter, setChapter] = useState<StudyChapterWithCourseTitle | null>(null)
  const [allChapters, setAllChapters] = useState<StudyChapter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    params.then(({ courseId, id }) => {
      Promise.all([
        getStudyChapter(id),
        listStudyChapters(courseId),
      ]).then(([ch, all]) => {
        if (cancelled) return
        setChapter(ch)
        setAllChapters(all)
      }).catch(e => {
        if (!cancelled) setError(getApiErrorMessage(e instanceof Error ? e.message : String(e)))
      }).finally(() => {
        if (!cancelled) setLoading(false)
      })
    })
    return () => { cancelled = true }
  }, [params])

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <div className="h-6 w-32 rounded bg-muted/60 animate-pulse" />
          <div className="h-10 w-64 rounded bg-muted/40 animate-pulse" />
          <div className="h-6 w-48 rounded bg-muted/40 animate-pulse" />
        </div>
      </main>
    )
  }

  if (error || !chapter) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error || "Chapitre introuvable."}
        </p>
        <Link href="/etude" className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground">
          ← Retour
        </Link>
      </main>
    )
  }

  const exerciseSlots = getExerciseSlots(chapter.profile, chapter.has_code)
  const profileLabel = chapter.profile === "programming" ? "Programmation" : chapter.profile === "theory" ? "Théorie" : "Mixte"
  const lang: Lang = chapter.code_lang || "none"
  const positionInCourse = allChapters.findIndex(c => c.id === chapter.id) + 1
  const totalChapters = allChapters.length
  const courseTitle = chapter.course_title

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/etude" className="hover:text-foreground transition-colors">Étude</Link>
        <span>/</span>
        <Link href={`/etude/${chapter.study_course_id}`} className="hover:text-foreground transition-colors">
          {courseTitle}
        </Link>
        <span>/</span>
        <span className="text-foreground">Chapitre {positionInCourse}</span>
      </nav>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs">{profileLabel}</Badge>
          <Badge variant="outline" className="text-xs">Chapitre {positionInCourse}/{totalChapters}</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{chapter.title}</h1>
      </div>

      {/* Concepts */}
      {chapter.concepts.length > 0 && (
        <div className="rounded-lg border border-border/70 bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" /> Concepts
          </h2>
          <div className="flex flex-wrap gap-2">
            {chapter.concepts.map(c => (
              <Badge key={c} variant="outline" className="text-xs border-ring/30 text-ring">
                {c}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Exercise mix overview */}
      <div className="rounded-lg border border-border/50 bg-muted/25 p-4">
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">Exercices disponibles</h2>
        <div className="flex flex-wrap gap-2">
          {exerciseSlots.map(slot => (
            <Badge key={slot.type} variant="secondary" className="text-xs">
              {slot.type === "speedRound" && <Zap className="mr-1 h-3 w-3" />}
              {slot.type === "code" && <Code2 className="mr-1 h-3 w-3" />}
              {slot.type === "bugHunt" && <Bug className="mr-1 h-3 w-3" />}
              {slot.type === "fillBlank" && <PenLine className="mr-1 h-3 w-3" />}
              {slot.type === "mcq" && <ListChecks className="mr-1 h-3 w-3" />}
              {slot.type === "codeAnalysis" && <Search className="mr-1 h-3 w-3" />}
              {slot.type === "matching" && <Link2 className="mr-1 h-3 w-3" />}
              {slot.type === "trueFalse" && <CheckCircle2 className="mr-1 h-3 w-3" />}
              {slot.type === "conceptMap" && <Network className="mr-1 h-3 w-3" />}
              {slot.type === "speedRound" ? "Speed Round" : slot.type}
            </Badge>
          ))}
        </div>
      </div>

      {/* Main sections */}
      <div className="space-y-4">
        <DetailedLessonView chapter={chapter} lang={lang} />
        <FlashcardReview chapter={chapter} />
        <SpeedRound chapter={chapter} lang={lang} />
      </div>

      {/* Navigation between chapters */}
      {totalChapters > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          {positionInCourse > 1 ? (
            <Link
              href={`/etude/${chapter.study_course_id}/kapitel/${allChapters[positionInCourse - 2].id}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Chapitre précédent
            </Link>
          ) : <div />}
          {positionInCourse < totalChapters ? (
            <Link
              href={`/etude/${chapter.study_course_id}/kapitel/${allChapters[positionInCourse].id}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              Chapitre suivant <span className="text-xs">→</span>
            </Link>
          ) : <div />}
        </div>
      )}
    </main>
  )
}
