import { PDFDocument } from "pdf-lib"
import { getDocumentProxy, extractText } from "unpdf"

/**
 * Découpage physique d'un PDF trop volumineux pour un seul appel
 * d'ingestion (voir docs/etude-mode-plan.md §5.3 étape 1 et le mur
 * max_tokens rencontré en pratique sur un support de semestre complet).
 *
 * Architecture à deux passes, délibérément asymétrique en coût :
 * - Repérage des frontières de chapitres : texte brut extrait (unpdf,
 *   aucune dépendance native) + Haiku — quasi gratuit, ne voit jamais les
 *   schémas/diagrammes mais n'en a pas besoin, juste des titres/pages.
 * - Génération du contenu (ailleurs, dans ingest/route.ts) : chaque
 *   tranche reste en PDF natif envoyé à Sonnet, comme avant — c'est là
 *   que la qualité de lecture des schémas et du code compte, décision
 *   déjà prise et documentée en §4.3.
 */

/** Nombre de pages au-delà duquel on découpe en tranches avant ingestion. */
export const SPLIT_THRESHOLD_PAGES = 45

export interface PageText {
  page: number
  text: string
}

export async function countPdfPages(pdfBytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(pdfBytes)
  return doc.getPageCount()
}

/** Texte brut par page, pour la passe de repérage des frontières uniquement. */
export async function extractPageTexts(pdfBytes: Uint8Array): Promise<PageText[]> {
  const proxy = await getDocumentProxy(pdfBytes)
  const { text } = await extractText(proxy, { mergePages: false })
  return text.map((t, i) => ({ page: i + 1, text: t }))
}

/**
 * Regroupe des frontières de chapitres (pages de début, 1-indexées,
 * triées) en tranches d'au plus `maxPagesPerSlice` pages — plusieurs
 * chapitres courts consécutifs partagent une tranche plutôt que de
 * déclencher un appel Sonnet chacun. Ne coupe jamais un chapitre en deux :
 * une frontière ne peut être placée qu'en tête de tranche.
 */
export function groupChapterStartsIntoSlices(
  chapterStartPages: number[],
  totalPages: number,
  maxPagesPerSlice: number
): { startPage: number; endPage: number }[] {
  const starts = [...new Set(chapterStartPages)].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  if (starts.length === 0 || starts[0] !== 1) starts.unshift(1)

  const slices: { startPage: number; endPage: number }[] = []
  let sliceStart = starts[0]

  for (let i = 1; i <= starts.length; i++) {
    const nextChapterStart = starts[i] ?? totalPages + 1
    const wouldSpan = nextChapterStart - 1 - sliceStart + 1
    if (wouldSpan > maxPagesPerSlice && starts[i - 1] !== sliceStart) {
      // Cette frontière dépasserait la limite — clôt la tranche courante
      // à la frontière précédente plutôt que de continuer à l'agrandir.
      slices.push({ startPage: sliceStart, endPage: starts[i - 1] - 1 })
      sliceStart = starts[i - 1]
    }
    if (i === starts.length) {
      slices.push({ startPage: sliceStart, endPage: totalPages })
    }
  }

  return slices
}

/** Extrait les pages [startPage, endPage] (1-indexées, incluses) dans un nouveau PDF autonome. */
export async function extractPdfPageRange(
  pdfBytes: Uint8Array,
  startPage: number,
  endPage: number
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBytes)
  const outDoc = await PDFDocument.create()

  const indices: number[] = []
  for (let p = startPage; p <= endPage; p++) indices.push(p - 1)

  const copiedPages = await outDoc.copyPages(srcDoc, indices)
  copiedPages.forEach(page => outDoc.addPage(page))

  return outDoc.save()
}
