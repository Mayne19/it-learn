"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { PenLine, RefreshCw, Trophy, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { getApiErrorMessage } from "@/lib/api-errors"
import { recordExerciseAttempt } from "@/lib/study/exercise-history-queries"
import type { StudyChapter } from "@/lib/study/types"
import type { FillBlankChallenge } from "@/lib/study/fill-blank-prompt"

interface Props {
  chapter: StudyChapter
}

type Segment = { type: "text"; value: string } | { type: "blank"; index: number }

// Découpe "Le [1] permet de [2]." en segments texte/trou — évite une
// saisie libre côté utilisateur (voir fill-blank-prompt.ts) : cliquer une
// étiquette puis un trou, comme ConceptMap clique deux nœuds.
function parseTemplate(template: string): Segment[] {
  const parts = template.split(/(\[\d+\])/g)
  return parts
    .filter(p => p.length > 0)
    .map(p => {
      const m = p.match(/^\[(\d+)\]$/)
      return m ? { type: "blank" as const, index: Number(m[1]) - 1 } : { type: "text" as const, value: p }
    })
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Texte à trous — étiquettes à placer dans les blancs d'une explication
 * courte, en cliquant une étiquette puis un trou. Sans chrono, comme
 * BugHunt/ConceptMap : le score se base sur le nombre d'essais.
 */
export function FillBlank({ chapter }: Props) {
  const [challenge, setChallenge] = useState<FillBlankChallenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [pool, setPool] = useState<string[]>([])
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [placed, setPlaced] = useState<Record<number, string>>({})
  const [wrongBlank, setWrongBlank] = useState<number | null>(null)
  const [attempts, setAttempts] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    setSelectedTag(null)
    setPlaced({})
    setWrongBlank(null)
    setAttempts(0)
    try {
      const res = await fetch("/api/study/fill-blank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId: chapter.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Erreur")
      const parsed = data as FillBlankChallenge
      setChallenge(parsed)
      setPool(shuffle([...parsed.blanks, ...parsed.distractors]))
    } catch (e) {
      setError(getApiErrorMessage(e instanceof Error ? e.message : "Erreur"))
    } finally {
      setLoading(false)
    }
  }, [chapter.id])

  useEffect(() => {
    Promise.resolve().then(() => load())
  }, [load])

  const segments = useMemo(() => (challenge ? parseTemplate(challenge.text_template) : []), [challenge])
  const totalBlanks = challenge?.blanks.length ?? 0
  const finished = totalBlanks > 0 && Object.keys(placed).length === totalBlanks

  useEffect(() => {
    if (finished) {
      recordExerciseAttempt(chapter.id, "fillBlank", attempts === totalBlanks)
    }
  }, [finished, attempts, totalBlanks, chapter.id])

  useEffect(() => {
    if (wrongBlank === null) return
    const timer = setTimeout(() => setWrongBlank(null), 500)
    return () => clearTimeout(timer)
  }, [wrongBlank])

  function handleTagClick(tag: string) {
    if (finished) return
    setSelectedTag(prev => (prev === tag ? null : tag))
  }

  function handleBlankClick(index: number) {
    if (!challenge || finished || placed[index] || !selectedTag) return

    setAttempts(a => a + 1)
    if (challenge.blanks[index] === selectedTag) {
      setPlaced(prev => ({ ...prev, [index]: selectedTag }))
      setPool(prev => prev.filter(t => t !== selectedTag))
    } else {
      setWrongBlank(index)
    }
    setSelectedTag(null)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center py-8 gap-3">
        <Spinner className="size-6 text-primary" />
        <p className="text-sm text-muted-foreground">Préparation du texte à trous…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={load}>
          Réessayer
        </Button>
      </div>
    )
  }

  if (!challenge || challenge.blanks.length === 0) {
    return (
      <div className="rounded-lg border border-border/70 bg-card p-8 text-center">
        <p className="text-muted-foreground">Aucun texte généré.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <PenLine className="h-3.5 w-3.5" /> {Object.keys(placed).length} / {totalBlanks} trous
        </span>
        {attempts > Object.keys(placed).length && (
          <Badge variant="outline" className="text-xs">{attempts} essais</Badge>
        )}
      </div>

      <Card className="border border-border/70 bg-card shadow-none">
        <CardContent className="p-4 sm:p-5">
          <p className="text-base leading-relaxed sm:text-lg">
            {segments.map((seg, i) => {
              if (seg.type === "text") return <span key={i}>{seg.value}</span>

              const filled = placed[seg.index]
              const isWrong = wrongBlank === seg.index
              return (
                <button
                  key={i}
                  onClick={() => handleBlankClick(seg.index)}
                  disabled={!!filled || finished}
                  className={cn(
                    "mx-1 inline-block min-w-[4.5rem] rounded-md border px-2 py-0.5 align-baseline text-sm font-medium transition-all",
                    filled && "border-success/40 bg-success/10 text-success",
                    !filled && isWrong && "border-destructive/50 bg-destructive/10 text-destructive",
                    !filled && !isWrong && selectedTag && "cursor-pointer border-ring/50 bg-ring/5 text-ring hover:bg-ring/10",
                    !filled && !isWrong && !selectedTag && "border-dashed border-border text-muted-foreground",
                  )}
                >
                  {filled ?? "……"}
                </button>
              )
            })}
          </p>
        </CardContent>
      </Card>

      {!finished && (
        <div className="flex flex-wrap gap-2">
          {pool.map(tag => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                selectedTag === tag
                  ? "scale-105 border-ring bg-ring/15 text-ring shadow-sm"
                  : "border-border bg-card hover:border-ring/40 hover:bg-muted/40",
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {finished && (
        <Card className="border border-success/30 bg-success/5 shadow-none">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
            <div className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full",
              attempts === totalBlanks ? "bg-success/10" : "bg-ring/10",
            )}>
              {attempts === totalBlanks ? (
                <Trophy className="h-7 w-7 text-success" />
              ) : (
                <CheckCircle2 className="h-7 w-7 text-ring" />
              )}
            </div>
            <div>
              <p className="text-lg font-semibold">
                {attempts === totalBlanks ? "Texte complété sans erreur !" : "Texte complété !"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {totalBlanks} mots placés en {attempts} essai{attempts > 1 ? "s" : ""}
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={load}>
              <RefreshCw className="h-4 w-4" /> Nouveau texte
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
