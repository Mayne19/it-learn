"use client"

import { useCallback, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { getCourse } from "@/lib/courses"
import { isKlausurRelevant } from "@/lib/chapters/types"
import { isSupabaseConfigured, getSupabaseClient, updateProgress } from "@/lib/supabase"
import { localUpdateProgress } from "@/lib/local-progress"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { ArrowLeft, FileText, RefreshCw, AlertCircle } from "lucide-react"
import { getApiErrorMessage } from "@/lib/api-errors"
import { KlausurView, type KlausurData } from "@/components/klausur-view"

const VARIANTS = [1, 2, 3]

const storageKey = (courseId: string, variant: number) => `klausur-${courseId}-${variant}`

export default function KlausurPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const course = getCourse(courseId)

  const [selectedVariant, setSelectedVariant] = useState<number | null>(null)
  const [klausur, setKlausur] = useState<KlausurData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const loadKlausur = useCallback(async (variant: number) => {
    setLoading(true)
    setError("")
    setKlausur(null)
    try {
      const cached = sessionStorage.getItem(storageKey(courseId, variant))
      if (cached) {
        setKlausur(JSON.parse(cached))
        setLoading(false)
        return
      }
      const res = await fetch('/api/klausur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, variantNumber: variant })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setKlausur(data)
      sessionStorage.setItem(storageKey(courseId, variant), JSON.stringify(data))
    } catch (e) {
      setError(getApiErrorMessage(e instanceof Error ? e.message : 'Erreur API'))
    } finally {
      setLoading(false)
    }
  }, [courseId])

  const handleSelectVariant = (variant: number) => {
    setSelectedVariant(variant)
    loadKlausur(variant)
  }

  const handleRegenerate = () => {
    if (selectedVariant === null) return
    sessionStorage.removeItem(storageKey(courseId, selectedVariant))
    loadKlausur(selectedVariant)
  }

  const handleFinish = async (score: number, total: number) => {
    if (selectedVariant === null) return
    const exerciseType = `klausur-${selectedVariant}`
    try {
      if (isSupabaseConfigured()) {
        const { data } = await getSupabaseClient().auth.getUser()
        if (data.user) {
          await updateProgress(data.user.id, courseId, 0, exerciseType, score >= Math.round(total * 45 / 90))
          return
        }
      }
      localUpdateProgress(courseId, 0, exerciseType, score >= Math.round(total * 45 / 90))
    } catch {
      // Score reste affiché à l'écran même si l'enregistrement échoue.
    }
  }

  if (!course) return <div className="text-center py-10">Cours non trouvé</div>

  const klausurChapters = course.chapters.filter(isKlausurRelevant)
  if (klausurChapters.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-10 text-center">
        <p className="text-lg font-medium">Le mode Klausur n&apos;est pas disponible pour ce cours</p>
        <Link href={`/cours/${courseId}`} className="inline-flex items-center gap-1.5 text-sm text-ring hover:underline">
          <ArrowLeft className="h-4 w-4" /> Retour au cours
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start gap-4">
        <Link href={`/cours/${courseId}`} className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <Badge variant="secondary" className="mb-2">Klausur blanche</Badge>
          <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            Musterklausur
          </h1>
          <p className="mt-1 text-lg text-muted-foreground sm:text-xl">
            90 Punkte · Bestehensgrenze 45 Punkte · fidèle au format réel de l&apos;examen
          </p>
        </div>
      </div>

      {selectedVariant === null && (
        <div className="grid gap-3 sm:grid-cols-3">
          {VARIANTS.map(variant => (
            <Card
              key={variant}
              className="cursor-pointer border border-border/80 bg-card shadow-none transition-colors hover:border-ring/40 hover:bg-muted/35"
              onClick={() => handleSelectVariant(variant)}
            >
              <CardContent className="flex flex-col items-center gap-2 p-5 text-center">
                <FileText className="h-6 w-6 text-ring" />
                <p className="font-semibold">Klausur {variant}</p>
                <p className="text-xs text-muted-foreground">90 Punkte · ~27 Aufgaben</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedVariant !== null && loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Spinner className="size-8 text-primary" />
          <p className="text-sm text-muted-foreground">Claude génère la Musterklausur {selectedVariant}…</p>
        </div>
      )}

      {selectedVariant !== null && error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                <AlertCircle className="h-4 w-4" />
              </span>
              <div className="space-y-1">
                <p className="font-semibold">Impossible de générer la Klausur</p>
                <p className="max-w-2xl text-sm leading-6 text-destructive/85">{error}</p>
              </div>
            </div>
            <Button onClick={() => loadKlausur(selectedVariant)} variant="outline" size="sm" className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 sm:w-auto">
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
          </div>
        </div>
      )}

      {selectedVariant !== null && !loading && !error && klausur && (
        <>
          <div className="flex flex-col gap-2 min-[420px]:flex-row">
            <Button variant="outline" onClick={() => setSelectedVariant(null)} className="flex-1">
              <ArrowLeft className="h-4 w-4" /> Autre variante
            </Button>
            <Button variant="outline" onClick={handleRegenerate} className="flex-1">
              <RefreshCw className="h-4 w-4" /> Regénérer cette variante
            </Button>
          </div>
          <KlausurView
            data={klausur}
            lang="python"
            onFinish={(score, total) => {
              handleFinish(score, total)
              router.push(`/cours/${courseId}`)
            }}
          />
        </>
      )}
    </div>
  )
}
