import type { AnnotationDocument } from '../types/annotations'
import { drawDocument } from '../canvas/draw'

/**
 * Composites the background image and annotations onto an offscreen canvas
 * (no selection chrome) and returns a PNG blob.
 */
export async function renderExportBlob(
  image: HTMLImageElement,
  doc: AnnotationDocument,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not create export canvas.')
  }
  ctx.drawImage(image, 0, 0)
  // Export without selection chrome
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
