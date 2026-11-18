/** Baseline stroke at 1200 px long edge (1200/400 = 3). */
export const STROKE_FLOOR = 3
/** Image-pixel stroke ≈ longEdge / STROKE_DIVISOR (clamped). */
export const STROKE_DIVISOR = 400
/** Long edge used for sizing is capped before the formula (panoramas included). */
export const SIZING_LONG_EDGE_CAP = 12000
/** Max stroke at cap (12000/400). */
export const STROKE_CAP = SIZING_LONG_EDGE_CAP / STROKE_DIVISOR
/** Text size ≈ stroke × ratio (6.5 → ~20 px at 3 px stroke). */
export const TEXT_STROKE_RATIO = 6.5

/** On-screen constant sizes (CSS px); converted to image space via view scale. */
export const SCREEN_HANDLE_SIZE = 8
export const SCREEN_HANDLE_HIT = 10
export const SCREEN_SELECTION_STROKE = 1.5
export const SCREEN_HIT_SLACK = 6
export const SCREEN_TEXT_CHROME_PAD = 2

/** Resolved image-space sizes for drawing and export. */
export type AnnotationMetrics = {
  readonly longEdge: number
  readonly shortEdge: number
  readonly aspectRatio: number
  readonly strokeWidth: number
  readonly textFontSize: number
  readonly arrowheadLength: number
  readonly arrowheadWidth: number
  readonly arrowBoundsPad: number
  readonly textChromePad: number
  readonly textMinWidth: number
}

function roundHalf(value: number): number {
  return Math.round(value * 2) / 2
}

/**
 * Sizing long edge: always `max(width, height)` so wide/tall panoramas use the
 * wide dimension, never the short edge or area.
 */
export function sizingLongEdge(width: number, height: number): number {
  return Math.max(width, height, 1)
}

/**
 * Converts a desired on-screen pixel size to image coordinates for the current
 * fit/zoom scale (canvas applies `displayScale` when drawing).
 */
export function imagePixelsFromScreen(
  screenPx: number,
  viewScale: number,
): number {
  return screenPx / Math.max(viewScale, 1e-6)
}

/**
 * Metrics from decoded image dimensions. Same on canvas (at any zoom) and in
 * full-resolution export — strokes are chosen so fit-to-viewport looks similar
 * across image sizes.
 */
export function annotationMetricsForImage(
  width: number,
  height: number,
): AnnotationMetrics {
  const longEdge = sizingLongEdge(width, height)
  const shortEdge = Math.max(Math.min(width, height), 1)
  const aspectRatio = longEdge / shortEdge
  const edgeForStroke = Math.min(longEdge, SIZING_LONG_EDGE_CAP)
  const strokeWidth = roundHalf(
    Math.min(STROKE_CAP, Math.max(STROKE_FLOOR, edgeForStroke / STROKE_DIVISOR)),
  )
  const textFontSize = Math.round(strokeWidth * TEXT_STROKE_RATIO)
  const arrowRatio = 16 / 3
  const arrowWidthRatio = 10 / 3
  return {
    longEdge,
    shortEdge,
    aspectRatio,
    strokeWidth,
    textFontSize,
    arrowheadLength: roundHalf(strokeWidth * arrowRatio),
    arrowheadWidth: roundHalf(strokeWidth * arrowWidthRatio),
    arrowBoundsPad: roundHalf(strokeWidth * 6),
    textChromePad: roundHalf(Math.max(2, strokeWidth * 0.66)),
    textMinWidth: roundHalf(Math.max(12, strokeWidth * 4)),
  }
}