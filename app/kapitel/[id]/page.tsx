import { redirect } from "next/navigation"

// Legacy route kept for old bookmarks/links: every chapter here was Java.
export default async function LegacyChapterRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/cours/java/kapitel/${id}`)
}
