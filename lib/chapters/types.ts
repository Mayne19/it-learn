export type Lang = "java" | "python" | "perl" | "javascript"

export interface Chapter {
  id: number
  fr: string
  de: string
  lang: Lang
  concepts: string[]
  summary: string
}
