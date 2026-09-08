"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import type { DetailedLesson } from "@/lib/study/lesson-prompt"

/**
 * Page de test A/B temporaire, non liée dans la navigation — sert
 * uniquement à comparer manuellement Sonnet 5 vs Haiku 4.5 sur le cours
 * détaillé avant de trancher s'il faut basculer app/api/study/lesson.
 * Appelle app/api/study/lesson/compare (jamais utilisée par l'UI normale).
 * À supprimer une fois la décision prise.
 */

interface ModelResult {
  model: string
  ok: boolean
  lesson?: DetailedLesson
  error?: string
  ms: number
}

export default function LessonComparePage() {
  const [chapterId, setChapterId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [chapterTitle, setChapterTitle] = useState("")
  const [sonnet, setSonnet] = useState<ModelResult | null>(null)
  const [haiku, setHaiku] = useState<ModelResult | null>(null)

  const run = async () => {
    if (!chapterId.trim()) return
    setLoading(true)
    setError("")
    setSonnet(null)
    setHaiku(null)
    try {
      const res = await fetch("/api/study/lesson/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId: chapterId.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erreur")
      setChapterTitle(data.chapterTitle)
      setSonnet(data.sonnet)
      setHaiku(data.haiku)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Comparaison Sonnet 5 vs Haiku 4.5</h1>
        <p className="text-sm text-muted-foreground">
          Génère le même cours détaillé avec les deux modèles pour comparer la qualité avant de basculer.
        </p>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="chapterId">ID du chapitre (study_chapter_id)</Label>
          <Input
            id="chapterId"
            value={chapterId}
            onChange={e => setChapterId(e.target.value)}
            placeholder="uuid du chapitre à tester"
          />
        </div>
        <Button onClick={run} disabled={loading || !chapterId.trim()}>
          {loading ? <Spinner className="size-4" /> : "Comparer"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {chapterTitle && <p className="text-sm text-muted-foreground">Chapitre : {chapterTitle}</p>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ResultCard label="Sonnet 5 (actuel)" result={sonnet} />
        <ResultCard label="Haiku 4.5 (candidat)" result={haiku} />
      </div>
    </div>
  )
}

function ResultCard({ label, result }: { label: string; result: ModelResult | null }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{label}</CardTitle>
        {result && (
          <Badge variant={result.ok ? "secondary" : "destructive"}>
            {result.ok ? `${result.ms}ms` : "erreur"}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!result && <p className="text-muted-foreground">En attente…</p>}
        {result && !result.ok && <p className="text-destructive">{result.error}</p>}
        {result?.ok && result.lesson && (
          <>
            <div>
              <p className="font-semibold">{result.lesson.title_de}</p>
              <p className="text-muted-foreground italic">{result.lesson.intro_fr}</p>
            </div>
            <div className="space-y-3">
              {result.lesson.sections.map((s, i) => (
                <div key={i} className="rounded-md border p-3">
                  <p className="font-medium">{s.concept} — {s.heading_de}</p>
                  <p className="mt-1 text-muted-foreground">{s.explanation_de}</p>
                  <p className="mt-1 text-muted-foreground">{s.explanation_fr}</p>
                  {s.example && <p className="mt-1 rounded bg-muted p-2 font-mono text-xs">{s.example}</p>}
                  <p className="mt-1 text-xs italic text-muted-foreground">💡 {s.memory_tip_fr}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="font-medium">Points clés :</p>
              <ul className="list-inside list-disc text-muted-foreground">
                {result.lesson.key_points_de.map((k, i) => <li key={i}>{k}</li>)}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
