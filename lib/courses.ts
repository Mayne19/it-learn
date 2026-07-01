import { JAVA_CHAPTERS } from "./chapters/java"
import { DYNSPRACHEN_CHAPTERS } from "./chapters/dynsprachen"
import type { Chapter } from "./chapters/types"

export interface Course {
  id: string
  fr: string
  de: string
  description_fr: string
  chapters: Chapter[]
}

export const COURSES: Course[] = [
  {
    id: "java",
    fr: "Java",
    de: "Java",
    description_fr: "Programmation orientée objet, de la JVM aux streams et lambdas.",
    chapters: JAVA_CHAPTERS,
  },
  {
    id: "dynsprachen",
    fr: "Langages dynamiques",
    de: "Dynamische Sprachen",
    description_fr: "Python, Perl et JavaScript — typage dynamique, du script au web.",
    chapters: DYNSPRACHEN_CHAPTERS,
  },
]

export function getCourse(courseId: string): Course | undefined {
  return COURSES.find(c => c.id === courseId)
}

export function getChapter(courseId: string, chapterId: number): Chapter | undefined {
  return getCourse(courseId)?.chapters.find(c => c.id === chapterId)
}
