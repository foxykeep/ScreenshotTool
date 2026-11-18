import type {
  Annotation,
  AnnotationDocument,
  ArrowAnnotation,
  RectangleAnnotation,
  TextAnnotation,
} from '../types/annotations'
import type { AnnotationMetrics } from './annotationMetrics'

/** Draw-color red for shape strokes and text. */
export const DRAW_COLOR = '#e53e3e'

/** Selection chrome blue. */
export const SELECTION_COLOR = '#3182ce'

/** Applies the text font for the current image metrics on a 2d context. */
export function applyTextFont(
  ctx: CanvasRenderingContext2D,
  metrics: AnnotationMetrics,
): void {
  ctx.font = `600 ${metrics.textFontSize}px "Segoe UI", system-ui, sans-serif`
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
}

/** Approximate width/height of a text label for hit-testing and chrome. */
export function measureTextBox(
  ctx: CanvasRenderingContext2D,
  text: string,
  metrics: AnnotationMetrics,
): { width: number; height: number } {
  applyTextFont(ctx, metrics)
  const metricsLine = ctx.measureText(text.length > 0 ? text : ' ')
  return {
    width: Math.max(metricsLine.width, metrics.textMinWidth),
    height: metrics.textFontSize * 1.25,
  }
}

/** Draws a normalized rectangle stroke. */
export function drawRectangle(
  ctx: CanvasRenderingContext2D,
  shape: RectangleAnnotation,
  color: string,
  metrics: AnnotationMetrics,
): void {
  const { x, y, w, h } = normalizeRect(
    shape.x,
    shape.y,
    shape.width,
    shape.height,
  )
  ctx.strokeStyle = color
  ctx.lineWidth = metrics.strokeWidth
  ctx.lineJoin = 'miter'
  ctx.strokeRect(x, y, w, h)
}

/** Draws a straight arrow with a filled triangular head. */
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  shape: ArrowAnnotation,
  color: string,
  metrics: AnnotationMetrics,
): void {
  const { x1, y1, x2, y2 } = shape
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = metrics.arrowheadLength
  const headW = metrics.arrowheadWidth
  const shaftEndX = x2 - Math.cos(angle) * headLen * 0.55
  const shaftEndY = y2 - Math.sin(angle) * headLen * 0.55

  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = metrics.strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(shaftEndX, shaftEndY)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(
    x2 - headLen * Math.cos(angle) + headW * Math.sin(angle),
    y2 - headLen * Math.sin(angle) - headW * Math.cos(angle),
  )
  ctx.lineTo(
    x2 - headLen * Math.cos(angle) - headW * Math.sin(angle),
    y2 - headLen * Math.sin(angle) + headW * Math.cos(angle),
  )
  ctx.closePath()
  ctx.fill()
}

/** Draws fixed-size text in draw color. */
export function drawText(
  ctx: CanvasRenderingContext2D,
  shape: TextAnnotation,
  color: string,
  metrics: AnnotationMetrics,
): void {
  applyTextFont(ctx, metrics)
  ctx.fillStyle = color
  ctx.fillText(shape.text, shape.x, shape.y)
}

/** Draws one annotation in draw color. */
export function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  shape: Annotation,
  metrics: AnnotationMetrics,
): void {
  switch (shape.kind) {
    case 'rectangle':
      drawRectangle(ctx, shape, DRAW_COLOR, metrics)
      break
    case 'arrow':
      drawArrow(ctx, shape, DRAW_COLOR, metrics)
      break
    case 'text':
      drawText(ctx, shape, DRAW_COLOR, metrics)
      break
  }
}

/** Draws all shapes, then blue selection chrome for the selected id. */
export function drawDocument(
  ctx: CanvasRenderingContext2D,
  doc: AnnotationDocument,
  draft: Annotation | null,
  metrics: AnnotationMetrics,
): void {
  for (const shape of doc.shapes) {
    drawAnnotation(ctx, shape, metrics)
  }
  if (draft) {
    drawAnnotation(ctx, draft, metrics)
  }
  const selected =
    doc.selectedId == null
      ? null
      : (doc.shapes.find((s) => s.id === doc.selectedId) ?? null)
  if (selected) {
    drawSelectionChrome(ctx, selected, metrics)
  }
}

/** Blue outline / handles for the selected shape. */
export function drawSelectionChrome(
  ctx: CanvasRenderingContext2D,
  shape: Annotation,
  metrics: AnnotationMetrics,
): void {
  ctx.save()
  ctx.strokeStyle = SELECTION_COLOR
  ctx.fillStyle = '#ffffff'
  ctx.lineWidth = metrics.selectionStrokeWidth

  switch (shape.kind) {
    case 'rectangle': {
      const { x, y, w, h } = normalizeRect(
        shape.x,
        shape.y,
        shape.width,
        shape.height,
      )
      ctx.strokeRect(x, y, w, h)
      for (const [hx, hy] of rectHandles(x, y, w, h)) {
        drawHandle(ctx, hx, hy, metrics)
      }
      break
    }
    case 'arrow': {
      ctx.beginPath()
      ctx.moveTo(shape.x1, shape.y1)
      ctx.lineTo(shape.x2, shape.y2)
      ctx.stroke()
      drawHandle(ctx, shape.x1, shape.y1, metrics)
      drawHandle(ctx, shape.x2, shape.y2, metrics)
      break
    }
    case 'text': {
      const box = measureTextBox(ctx, shape.text, metrics)
      const pad = metrics.textChromePad
      ctx.strokeRect(
        shape.x - pad,
        shape.y - pad,
        box.width + pad * 2,
        box.height + pad * 2,
      )
      break
    }
  }
  ctx.restore()
}

function drawHandle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  metrics: AnnotationMetrics,
): void {
  const size = metrics.handleSize
  const half = size / 2
  ctx.fillRect(x - half, y - half, size, size)
  ctx.strokeRect(x - half, y - half, size, size)
}

/** Corner + edge midpoints for rectangle resize. */
export function rectHandles(
  x: number,
  y: number,
  w: number,
  h: number,
): readonly [number, number][] {
  return [
    [x, y],
    [x + w / 2, y],
    [x + w, y],
    [x + w, y + h / 2],
    [x + w, y + h],
    [x + w / 2, y + h],
    [x, y + h],
    [x, y + h / 2],
  ]
}

/** Normalizes a possibly inverted rect to positive width/height. */
export function normalizeRect(
  x: number,
  y: number,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } {
  const x2 = x + width
  const y2 = y + height
  return {
    x: Math.min(x, x2),
    y: Math.min(y, y2),
    w: Math.abs(width),
    h: Math.abs(height),
  }
}