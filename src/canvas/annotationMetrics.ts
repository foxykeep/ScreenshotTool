/**
 * Pixel sizes for annotations at the baseline tier (long edge ≤ 2400 px).
 * Documented in PRODUCT.md with larger-image tiers.
 */
export const BASE_STROKE_WIDTH = 3
export const BASE_TEXT_FONT_SIZE = 20
const BASE_ARROWHEAD_LENGTH = 16
const BASE_ARROWHEAD_WIDTH = 10
const BASE_HANDLE_SIZE = 8
const BASE_HANDLE_HIT = 10
const BASE_HIT_PADDING = 6
const BASE_ARROW_BOUNDS_PAD = 18
const BASE_SELECTION_STROKE = 1.5
const BASE_TEXT_CHROME_PAD = 2
const BASE_TEXT_MIN_WIDTH = 12

/** Long-edge breakpoints (px) → scale multiplier (max 3×). */
const TIER_SCALE = [
  { maxLongEdge: 2400, scale: 1 },
  { maxLongEdge: 4800, scale: 1.5 },
  { maxLongEdge: 7200, scale: 2.25 },
  { maxLongEdge: Infinity, scale: 3 },
] as const

/** Resolved sizes for drawing, export, and hit-testing on one image. */
export type AnnotationMetrics = {
  readonly longEdge: number
  readonly tierScale: number
  readonly strokeWidth: number
  readonly textFontSize: number
  readonly arrowheadLength: number
  readonly arrowheadWidth: number
  readonly handleSize: number
  readonly handleHit: number
  readonly hitPadding: number
  readonly arrowBoundsPad: number
  readonly selectionStrokeWidth: number
  readonly textChromePad: number
  readonly textMinWidth: number
}

function tierScaleForLongEdge(longEdge: number): number {
  for (const tier of TIER_SCALE) {
    if (longEdge <= tier.maxLongEdge) {
      return tier.scale
    }
  }
  return 3
}

function scalePx(base: number, multiplier: number): number {
  return Math.round(base * multiplier * 2) / 2
}

/**
 * Metrics from the loaded image size. Same values on canvas and at export
 * resolution because everything is in image coordinates.
 */
export function annotationMetricsForImage(
  width: number,
  height: number,
): AnnotationMetrics {
  const longEdge = Math.max(width, height, 1)
  const tierScale = tierScaleForLongEdge(longEdge)
  return {
    longEdge,
    tierScale,
    strokeWidth: scalePx(BASE_STROKE_WIDTH, tierScale),
    textFontSize: Math.round(BASE_TEXT_FONT_SIZE * tierScale),
    arrowheadLength: scalePx(BASE_ARROWHEAD_LENGTH, tierScale),
    arrowheadWidth: scalePx(BASE_ARROWHEAD_WIDTH, tierScale),
    handleSize: scalePx(BASE_HANDLE_SIZE, tierScale),
    handleHit: scalePx(BASE_HANDLE_HIT, tierScale),
    hitPadding: scalePx(BASE_HIT_PADDING, tierScale),
    arrowBoundsPad: scalePx(BASE_ARROW_BOUNDS_PAD, tierScale),
    selectionStrokeWidth: scalePx(BASE_SELECTION_STROKE, tierScale),
    textChromePad: scalePx(BASE_TEXT_CHROME_PAD, tierScale),
    textMinWidth: scalePx(BASE_TEXT_MIN_WIDTH, tierScale),
  }
}