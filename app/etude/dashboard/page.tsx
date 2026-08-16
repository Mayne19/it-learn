"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getSupabaseClient } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusDot } from "@/components/status-dot"
import type { DotState } from "@/components/status-dot"
import { ArrowLeft, Upload, Plus } from "lucide-react"
import {
  createStudyCourse,
  listStudyCourses,
  createStudyCourseFile,
  updateStudyCourseFileStatus,
  listStudyCourseFiles,
  countStudyChapters,
  saveIngestResult,
} from "@/lib/study/queries"
import { uploadCourseFile, downloadCourseFile, blobToBase64 } from "@/lib/study/storage"
import type { StudyCourse, StudyCourseFile } from "@/lib/study/types"
import type { ChapterValidationIssue } from "@/lib/study/validate-chapters"

const FILE_STATUS_DOT: Record<StudyCourseFile["status"], DotState> = {
  pending: "QUEUED",
  processing: "BUILDING",
  done: "READY",
  error: "ERROR",
}

export default function StudyDashboardPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [courses, setCourses] = useState<StudyCourse[]>([])
  const [filesByCourse, setFilesByCourse] = useState<Record<string, StudyCourseFile[]>>({})
  const [newCourseTitle, setNewCourseTitle] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastIssues, setLastIssues] = useState<ChapterValidationIssue[] | null>(null)

  useEffect(() => {
    getSupabaseClient().auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setLoading(false)
        return
      }
      setUserId(data.user.id)
      try {
        const list = await listStudyCourses(data.user.id)
        setCourses(list)
        const filesEntries = await Promise.all(
          list.map(async c => [c.id, await listStudyCourseFiles(c.id)] as const)
        )
        setFilesByCourse(Object.fromEntries(filesEntries))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue")
      }
      setLoading(false)
    })
  }, [])

  async function handleCreateCourse() {
    if (!userId || !newCourseTitle.trim()) return
    try {
      const course = await createStudyCourse(userId, newCourseTitle.trim())
      setCourses(prev => [course, ...prev])
      setFilesByCourse(prev => ({ ...prev, [course.id]: [] }))
      setNewCourseTitle("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue")
    }
  }

  async function handleUpload(course: StudyCourse, fileList: FileList | null) {
    if (!userId || !fileList || fileList.length === 0) return
    setLastIssues(null)

    for (const file of Array.from(fileList)) {
      let fileRecord: StudyCourseFile | null = null
      try {
        const storagePath = await uploadCourseFile(userId, course.id, file)
        fileRecord = await createStudyCourseFile(course.id, file.name, storagePath)
        setFilesByCourse(prev => ({
          ...prev,
          [course.id]: [...(prev[course.id] ?? []), fileRecord!],
        }))

        await updateStudyCourseFileStatus(fileRecord.id, "processing")
        setFilesByCourse(prev => ({
          ...prev,
          [course.id]: (prev[course.id] ?? []).map(f =>
            f.id === fileRecord!.id ? { ...f, status: "processing" } : f
          ),
        }))

        const blob = await downloadCourseFile(storagePath)
        const pdfBase64 = await blobToBase64(blob)

        const res = await fetch("/api/study/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfBase64, filename: file.name }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error ?? "Erreur d'ingestion")

        const existingChapterCount = await countStudyChapters(course.id)
        await saveIngestResult(course.id, fileRecord.id, result, existingChapterCount)

        setLastIssues(result.validationIssues ?? [])
        await updateStudyCourseFileStatus(fileRecord.id, "done")
        setFilesByCourse(prev => ({
          ...prev,
          [course.id]: (prev[course.id] ?? []).map(f =>
            f.id === fileRecord!.id ? { ...f, status: "done" } : f
          ),
        }))
      } catch (e) {
        const message = e instanceof Error ? e.message : "Erreur inconnue"
        if (fileRecord) {
          await updateStudyCourseFileStatus(fileRecord.id, "error", message).catch(() => {})
          setFilesByCourse(prev => ({
            ...prev,
            [course.id]: (prev[course.id] ?? []).map(f =>
              f.id === fileRecord!.id ? { ...f, status: "error", error_message: message } : f
            ),
          }))
        } else {
          setError(message)
        }
      }
    }
  }

  if (loading) {
    return <p className="py-10 text-center text-muted-foreground">Chargement…</p>
  }

  if (!userId) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-10 text-center">
        <p className="text-lg font-medium">Connecte-toi pour gérer tes cours</p>
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-ring hover:underline">
          Se connecter
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-7 sm:space-y-8">
      <div className="flex items-start gap-3 sm:gap-4">
        <Link href="/" className="mt-1 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <Badge variant="secondary" className="mb-2">Étude</Badge>
          <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            Mes cours
          </h1>
          <p className="mt-1 text-lg text-muted-foreground sm:text-xl">
            Upload tes supports de cours, chapitre par chapitre ou d&apos;un coup.
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {lastIssues && lastIssues.length > 0 && (
        <Card className="border border-warning/30 bg-warning/5 shadow-none">
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-semibold text-warning">
              À vérifier dans le dernier découpage ({lastIssues.length})
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {lastIssues.map((issue, i) => (
                <li key={i}>{issue.message}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="border border-border/80 bg-muted/25 shadow-none">
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
          <Input
            placeholder="Nom du nouveau cours (ex. Algorithmen und Datenstrukturen)"
            value={newCourseTitle}
            onChange={e => setNewCourseTitle(e.target.value)}
          />
          <Button onClick={handleCreateCourse} disabled={!newCourseTitle.trim()}>
            <Plus className="h-4 w-4" /> Créer
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {courses.map(course => (
          <Card key={course.id} className="border border-border/70 bg-card shadow-none">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{course.title}</p>
                  <Badge variant="outline" className="mt-1 text-xs">{course.profile}</Badge>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm font-medium hover:bg-muted">
                  <Upload className="h-4 w-4" />
                  Uploader un fichier
                  <input
                    type="file"
                    accept="application/pdf"
                    multiple
                    className="hidden"
                    onChange={e => handleUpload(course, e.target.files)}
                  />
                </label>
              </div>

              {(filesByCourse[course.id] ?? []).length > 0 && (
                <ul className="space-y-1.5">
                  {(filesByCourse[course.id] ?? []).map(file => (
                    <li key={file.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-muted-foreground">{file.filename}</span>
                      <StatusDot state={FILE_STATUS_DOT[file.status]} label />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
