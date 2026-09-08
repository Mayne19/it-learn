import type { ScheduledDay } from "./exam-schedule"

// Échappe les caractères spéciaux du format iCalendar (RFC 5545) — sans
// ça, un titre de chapitre contenant une virgule ou un point-virgule
// casserait le parsing côté calendrier importateur.
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
}

function toICSDate(isoDate: string): string {
  return isoDate.replace(/-/g, "")
}

/**
 * Génère un fichier .ics avec un événement "journée entière" par jour de
 * révision planifié (voir exam-schedule.ts) — importable dans Google/
 * Apple/Outlook Calendar. Pas de dépendance externe : le format
 * iCalendar pour des événements journée entière est simple à produire
 * directement (RFC 5545 §3.6.1).
 */
export function buildICS(courseTitle: string, examDate: string, schedule: ScheduledDay[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//it-learn//Etude//FR",
    "CALSCALE:GREGORIAN",
  ]

  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"

  schedule.forEach((day, i) => {
    const chapterList = day.chapters.map(c => `- ${c.title}`).join("\\n")
    const nextDay = new Date(day.date + "T00:00:00")
    nextDay.setDate(nextDay.getDate() + 1)

    lines.push(
      "BEGIN:VEVENT",
      `UID:etude-${courseTitle.replace(/\s+/g, "-")}-${day.date}-${i}@it-learn`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${toICSDate(day.date)}`,
      `DTEND;VALUE=DATE:${toICSDate(nextDay.toISOString().slice(0, 10))}`,
      `SUMMARY:${escapeICSText(`Révision — ${courseTitle} (${day.chapters.length} chapitre${day.chapters.length > 1 ? "s" : ""})`)}`,
      `DESCRIPTION:${escapeICSText(chapterList)}`,
      "END:VEVENT"
    )
  })

  // Rappel le jour de l'examen lui-même.
  lines.push(
    "BEGIN:VEVENT",
    `UID:etude-${courseTitle.replace(/\s+/g, "-")}-exam@it-learn`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${toICSDate(examDate)}`,
    `SUMMARY:${escapeICSText(`Examen — ${courseTitle}`)}`,
    "END:VEVENT"
  )

  lines.push("END:VCALENDAR")
  // RFC 5545 exige des fins de ligne CRLF.
  return lines.join("\r\n")
}
