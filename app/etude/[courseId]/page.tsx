"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertAction } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { ArrowLeft, ArrowRight, FileText, Sparkles, AlertCircle, CheckCircle2, BookOpen } from "lucide-react"
import { getApiErrorMessage } from "@/lib/api-errors"
import { getStudyCourse, listFiles, updateStudyCourseFileStatus, saveIngestResult, countStudyChapters } from "@/lib/study/queries"
import { listStudyChapters } from "@/lib/study/lesson-queries"
import { downloadCourseFile, blobToBase64 } from "@/lib/study/storage"
import type { IngestResult } from "@/lib/study/ingest-prompt"
import type { StudyCourse, StudyCourseFile, StudyChapter } from "@/lib/study/types"

const PROFILE_ICON: Record<string, string> = {
  programming: "</>",
  theory: "📖",
  mixed: "⚡",
}

export default function EtudeCoursePage() {
  const params = useParams<{ courseId: string }>()
  const courseId = params.courseId

  const [course, setCourse] = useState<StudyCourse | null>(null)
  const [files, setFiles] = useState<StudyCourseFile[]>([])
  const [chapters, setChapters] = useState<StudyChapter[]>([])
  const [loading, setLoading] = useState(true)
  const [processingFileId, setProcessingFileId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    try {
      const [c, f, ch] = await Promise.all([
        getStudyCourse(courseId),
        listFiles(courseId),
        listStudyChapters(courseId),
      ])
      setCourse(c)
      setFiles(f)
      setChapters(ch)
    } catch (e) {
      setError(getApiErrorMessage(e instanceof Error ? e.message : String(e)))
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    Promise.resolve().then(() => load())
  }, [load])

  async function handleGenerate(file: StudyCourseFile) {
    setError("")
    setProcessingFileId(file.id)
    try {
      await updateStudyCourseFileStatus(file.id, "processing")

      const blob = await downloadCourseFile(file.storage_path)
      const pdfBase64 = await blobToBase64(blob)

      const res = await fetch("/api/study/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64, filename: file.file_name }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? "Erreur lors de la génération des chapitres")
      }

      const ingestResult = data as IngestResult
      const existingCount = await countStudyChapters(courseId)
      await saveIngestResult(courseId, file.id, ingestResult, existingCount)
      await updateStudyCourseFileStatus(file.id, "done")

      await load()
    } catch (e) {
      const message = getApiErrorMessage(e instanceof Error ? e.message : String(e))
      setError(message)
      await updateStudyCourseFileStatus(file.id, "error", message).catch(() => {})
      await load()
    } finally {
      setProcessingFileId(null)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-4">
          <div className="h-6 w-40 rounded bg-muted/60 animate-pulse" />
          <div className="h-24 rounded-lg bg-muted/40 animate-pulse" />
        </div>
      </main>
    )
  }

  if (!course) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">Cours introuvable.</p>
        <Link href="/etude/dashboard" className="mt-3 inline-flex items-center gap-1.5 text-sm text-ring hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour à mes cours
        </Link>
      </main>
    )
  }

  const pendingFiles = files.filter(f => f.status === "pending" || f.status === "error")

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <Link href="/etude/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Gérer mes cours
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-ring/10 text-lg">
          {PROFILE_ICON[course.profile] ?? "⚡"}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
          <p className="text-sm text-muted-foreground">
            {chapters.length} chapitre{chapters.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="items-center gap-3">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
          <AlertAction onClick={() => setError("")}>OK</AlertAction>
        </Alert>
      )}

      {/* Fichiers pas encore traités — déclenchement manuel de la génération */}
      {pendingFiles.length > 0 && (
        <section className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Fichiers à traiter
          </p>
          {pendingFiles.map(f => (
            <Card key={f.id} className="border border-border/70 bg-card shadow-none">
              <CardContent className="flex items-center gap-3 p-4">
                <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.file_name}</p>
                  {f.status === "error" && f.error_message && (
                    <p className="truncate text-xs text-destructive">{f.error_message}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  className="gap-2 flex-shrink-0"
                  disabled={processingFileId === f.id}
                  onClick={() => handleGenerate(f)}
                >
                  {processingFileId === f.id ? (
                    <>
                      <Spinner className="h-3.5 w-3.5" /> Génération...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" /> {f.status === "error" ? "Réessayer" : "Générer les chapitres"}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* Chapitres générés */}
      {chapters.length > 0 ? (
        <section className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Chapitres
          </p>
          <div className="space-y-2">
            {chapters
              .slice()
              .sort((a, b) => a.order - b.order)
              .map(ch => (
                <Link key={ch.id} href={`/etude/${courseId}/kapitel/${ch.id}`}>
                  <Card className="border border-border/70 bg-card shadow-none transition-colors hover:border-ring/40 cursor-pointer">
                    <CardContent className="flex items-center gap-3 p-4">
                      <Badge variant="secondary" className="flex-shrink-0 text-xs tabular-nums">
                        {ch.order}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{ch.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {ch.concepts.slice(0, 3).join(" · ")}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        </section>
      ) : pendingFiles.length === 0 ? (
        <Card className="border-dashed border-2 border-muted-foreground/20 bg-muted/10">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ring/10">
              <BookOpen className="h-5 w-5 text-ring" />
            </div>
            <p className="text-sm text-muted-foreground max-w-sm">
              Aucun fichier importé pour ce cours. Ajoute un PDF depuis la page{" "}
              <Link href="/etude/dashboard" className="text-ring hover:underline">
                Gérer mes cours
              </Link>{" "}
              pour générer les premiers chapitres.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {chapters.length > 0 && pendingFiles.length === 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Tous les fichiers de ce cours sont traités.
        </p>
      )}
    </main>
  )
}
