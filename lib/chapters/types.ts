export type Lang = "java" | "python" | "perl" | "javascript" | "none"

export interface Chapter {
  id: number
  fr: string
  de: string
  lang: Lang
  concepts: string[]
  summary: string
  /** False for chapters that precede any actual code (intro, install, ...). */
  hasCode: boolean
  /** True for chapters that do have code but only very basic syntax/CLI commands. */
  simpleCodeOnly?: boolean
  /** True when this chapter is part of the exam-focused topic set. */
  klausurRelevant?: boolean
}
