import type {
  Annotation,
  ArrowAnnotation,
  RectangleAnnotation,
  TextAnnotation,
} from '../types/annotations'
import type { AnnotationMetrics } from './annotationMetrics'
import { measureTextBox, normalizeRect } from './draw'

/** Axis-aligned bounds in image coordinates. */
export type Bounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Pads a bounds box equally on all sides. */
export function expandBounds(bounds: Bounds, pad: number): Bounds {
  return {
    minX: bounds.minX - pad,
    minY: bounds.minY - pad,
    maxX: bounds.maxX + pad,
    maxY: bounds.maxY + pad,
  }
}

/** Union of two bounds boxes. */
export function unionBounds(a: Bounds, b: Bounds): Bounds {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  }
}

/** Bounds for one annotation, including stroke / arrowhead / text box. */
export function boundsForAnnotation(
  ctx: CanvasRenderingContext2D,
  shape: Annotation,
  metrics: AnnotationMetrics,
): Bounds {
  switch (shape.kind) {
    case 'rectangle':
      return boundsForRectangle(shape)
    case 'arrow':
      return boundsForArrow(shape, metrics)
    case 'text':
      return boundsForText(ctx, shape, metrics)
  }
}

/**
 * Content bounds covering the source image and all annotations (plus draft).
 * Used for export sizing; white fill covers any area outside the image.
 */
export function contentBounds(
  ctx: CanvasRenderingContext2D,
  imageWidth: number,
  imageHeight: number,
  shapes: readonly Annotation[],
  metrics: AnnotationMetrics,
  draft: Annotation | null = null,
): Bounds {
  let bounds: Bounds = {
    minX: 0,
    minY: 0,
    maxX: imageWidth,
    maxY: imageHeight,
  }
  for (const shape of shapes) {
    bounds = unionBounds(bounds, boundsForAnnotation(ctx, shape, metrics))
  }
  if (draft) {
    bounds = unionBounds(bounds, boundsForAnnotation(ctx, draft, metrics))
  }
  return expandBounds(
    bounds,
    Math.ceil(metrics.strokeWidth / 2) + metrics.textChromePad,
  )
}

function boundsForRectangle(shape: RectangleAnnotation): Bounds {
  const { x, y, w, h } = normalizeRect(
    shape.x,
    shape.y,
    shape.width,
    shape.height,
  )
  return { minX: x, minY: y, maxX: x + w, maxY: y + h }
}

function boundsForArrow(
  shape: ArrowAnnotation,
  metrics: AnnotationMetrics,
): Bounds {
  const pad = metrics.arrowBoundsPad
  return {
    minX: Math.min(shape.x1, shape.x2) - pad,
    minY: Math.min(shape.y1, shape.y2) - pad,
    maxX: Math.max(shape.x1, shape.x2) + pad,
    maxY: Math.max(shape.y1, shape.y2) + pad,
  }
}

function boundsForText(
  ctx: CanvasRenderingContext2D,
  shape: TextAnnotation,
  metrics: AnnotationMetrics,
): Bounds {
  const box = measureTextBox(ctx, shape.text, metrics)
  const pad = metrics.textChromePad
  return {
    minX: shape.x - pad,
    minY: shape.y - pad,
    maxX: shape.x + box.width + pad,
    maxY: shape.y + box.height + pad,
  }
}