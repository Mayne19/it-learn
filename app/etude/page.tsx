"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarClock, Compass, Upload } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import { listAllStudyChaptersForUser, type StudyChapterWithCourse } from "@/lib/study/lesson-queries"

interface DueCount {
  studyChapterId: string
  due: number
}

async function countDueCards(userId: string, chapterIds: string[]): Promise<DueCount[]> {
  if (chapterIds.length === 0) return []
  const client = getSupabaseClient()

  const { data: cards } = await client
    .from("study_flashcards")
    .select("id, study_chapter_id")
    .in("study_chapter_id", chapterIds)

  const cardIds = (cards ?? []).map(c => c.id)
  if (cardIds.length === 0) return []

  const { data: progressRows } = await client
    .from("study_flashcards_progress")
    .select("flashcard_id, due_at")
    .eq("user_id", userId)
    .in("flashcard_id", cardIds)
    .lte("due_at", new Date().toISOString())

  const cardToChapter = new Map((cards ?? []).map(c => [c.id, c.study_chapter_id as string]))
  const counts = new Map<string, number>()
  for (const row of progressRows ?? []) {
    const chapterId = cardToChapter.get(row.flashcard_id)
    if (!chapterId) continue
    counts.set(chapterId, (counts.get(chapterId) ?? 0) + 1)
  }

  return Array.from(counts.entries()).map(([studyChapterId, due]) => ({ studyChapterId, due }))
}

async function chaptersWithCards(chapterIds: string[]): Promise<Set<string>> {
  if (chapterIds.length === 0) return new Set()
  const { data } = await getSupabaseClient()
    .from("study_flashcards")
    .select("study_chapter_id")
    .in("study_chapter_id", chapterIds)

  return new Set((data ?? []).map(r => r.study_chapter_id as string))
}

export default function StudyTodayPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [chapters, setChapters] = useState<StudyChapterWithCourse[]>([])
  const [dueByChapter, setDueByChapter] = useState<Map<string, number>>(new Map())
  const [exploredChapterIds, setExploredChapterIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    Promise.resolve().then(async () => {
      const { data } = await getSupabaseClient().auth.getUser()
      if (!data.user) {
        setLoading(false)
        return
      }
      setUserId(data.user.id)
      try {
        const allChapters = await listAllStudyChaptersForUser(data.user.id)
        setChapters(allChapters)

        const chapterIds = allChapters.map(c => c.id)
        const [dueCounts, explored] = await Promise.all([
          countDueCards(data.user.id, chapterIds),
          chaptersWithCards(chapterIds),
        ])
        setDueByChapter(new Map(dueCounts.map(d => [d.studyChapterId, d.due])))
        setExploredChapterIds(explored)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue")
      }
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-10 text-center">
        <p className="text-lg font-medium">Connecte-toi pour voir ton programme du jour</p>
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-ring hover:underline">
          Se connecter
        </Link>
      </div>
    )
  }

  // Priorisation purement algorithmique (aucun appel IA) : cartes dues
  // d'abord, triées par nombre de cartes en retard décroissant ; puis les
  // chapitres jamais explorés. Cohérent avec lib/study/next-up.ts.
  const dueChapters = chapters
    .filter(c => (dueByChapter.get(c.id) ?? 0) > 0)
    .sort((a, b) => (dueByChapter.get(b.id) ?? 0) - (dueByChapter.get(a.id) ?? 0))

  const neverExploredChapters = chapters.filter(c => !exploredChapterIds.has(c.id))

  return (
    <div className="mx-auto max-w-3xl space-y-7 sm:space-y-8">
      <div>
        <Badge variant="secondary" className="mb-2">Étude</Badge>
        <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
          Aujourd&apos;hui
        </h1>
        <p className="mt-1 text-lg text-muted-foreground sm:text-xl">
          Ce qu&apos;il y a à réviser maintenant.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {chapters.length === 0 && (
        <Card className="border border-border/70 bg-muted/25 shadow-none">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <p className="text-muted-foreground">Aucun cours importé pour l&apos;instant.</p>
            <Link href="/etude/dashboard" className="text-sm text-ring hover:underline">
              Uploader un premier cours
            </Link>
          </CardContent>
        </Card>
      )}

      {dueChapters.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-warning" />
            <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Cartes dues</h2>
          </div>
          <div className="grid gap-2">
            {dueChapters.map(chapter => (
              <Link key={chapter.id} href={`/etude/${chapter.study_course_id}/kapitel/${chapter.id}`}>
                <Card className="cursor-pointer border border-border/70 bg-card shadow-none transition-colors hover:border-ring/40 hover:bg-muted/40">
                  <CardContent className="flex items-center justify-between gap-3 p-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{chapter.title_de}</p>
                      <p className="truncate text-xs text-muted-foreground">{chapter.course_title}</p>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0 border-warning/30 text-warning">
                      {dueByChapter.get(chapter.id)} due{(dueByChapter.get(chapter.id) ?? 0) > 1 ? "s" : ""}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {neverExploredChapters.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-ring" />
            <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">Jamais explorés</h2>
          </div>
          <div className="grid gap-2">
            {neverExploredChapters.map(chapter => (
              <Link key={chapter.id} href={`/etude/${chapter.study_course_id}/kapitel/${chapter.id}`}>
                <Card className="cursor-pointer border border-border/70 bg-card shadow-none transition-colors hover:border-ring/40 hover:bg-muted/40">
                  <CardContent className="flex items-center justify-between gap-3 p-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{chapter.title_de}</p>
                      <p className="truncate text-xs text-muted-foreground">{chapter.course_title}</p>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0 text-xs">Kapitel {chapter.order}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
