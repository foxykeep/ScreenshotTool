/** Base layout from shrink-to-fit; zoom/pan are applied on top for display only. */
export type CanvasLayout = {
  viewW: number
  viewH: number
  imageScale: number
  offsetX: number
  offsetY: number
}

/** User-controlled zoom multiplier (1 = fit) and pan in CSS pixels. */
export type ViewportState = {
  userZoom: number
  panX: number
  panY: number
}

/** 1 = shrink-to-fit; lower values zoom out for more surrounding context. */
export const MIN_USER_ZOOM = 0.65
export const MAX_USER_ZOOM = 8

export const DEFAULT_VIEWPORT: ViewportState = {
  userZoom: 1,
  panX: 0,
  panY: 0,
}

/** Combined scale from image pixels to CSS pixels on screen. */
export function displayScale(
  layout: CanvasLayout,
  view: ViewportState,
): number {
  return layout.imageScale * view.userZoom
}

/** Top-left of the scaled image in canvas CSS coordinates. */
export function viewOrigin(
  layout: CanvasLayout,
  view: ViewportState,
): { originX: number; originY: number } {
  return {
    originX: layout.offsetX + view.panX,
    originY: layout.offsetY + view.panY,
  }
}

/** Maps a point on the canvas element to image coordinates. */
export function screenToImage(
  layout: CanvasLayout,
  view: ViewportState,
  sx: number,
  sy: number,
): { x: number; y: number } {
  const scale = displayScale(layout, view)
  const { originX, originY } = viewOrigin(layout, view)
  return {
    x: (sx - originX) / scale,
    y: (sy - originY) / scale,
  }
}

/** Zooms toward a canvas-local point while keeping that pixel anchored. */
export function zoomAtScreenPoint(
  layout: CanvasLayout,
  view: ViewportState,
  sx: number,
  sy: number,
  nextUserZoom: number,
): ViewportState {
  const clampedZoom = Math.min(
    MAX_USER_ZOOM,
    Math.max(MIN_USER_ZOOM, nextUserZoom),
  )
  const beforeScale = displayScale(layout, view)
  const { originX, originY } = viewOrigin(layout, view)
  const ix = (sx - originX) / beforeScale
  const iy = (sy - originY) / beforeScale
  const afterScale = layout.imageScale * clampedZoom
  return {
    userZoom: clampedZoom,
    panX: sx - layout.offsetX - ix * afterScale,
    panY: sy - layout.offsetY - iy * afterScale,
  }
}
