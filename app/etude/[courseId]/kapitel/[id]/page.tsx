"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Layers, Zap } from "lucide-react"
import { getStudyCourse } from "@/lib/study/queries"
import { getStudyChapter } from "@/lib/study/lesson-queries"
import { DetailedLessonView } from "@/components/study/detailed-lesson-view"
import { FlashcardReview } from "@/components/study/flashcard-review"
import { SpeedRound } from "@/components/study/exercises/speed-round"
import { getExerciseMix } from "@/lib/study/exercise-strategy"
import type { StudyCourse, StudyChapter } from "@/lib/study/types"
import type { Lang } from "@/lib/chapters/types"

export default function StudyChapterPage() {
  const params = useParams()
  const courseId = params.courseId as string
  const chapterId = params.id as string

  const [course, setCourse] = useState<StudyCourse | null>(null)
  const [chapter, setChapter] = useState<StudyChapter | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        const [c, ch] = await Promise.all([
          getStudyCourse(courseId),
          getStudyChapter(chapterId),
        ])
        setCourse(c)
        setChapter(ch)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue")
      }
      setLoading(false)
    })
  }, [courseId, chapterId])

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (error) {
    return <p className="py-10 text-center text-destructive">{error}</p>
  }

  if (!course || !chapter) {
    return <p className="py-10 text-center text-muted-foreground">Chapitre non trouvé</p>
  }

  const lang: Lang = course.detected_language ?? "none"
  const exerciseMix = getExerciseMix(course.profile, chapter)

  return (
    <div className="mx-auto max-w-4xl space-y-7 sm:space-y-8">
      <div className="flex items-start gap-3 sm:gap-4">
        <Link href="/etude/dashboard" className="mt-1 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{course.title} · Kapitel {chapter.order}</Badge>
          </div>
          <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            {chapter.title_de}
          </h1>
          <p className="mt-1 text-lg text-muted-foreground sm:text-xl">{chapter.title_fr}</p>
        </div>
      </div>

      <Card className="border border-border/80 bg-muted/25 shadow-none">
        <CardContent className="p-4 sm:p-5">
          <p className="leading-7 text-muted-foreground">{chapter.summary}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {chapter.concepts.map(c => (
              <Badge key={c} variant="outline" className="text-xs font-mono">{c}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <DetailedLessonView chapter={chapter} lang={lang} />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-ring" />
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Lernkartei</h2>
        </div>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {exerciseMix.map(m => (
            <Badge key={m.exerciseType} variant="outline" className="text-xs">
              {m.exerciseType} · poids {m.weight}
            </Badge>
          ))}
        </div>
        <FlashcardReview chapter={chapter} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-warning" />
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Speed Round</h2>
        </div>
        <SpeedRound chapter={chapter} profile={course.profile} lang={lang} />
      </section>
    </div>
  )
}
