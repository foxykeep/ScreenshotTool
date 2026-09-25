/** Stable id for an annotation shape. */
export type AnnotationId = string

/** Active toolbar tool. */
export type ToolId = 'select' | 'rectangle' | 'arrow' | 'text'

/** Axis-aligned rectangle annotation. */
export type RectangleAnnotation = {
  readonly id: AnnotationId
  readonly kind: 'rectangle'
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** Straight arrow from (x1,y1) to (x2,y2) with an arrowhead at the end. */
export type ArrowAnnotation = {
  readonly id: AnnotationId
  readonly kind: 'arrow'
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
}

/** Fixed-size text label anchored at (x,y) — top-left of the baseline box. */
export type TextAnnotation = {
  readonly id: AnnotationId
  readonly kind: 'text'
  readonly x: number
  readonly y: number
  readonly text: string
}

/** Discriminated union of drawable annotations. */
export type Annotation = RectangleAnnotation | ArrowAnnotation | TextAnnotation

/** Immutable document: ordered shapes plus selection. */
export type AnnotationDocument = {
  readonly shapes: readonly Annotation[]
  readonly selectedId: AnnotationId | null
}

/** Fixed text size for v1 (not user-resizable). */
export const TEXT_FONT_SIZE = 20

/** Canvas stroke width for shapes. */
export const SHAPE_STROKE_WIDTH = 3

/** Empty document used when clearing annotations. */
export const EMPTY_DOCUMENT: AnnotationDocument = {
  shapes: [],
  selectedId: null,
}
