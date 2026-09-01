"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertAction } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import {
  ArrowLeft, Plus, FileText, Trash2, AlertCircle,
  CheckCircle2, BookOpen, FileUp, ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getSupabaseClient } from "@/lib/supabase"
import { getApiErrorMessage } from "@/lib/api-errors"
import { listCourses, createCourse, deleteCourse, listFiles, uploadFile, deleteFile } from "@/lib/study/queries"
import { PROFILE_UI } from "@/lib/study/profile-ui"
import type { CourseProfile, StudyCourse, StudyCourseFile } from "@/lib/study/types"

export default function EtudeDashboardManager() {
  const [userId, setUserId] = useState<string | null>(null)
  const [courses, setCourses] = useState<StudyCourse[]>([])
  const [selectedCourse, setSelectedCourse] = useState<StudyCourse | null>(null)
  const [files, setFiles] = useState<StudyCourseFile[]>([])

  const [newTitle, setNewTitle] = useState("")
  const [newProfile, setNewProfile] = useState<CourseProfile>("mixed")
  const [creating, setCreating] = useState(false)

  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    getSupabaseClient().auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  const loadCourses = useCallback(async () => {
    if (!userId) return
    try {
      setCourses(await listCourses(userId))
    } catch (e) {
      setError(getApiErrorMessage(e instanceof Error ? e.message : String(e)))
    }
  }, [userId])

  useEffect(() => {
    Promise.resolve().then(() => loadCourses())
  }, [loadCourses])

  const loadFiles = useCallback(async (course: StudyCourse) => {
    try {
      setFiles(await listFiles(course.id))
    } catch (e) {
      setError(getApiErrorMessage(e instanceof Error ? e.message : String(e)))
    }
  }, [])

  useEffect(() => {
    if (!selectedCourse) return
    Promise.resolve().then(() => loadFiles(selectedCourse))
  }, [selectedCourse, loadFiles])

  function clearMessages() { setError(""); setSuccess("") }

  async function handleCreate() {
    if (!userId || !newTitle.trim()) return
    clearMessages()
    setCreating(true)
    try {
      const course = await createCourse(userId, newTitle.trim(), newProfile)
      setCourses(prev => [...prev, course])
      setNewTitle("")
      setSelectedCourse(course)
      setSuccess("Cours créé — tu peux y ajouter des fichiers PDF maintenant.")
    } catch (e) {
      setError(getApiErrorMessage(e instanceof Error ? e.message : String(e)))
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(courseId: string) {
    if (!confirm("Supprimer ce cours et tous ses fichiers ?")) return
    clearMessages()
    try {
      await deleteCourse(courseId)
      setCourses(prev => prev.filter(c => c.id !== courseId))
      if (selectedCourse?.id === courseId) setSelectedCourse(null)
    } catch (e) {
      setError(getApiErrorMessage(e instanceof Error ? e.message : String(e)))
    }
  }

  async function handleDeleteFile(fileId: string) {
    if (!selectedCourse) return
    if (!confirm("Supprimer ce fichier ?")) return
    clearMessages()
    try {
      await deleteFile(selectedCourse.id, fileId)
      setFiles(prev => prev.filter(f => f.id !== fileId))
    } catch (e) {
      setError(getApiErrorMessage(e instanceof Error ? e.message : String(e)))
    }
  }

  async function handleUpload(fileList: FileList | null) {
    if (!selectedCourse || !fileList?.length) return
    clearMessages()
    setUploading(true)
    try {
      for (const file of Array.from(fileList)) {
        await uploadFile(selectedCourse.id, file)
      }
      setSuccess(`${fileList.length} fichier${fileList.length > 1 ? "s" : ""} importé${fileList.length > 1 ? "s" : ""}.`)
      await loadFiles(selectedCourse)
    } catch (e) {
      setError(getApiErrorMessage(e instanceof Error ? e.message : String(e)))
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleUpload(e.dataTransfer.files)
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <Link href="/etude" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Retour à Étude
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gérer mes cours</h1>
        <p className="text-muted-foreground mt-1">Crée, importe et organise tes contenus d&apos;étude.</p>
      </div>

      {error && (
        <Alert variant="destructive" className="items-center gap-3">
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
          <AlertAction onClick={clearMessages}>OK</AlertAction>
        </Alert>
      )}

      {success && (
        <Alert className="items-center gap-3 border-success/30 bg-success/5">
          <CheckCircle2 className="text-success" />
          <AlertDescription className="text-success">{success}</AlertDescription>
          <AlertAction onClick={clearMessages}>OK</AlertAction>
        </Alert>
      )}

      {/* Create form */}
      <Card className="border border-border/70 bg-card shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nouveau cours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="course-title">Titre du cours</Label>
            <Input
              id="course-title"
              placeholder="Ex. Droit pénal général"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreate() }}
            />
          </div>

          <div className="space-y-2">
            <Label>Profil</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(PROFILE_UI) as [CourseProfile, typeof PROFILE_UI[CourseProfile]][]).map(([key, { label, description, icon: Icon }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setNewProfile(key)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-all",
                    newProfile === key
                      ? "border-ring bg-ring/10"
                      : "border-border/70 hover:border-ring/40 hover:bg-muted/40",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <p className="text-sm font-medium mt-1">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleCreate} disabled={!newTitle.trim() || creating} className="w-full sm:w-auto">
            {creating ? <Spinner className="mr-2 size-4" /> : <Plus className="mr-2 h-4 w-4" />}
            Créer le cours
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Existing courses */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <BookOpen className="h-5 w-5" /> Mes cours ({courses.length})
        </h2>

        {courses.length === 0 && (
          <Card className="border-dashed border-2 border-muted-foreground/20 bg-muted/10">
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Aucun cours pour l&apos;instant.</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {courses.map(course => {
            const isSelected = selectedCourse?.id === course.id
            const profileInfo = PROFILE_UI[course.profile]
            return (
              <div key={course.id}>
                <Card
                  className={cn(
                    "border bg-card shadow-none transition-all cursor-pointer",
                    isSelected ? "border-ring" : "border-border/70 hover:border-ring/40",
                  )}
                  onClick={() => setSelectedCourse(isSelected ? null : course)}
                >
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{course.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <profileInfo.icon className="h-3 w-3" /> {profileInfo.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(course.id) }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Expanded file section */}
                {isSelected && (
                  <div className="ml-4 mt-2 space-y-3 border-l-2 border-ring/30 pl-4">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Fichiers ({files.length})
                    </h3>

                    {/* Drop zone */}
                    <div
                      onDragOver={e => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={handleDrop}
                      className={cn(
                        "relative flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                        dragging
                          ? "border-ring bg-ring/10"
                          : "border-border/50 hover:border-ring/40 hover:bg-muted/20",
                      )}
                    >
                      <FileUp className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        {uploading ? (
                          <span className="flex items-center gap-2"><Spinner className="size-4" /> Importation…</span>
                        ) : (
                          "Glisse un PDF ici ou "
                        )}
                      </p>
                      {!uploading && (
                        <label className="cursor-pointer text-sm font-medium text-ring hover:underline">
                          parcouner
                          <input
                            type="file"
                            multiple
                            accept=".pdf"
                            className="sr-only"
                            onChange={e => handleUpload(e.target.files)}
                          />
                        </label>
                      )}
                    </div>

                    {/* File list */}
                    {files.length > 0 && (
                      <div className="space-y-1">
                        {files.map(f => (
                          <div key={f.id} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/40 transition-colors">
                            <span className="text-sm truncate">{f.file_name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                              onClick={(e) => { e.stopPropagation(); handleDeleteFile(f.id) }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {files.length > 0 && (
                      <Link href={`/etude/${course.id}`}>
                        <Button variant="outline" size="sm" className="w-full gap-2">
                          Voir les chapitres <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
