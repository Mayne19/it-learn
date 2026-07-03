import type { Lang } from "./chapters/types"

export const LANG_LABELS: Record<Lang, string> = {
  java: "Java",
  python: "Python",
  perl: "Perl",
  javascript: "JavaScript",
  none: "Keine Programmiersprache",
}

export function getLangLabel(lang: Lang): string {
  return LANG_LABELS[lang] ?? lang
}
