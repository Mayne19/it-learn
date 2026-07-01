import { redirect } from "next/navigation"

// Legacy route kept for old bookmarks/links: every chapter here was Java.
export default async function LegacyExerciseRedirect({ params }: { params: Promise<{ id: string; type: string }> }) {
  const { id, type } = await params
  redirect(`/cours/java/kapitel/${id}/${type}`)
}
