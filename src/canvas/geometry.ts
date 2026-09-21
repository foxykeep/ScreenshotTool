import type { Annotation, RectangleAnnotation } from '../types/annotations'
import { normalizeRect } from './draw'

/**
 * Resizes a rectangle by dragging handle `handleIndex` (0–7 clockwise from NW)
 * to the pointer position. Returns a normalized positive-size rect.
 */
export function resizeRectangle(
  shape: RectangleAnnotation,
  handleIndex: number,
  px: number,
  py: number,
): RectangleAnnotation {
  const { x, y, w, h } = normalizeRect(
    shape.x,
    shape.y,
    shape.width,
    shape.height,
  )
  let left = x
  let top = y
  let right = x + w
  let bottom = y + h

  switch (handleIndex) {
    case 0:
      left = px
      top = py
      break
    case 1:
      top = py
      break
    case 2:
      right = px
      top = py
      break
    case 3:
      right = px
      break
    case 4:
      right = px
      bottom = py
      break
    case 5:
      bottom = py
      break
    case 6:
      left = px
      bottom = py
      break
    case 7:
      left = px
      break
    default:
      break
  }

  const next = normalizeRect(left, top, right - left, bottom - top)
  return {
    ...shape,
    x: next.x,
    y: next.y,
    width: Math.max(1, next.w),
    height: Math.max(1, next.h),
  }
}

/** Returns a new annotation translated by (dx, dy). */
export function translateAnnotation(
  shape: Annotation,
  dx: number,
  dy: number,
): Annotation {
  switch (shape.kind) {
    case 'rectangle':
      return { ...shape, x: shape.x + dx, y: shape.y + dy }
    case 'arrow':
      return {
        ...shape,
        x1: shape.x1 + dx,
        y1: shape.y1 + dy,
        x2: shape.x2 + dx,
        y2: shape.y2 + dy,
      }
    case 'text':
      return { ...shape, x: shape.x + dx, y: shape.y + dy }
  }
}
