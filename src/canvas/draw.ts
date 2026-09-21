import type {
  Annotation,
  AnnotationDocument,
  ArrowAnnotation,
  RectangleAnnotation,
  TextAnnotation,
} from '../types/annotations'
import { SHAPE_STROKE_WIDTH, TEXT_FONT_SIZE } from '../types/annotations'

/** Draw-color red for shape strokes and text. */
export const DRAW_COLOR = '#e53e3e'

/** Selection chrome blue. */
export const SELECTION_COLOR = '#3182ce'

const HANDLE_SIZE = 8
const ARROWHEAD_LENGTH = 16
const ARROWHEAD_WIDTH = 10

/** Applies the fixed text font on a 2d context. */
export function applyTextFont(ctx: CanvasRenderingContext2D): void {
  ctx.font = `600 ${TEXT_FONT_SIZE}px "Segoe UI", system-ui, sans-serif`
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
}

/** Approximate width/height of a text label for hit-testing and chrome. */
export function measureTextBox(
  ctx: CanvasRenderingContext2D,
  text: string,
): { width: number; height: number } {
  applyTextFont(ctx)
  const metrics = ctx.measureText(text.length > 0 ? text : ' ')
  return {
    width: Math.max(metrics.width, 12),
    height: TEXT_FONT_SIZE * 1.25,
  }
}

/** Draws a normalized rectangle stroke. */
export function drawRectangle(
  ctx: CanvasRenderingContext2D,
  shape: RectangleAnnotation,
  color: string,
): void {
  const { x, y, w, h } = normalizeRect(
    shape.x,
    shape.y,
    shape.width,
    shape.height,
  )
  ctx.strokeStyle = color
  ctx.lineWidth = SHAPE_STROKE_WIDTH
  ctx.lineJoin = 'miter'
  ctx.strokeRect(x, y, w, h)
}

/** Draws a straight arrow with a filled triangular head. */
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  shape: ArrowAnnotation,
  color: string,
): void {
  const { x1, y1, x2, y2 } = shape
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const shaftEndX = x2 - Math.cos(angle) * ARROWHEAD_LENGTH * 0.55
  const shaftEndY = y2 - Math.sin(angle) * ARROWHEAD_LENGTH * 0.55

  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = SHAPE_STROKE_WIDTH
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(shaftEndX, shaftEndY)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(
    x2 - ARROWHEAD_LENGTH * Math.cos(angle) + ARROWHEAD_WIDTH * Math.sin(angle),
    y2 - ARROWHEAD_LENGTH * Math.sin(angle) - ARROWHEAD_WIDTH * Math.cos(angle),
  )
  ctx.lineTo(
    x2 - ARROWHEAD_LENGTH * Math.cos(angle) - ARROWHEAD_WIDTH * Math.sin(angle),
    y2 - ARROWHEAD_LENGTH * Math.sin(angle) + ARROWHEAD_WIDTH * Math.cos(angle),
  )
  ctx.closePath()
  ctx.fill()
}

/** Draws fixed-size text in draw color. */
export function drawText(
  ctx: CanvasRenderingContext2D,
  shape: TextAnnotation,
  color: string,
): void {
  applyTextFont(ctx)
  ctx.fillStyle = color
  ctx.fillText(shape.text, shape.x, shape.y)
}

/** Draws one annotation in draw color. */
export function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  shape: Annotation,
): void {
  switch (shape.kind) {
    case 'rectangle':
      drawRectangle(ctx, shape, DRAW_COLOR)
      break
    case 'arrow':
      drawArrow(ctx, shape, DRAW_COLOR)
      break
    case 'text':
      drawText(ctx, shape, DRAW_COLOR)
      break
  }
}

/** Draws all shapes, then blue selection chrome for the selected id. */
export function drawDocument(
  ctx: CanvasRenderingContext2D,
  doc: AnnotationDocument,
  draft: Annotation | null,
): void {
  for (const shape of doc.shapes) {
    drawAnnotation(ctx, shape)
  }
  if (draft) {
    drawAnnotation(ctx, draft)
  }
  const selected =
    doc.selectedId == null
      ? null
      : (doc.shapes.find((s) => s.id === doc.selectedId) ?? null)
  if (selected) {
    drawSelectionChrome(ctx, selected)
  }
}

/** Blue outline / handles for the selected shape. */
export function drawSelectionChrome(
  ctx: CanvasRenderingContext2D,
  shape: Annotation,
): void {
  ctx.save()
  ctx.strokeStyle = SELECTION_COLOR
  ctx.fillStyle = '#ffffff'
  ctx.lineWidth = 1.5

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
        drawHandle(ctx, hx, hy)
      }
      break
    }
    case 'arrow': {
      ctx.beginPath()
      ctx.moveTo(shape.x1, shape.y1)
      ctx.lineTo(shape.x2, shape.y2)
      ctx.stroke()
      drawHandle(ctx, shape.x1, shape.y1)
      drawHandle(ctx, shape.x2, shape.y2)
      break
    }
    case 'text': {
      const box = measureTextBox(ctx, shape.text)
      ctx.strokeRect(shape.x - 2, shape.y - 2, box.width + 4, box.height + 4)
      break
    }
  }
  ctx.restore()
}

function drawHandle(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const half = HANDLE_SIZE / 2
  ctx.fillRect(x - half, y - half, HANDLE_SIZE, HANDLE_SIZE)
  ctx.strokeRect(x - half, y - half, HANDLE_SIZE, HANDLE_SIZE)
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
