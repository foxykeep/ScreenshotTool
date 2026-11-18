import type {
  Annotation,
  AnnotationDocument,
  ArrowAnnotation,
  RectangleAnnotation,
  TextAnnotation,
} from '../types/annotations'
import type { AnnotationMetrics } from './annotationMetrics'
import { measureTextBox, normalizeRect, rectHandles } from './draw'

/** Which part of a shape was hit for pointer interaction. */
export type HitTarget =
  | { kind: 'shape'; shape: Annotation }
  | { kind: 'rect-handle'; shape: RectangleAnnotation; handleIndex: number }
  | { kind: 'arrow-handle'; shape: ArrowAnnotation; endpoint: 'start' | 'end' }
  | null

/**
 * Hit-tests from topmost shape downward. Prefer handles when the shape is selected.
 */
export function hitTest(
  ctx: CanvasRenderingContext2D,
  doc: AnnotationDocument,
  px: number,
  py: number,
  metrics: AnnotationMetrics,
): HitTarget {
  const selected =
    doc.selectedId == null
      ? undefined
      : doc.shapes.find((s) => s.id === doc.selectedId)

  if (selected?.kind === 'rectangle') {
    const handle = hitRectHandle(selected, px, py, metrics)
    if (handle != null) {
      return { kind: 'rect-handle', shape: selected, handleIndex: handle }
    }
  }
  if (selected?.kind === 'arrow') {
    const endpoint = hitArrowHandle(selected, px, py, metrics)
    if (endpoint != null) {
      return { kind: 'arrow-handle', shape: selected, endpoint }
    }
  }

  for (let i = doc.shapes.length - 1; i >= 0; i -= 1) {
    const shape = doc.shapes[i]!
    if (hitsShape(ctx, shape, px, py, metrics)) {
      return { kind: 'shape', shape }
    }
  }
  return null
}

function hitRectHandle(
  shape: RectangleAnnotation,
  px: number,
  py: number,
  metrics: AnnotationMetrics,
): number | null {
  const { x, y, w, h } = normalizeRect(
    shape.x,
    shape.y,
    shape.width,
    shape.height,
  )
  const handles = rectHandles(x, y, w, h)
  const hit = metrics.handleHit
  for (let i = 0; i < handles.length; i += 1) {
    const [hx, hy] = handles[i]!
    if (Math.abs(px - hx) <= hit && Math.abs(py - hy) <= hit) {
      return i
    }
  }
  return null
}

function hitArrowHandle(
  shape: ArrowAnnotation,
  px: number,
  py: number,
  metrics: AnnotationMetrics,
): 'start' | 'end' | null {
  const hit = metrics.handleHit
  if (Math.hypot(px - shape.x1, py - shape.y1) <= hit) {
    return 'start'
  }
  if (Math.hypot(px - shape.x2, py - shape.y2) <= hit) {
    return 'end'
  }
  return null
}

function hitsShape(
  ctx: CanvasRenderingContext2D,
  shape: Annotation,
  px: number,
  py: number,
  metrics: AnnotationMetrics,
): boolean {
  switch (shape.kind) {
    case 'rectangle':
      return hitsRectangle(shape, px, py, metrics)
    case 'arrow':
      return hitsArrow(shape, px, py, metrics)
    case 'text':
      return hitsText(ctx, shape, px, py, metrics)
  }
}

function hitsRectangle(
  shape: RectangleAnnotation,
  px: number,
  py: number,
  metrics: AnnotationMetrics,
): boolean {
  const { x, y, w, h } = normalizeRect(
    shape.x,
    shape.y,
    shape.width,
    shape.height,
  )
  const pad = metrics.hitPadding
  return (
    px >= x - pad && px <= x + w + pad && py >= y - pad && py <= y + h + pad
  )
}

function hitsArrow(
  shape: ArrowAnnotation,
  px: number,
  py: number,
  metrics: AnnotationMetrics,
): boolean {
  const pad = metrics.hitPadding + metrics.strokeWidth / 2
  return (
    distanceToSegment(px, py, shape.x1, shape.y1, shape.x2, shape.y2) <= pad
  )
}

function hitsText(
  ctx: CanvasRenderingContext2D,
  shape: TextAnnotation,
  px: number,
  py: number,
  metrics: AnnotationMetrics,
): boolean {
  const box = measureTextBox(ctx, shape.text, metrics)
  const pad = metrics.textChromePad
  return (
    px >= shape.x - pad &&
    px <= shape.x + box.width + pad &&
    py >= shape.y - pad &&
    py <= shape.y + box.height + pad
  )
}

function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) {
    return Math.hypot(px - x1, py - y1)
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}