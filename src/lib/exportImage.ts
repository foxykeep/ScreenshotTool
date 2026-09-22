import type { AnnotationDocument } from '../types/annotations'
import { contentBounds } from '../canvas/bounds'
import { drawDocument } from '../canvas/draw'

/**
 * Composites the background image and annotations onto an offscreen canvas
 * (no selection chrome) and returns a PNG blob.
 * The canvas expands to fit any annotations outside the image; areas outside
 * the source image are filled with white.
 */
export async function renderExportBlob(
  image: HTMLImageElement,
  doc: AnnotationDocument,
): Promise<Blob> {
  const measure = document.createElement('canvas').getContext('2d')
  if (!measure) {
    throw new Error('Could not create export canvas.')
  }
  const bounds = contentBounds(
    measure,
    image.naturalWidth,
    image.naturalHeight,
    doc.shapes,
  )
  const width = Math.max(1, Math.ceil(bounds.maxX - bounds.minX))
  const height = Math.max(1, Math.ceil(bounds.maxY - bounds.minY))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not create export canvas.')
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(image, -bounds.minX, -bounds.minY)
  ctx.translate(-bounds.minX, -bounds.minY)
  drawDocument(ctx, { shapes: doc.shapes, selectedId: null }, null)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('PNG encode failed.')),
      'image/png',
    )
  })
}

/** Triggers a browser download of a PNG blob. */
export function downloadPng(
  blob: Blob,
  filename = 'screenshot-annotated.png',
): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Copies a PNG blob to the system clipboard.
 * Requires a secure context and ClipboardItem support.
 */
export async function copyPngToClipboard(blob: Blob): Promise<void> {
  if (!navigator.clipboard?.write) {
    throw new Error('Clipboard write is not available in this browser.')
  }
  if (typeof ClipboardItem === 'undefined') {
    throw new Error('ClipboardItem is not supported in this browser.')
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}
