import type { Annotation, ArrowAnnotation, RectangleAnnotation, TextAnnotation } from '../types/annotations'
import { SHAPE_STROKE_WIDTH } from '../types/annotations'
import { measureTextBox, normalizeRect } from './draw'

/** Axis-aligned bounds in image coordinates. */
export type Bounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const ARROWHEAD_PAD = 18

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
): Bounds {
  switch (shape.kind) {
    case 'rectangle':
      return boundsForRectangle(shape)
    case 'arrow':
      return boundsForArrow(shape)
    case 'text':
      return boundsForText(ctx, shape)
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
  draft: Annotation | null = null,
): Bounds {
  let bounds: Bounds = {
    minX: 0,
    minY: 0,
    maxX: imageWidth,
    maxY: imageHeight,
  }
  for (const shape of shapes) {
    bounds = unionBounds(bounds, boundsForAnnotation(ctx, shape))
  }
  if (draft) {
    bounds = unionBounds(bounds, boundsForAnnotation(ctx, draft))
  }
  return expandBounds(bounds, Math.ceil(SHAPE_STROKE_WIDTH / 2) + 1)
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

function boundsForArrow(shape: ArrowAnnotation): Bounds {
  return {
    minX: Math.min(shape.x1, shape.x2) - ARROWHEAD_PAD,
    minY: Math.min(shape.y1, shape.y2) - ARROWHEAD_PAD,
    maxX: Math.max(shape.x1, shape.x2) + ARROWHEAD_PAD,
    maxY: Math.max(shape.y1, shape.y2) + ARROWHEAD_PAD,
  }
}

function boundsForText(
  ctx: CanvasRenderingContext2D,
  shape: TextAnnotation,
): Bounds {
  const box = measureTextBox(ctx, shape.text)
  return {
    minX: shape.x - 2,
    minY: shape.y - 2,
    maxX: shape.x + box.width + 2,
    maxY: shape.y + box.height + 2,
  }
}
