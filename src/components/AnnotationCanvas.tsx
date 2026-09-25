import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type {
  Annotation,
  AnnotationDocument,
  ArrowAnnotation,
  RectangleAnnotation,
  TextAnnotation,
  ToolId,
} from '../types/annotations'
import { TEXT_FONT_SIZE } from '../types/annotations'
import { drawDocument, normalizeRect } from '../canvas/draw'
import { hitTest } from '../canvas/hitTest'
import { resizeRectangle, translateAnnotation } from '../canvas/geometry'
import {
  DEFAULT_VIEWPORT,
  displayScale,
  screenToImage,
  viewOrigin,
  zoomAtScreenPoint,
  type ViewportState,
} from '../canvas/viewTransform'
import { createAnnotationId } from '../lib/id'

type DragMode =
  | {
      type: 'pan'
      startSx: number
      startSy: number
      originPanX: number
      originPanY: number
    }
  | { type: 'create-rect'; id: string; startX: number; startY: number }
  | { type: 'create-arrow'; id: string; startX: number; startY: number }
  | {
      type: 'move'
      id: string
      origin: Annotation
      startX: number
      startY: number
    }
  | {
      type: 'resize-rect'
      id: string
      handleIndex: number
      origin: RectangleAnnotation
    }
  | {
      type: 'resize-arrow'
      id: string
      endpoint: 'start' | 'end'
      origin: ArrowAnnotation
    }

type TextEditor = {
  id: string
  x: number
  y: number
  text: string
  isNew: boolean
}

type AnnotationCanvasProps = {
  image: HTMLImageElement | null
  tool: ToolId
  document: AnnotationDocument
  onDocumentLive: (doc: AnnotationDocument) => void
  onDocumentCommit: (doc: AnnotationDocument) => void
  onSelect: (id: string | null) => void
}

/**
 * Canvas workspace: draws the loaded image and annotations, handles tool pointers.
 */
export function AnnotationCanvas({
  image,
  tool,
  document: doc,
  onDocumentLive,
  onDocumentCommit,
  onSelect,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragMode | null>(null)
  const liveDocRef = useRef(doc)
  const draftRef = useRef<Annotation | null>(null)
  const [draft, setDraft] = useState<Annotation | null>(null)
  const [textEditor, setTextEditor] = useState<TextEditor | null>(null)
  const textEditorRef = useRef<TextEditor | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const ignoreTextBlurRef = useRef(false)
  const spaceDownRef = useRef(false)
  const viewportRef = useRef<ViewportState>(DEFAULT_VIEWPORT)
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 })
  const [viewport, setViewport] = useState<ViewportState>(DEFAULT_VIEWPORT)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [panDragging, setPanDragging] = useState(false)

  viewportRef.current = viewport

  const pushLive = useCallback(
    (next: AnnotationDocument) => {
      liveDocRef.current = next
      onDocumentLive(next)
    },
    [onDocumentLive],
  )

  const pushDraft = useCallback((next: Annotation | null) => {
    draftRef.current = next
    setDraft(next)
  }, [])

  useEffect(() => {
    if (dragRef.current == null) {
      liveDocRef.current = doc
    }
  }, [doc])

  useEffect(() => {
    textEditorRef.current = textEditor
  }, [textEditor])

  // Focus the overlay after the placing click finishes so focus sticks.
  const textEditorId = textEditor?.id ?? null
  useEffect(() => {
    if (textEditorId == null) {
      return
    }
    const timer = window.setTimeout(() => {
      if (textEditorRef.current?.id !== textEditorId) {
        return
      }
      const node = textareaRef.current
      if (!node) {
        return
      }
      node.focus()
      if (!textEditorRef.current.isNew) {
        node.select()
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [textEditorId])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) {
      return
    }
    const ro = new ResizeObserver(() => {
      const rect = wrap.getBoundingClientRect()
      setViewSize({ width: rect.width, height: rect.height })
    })
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    setViewport(DEFAULT_VIEWPORT)
  }, [image])

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement | null
      return (
        el != null &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.isContentEditable)
      )
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) {
        if (e.key === '0' && !isEditableTarget(e.target) && image) {
          setViewport(DEFAULT_VIEWPORT)
        }
        return
      }
      if (isEditableTarget(e.target)) {
        return
      }
      e.preventDefault()
      spaceDownRef.current = true
      setSpaceHeld(true)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDownRef.current = false
        setSpaceHeld(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [image])

  const layout = useMemo(
    () => computeLayout(image, viewSize.width, viewSize.height),
    [image, viewSize.width, viewSize.height],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !image || !layout) {
      return
    }
    const dpr = window.devicePixelRatio || 1
    const { viewW, viewH } = layout
    const scale = displayScale(layout, viewport)
    const { originX, originY } = viewOrigin(layout, viewport)
    canvas.width = Math.max(1, Math.floor(viewW * dpr))
    canvas.height = Math.max(1, Math.floor(viewH * dpr))
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, viewW, viewH)
    ctx.drawImage(
      image,
      originX,
      originY,
      image.naturalWidth * scale,
      image.naturalHeight * scale,
    )
    ctx.translate(originX, originY)
    ctx.scale(scale, scale)
    drawDocument(ctx, doc, draft)
  }, [image, doc, draft, layout, viewport])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !image || !layout) {
      return
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const view = viewportRef.current
      const factor = Math.exp(-e.deltaY * 0.002)
      const next = zoomAtScreenPoint(
        layout,
        view,
        sx,
        sy,
        view.userZoom * factor,
      )
      setViewport(next)
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [image, layout])

  const toImagePoint = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current
      if (!canvas || !layout) {
        return null
      }
      const rect = canvas.getBoundingClientRect()
      return screenToImage(
        layout,
        viewport,
        clientX - rect.left,
        clientY - rect.top,
      )
    },
    [layout, viewport],
  )

  const toCanvasPoint = useCallback(
    (clientX: number, clientY: number): { sx: number; sy: number } | null => {
      const canvas = canvasRef.current
      if (!canvas) {
        return null
      }
      const rect = canvas.getBoundingClientRect()
      return { sx: clientX - rect.left, sy: clientY - rect.top }
    },
    [],
  )

  const finishTextEditor = useCallback(
    (save: boolean) => {
      const editor = textEditorRef.current
      if (!editor) {
        return
      }
      // Prevent the unmount blur (and Strict Mode remount blur) from re-entering.
      ignoreTextBlurRef.current = true
      textEditorRef.current = null
      setTextEditor(null)

      const text = editor.text.trim()
      if (save && text.length > 0) {
        const shape: TextAnnotation = {
          id: editor.id,
          kind: 'text',
          x: editor.x,
          y: editor.y,
          text,
        }
        onDocumentCommit(upsert(liveDocRef.current, shape))
      } else if (!editor.isNew && save && text.length === 0) {
        onDocumentCommit({
          shapes: liveDocRef.current.shapes.filter((s) => s.id !== editor.id),
          selectedId: null,
        })
      } else if (editor.isNew) {
        // Abandoned empty label — clear the dangling selection id.
        onSelect(null)
      }

      queueMicrotask(() => {
        ignoreTextBlurRef.current = false
      })
    },
    [onDocumentCommit, onSelect],
  )

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!image) {
      return
    }
    // Canvas is not focusable, so clicking it does not blur the textarea —
    // commit/cancel the open editor explicitly, then wait for the next click.
    if (textEditorRef.current) {
      finishTextEditor(true)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const canvasPoint = toCanvasPoint(e.clientX, e.clientY)
    const wantsPan =
      canvasPoint != null &&
      (spaceDownRef.current || e.button === 1)
    if (wantsPan && canvasPoint) {
      e.preventDefault()
      canvas.setPointerCapture(e.pointerId)
      dragRef.current = {
        type: 'pan',
        startSx: canvasPoint.sx,
        startSy: canvasPoint.sy,
        originPanX: viewport.panX,
        originPanY: viewport.panY,
      }
      setPanDragging(true)
      return
    }

    const pt = toImagePoint(e.clientX, e.clientY)
    if (!pt) {
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    if (tool === 'text') {
      // Do not capture the pointer — that fights the overlay textarea focus.
      e.preventDefault()
      const id = createAnnotationId()
      const editor: TextEditor = {
        id,
        x: pt.x,
        y: pt.y,
        text: '',
        isNew: true,
      }
      textEditorRef.current = editor
      setTextEditor(editor)
      onSelect(id)
      return
    }

    canvas.setPointerCapture(e.pointerId)

    if (tool === 'rectangle') {
      const id = createAnnotationId()
      dragRef.current = {
        type: 'create-rect',
        id,
        startX: pt.x,
        startY: pt.y,
      }
      pushDraft({
        id,
        kind: 'rectangle',
        x: pt.x,
        y: pt.y,
        width: 0,
        height: 0,
      })
      return
    }

    if (tool === 'arrow') {
      const id = createAnnotationId()
      dragRef.current = {
        type: 'create-arrow',
        id,
        startX: pt.x,
        startY: pt.y,
      }
      pushDraft({
        id,
        kind: 'arrow',
        x1: pt.x,
        y1: pt.y,
        x2: pt.x,
        y2: pt.y,
      })
      return
    }

    const hit = hitTest(ctx, doc, pt.x, pt.y)
    if (!hit) {
      onSelect(null)
      dragRef.current = null
      return
    }

    if (hit.kind === 'rect-handle') {
      dragRef.current = {
        type: 'resize-rect',
        id: hit.shape.id,
        handleIndex: hit.handleIndex,
        origin: hit.shape,
      }
      onSelect(hit.shape.id)
      return
    }
    if (hit.kind === 'arrow-handle') {
      dragRef.current = {
        type: 'resize-arrow',
        id: hit.shape.id,
        endpoint: hit.endpoint,
        origin: hit.shape,
      }
      onSelect(hit.shape.id)
      return
    }

    onSelect(hit.shape.id)
    if (e.detail === 2 && hit.shape.kind === 'text') {
      e.preventDefault()
      const editor: TextEditor = {
        id: hit.shape.id,
        x: hit.shape.x,
        y: hit.shape.y,
        text: hit.shape.text,
        isNew: false,
      }
      textEditorRef.current = editor
      setTextEditor(editor)
      return
    }
    dragRef.current = {
      type: 'move',
      id: hit.shape.id,
      origin: hit.shape,
      startX: pt.x,
      startY: pt.y,
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag) {
      return
    }

    if (drag.type === 'pan') {
      const canvasPoint = toCanvasPoint(e.clientX, e.clientY)
      if (!canvasPoint) {
        return
      }
      setViewport({
        ...viewportRef.current,
        panX: drag.originPanX + (canvasPoint.sx - drag.startSx),
        panY: drag.originPanY + (canvasPoint.sy - drag.startSy),
      })
      return
    }

    const pt = toImagePoint(e.clientX, e.clientY)
    if (!pt) {
      return
    }

    if (drag.type === 'create-rect') {
      pushDraft({
        id: drag.id,
        kind: 'rectangle',
        x: drag.startX,
        y: drag.startY,
        width: pt.x - drag.startX,
        height: pt.y - drag.startY,
      })
      return
    }
    if (drag.type === 'create-arrow') {
      pushDraft({
        id: drag.id,
        kind: 'arrow',
        x1: drag.startX,
        y1: drag.startY,
        x2: pt.x,
        y2: pt.y,
      })
      return
    }
    if (drag.type === 'move') {
      const moved = translateAnnotation(
        drag.origin,
        pt.x - drag.startX,
        pt.y - drag.startY,
      )
      pushLive(upsert(liveDocRef.current, moved))
      return
    }
    if (drag.type === 'resize-rect') {
      pushLive(
        upsert(
          liveDocRef.current,
          resizeRectangle(drag.origin, drag.handleIndex, pt.x, pt.y),
        ),
      )
      return
    }
    if (drag.type === 'resize-arrow') {
      const next: ArrowAnnotation =
        drag.endpoint === 'start'
          ? { ...drag.origin, x1: pt.x, y1: pt.y }
          : { ...drag.origin, x2: pt.x, y2: pt.y }
      pushLive(upsert(liveDocRef.current, next))
    }
  }

  const onPointerUp = () => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) {
      return
    }

    if (drag.type === 'pan') {
      setPanDragging(false)
      return
    }

    if (drag.type === 'create-rect') {
      const current = draftRef.current
      pushDraft(null)
      if (!current || current.kind !== 'rectangle') {
        return
      }
      const n = normalizeRect(
        current.x,
        current.y,
        current.width,
        current.height,
      )
      if (n.w < 3 || n.h < 3) {
        return
      }
      onDocumentCommit({
        ...upsert(liveDocRef.current, {
          id: current.id,
          kind: 'rectangle',
          x: n.x,
          y: n.y,
          width: n.w,
          height: n.h,
        }),
      })
      return
    }

    if (drag.type === 'create-arrow') {
      const current = draftRef.current
      pushDraft(null)
      if (!current || current.kind !== 'arrow') {
        return
      }
      if (Math.hypot(current.x2 - current.x1, current.y2 - current.y1) < 4) {
        return
      }
      onDocumentCommit(upsert(liveDocRef.current, current))
      return
    }

    onDocumentCommit(liveDocRef.current)
  }

  return (
    <div className="canvas-workspace" ref={wrapRef}>
      {!image ? (
        <div className="canvas-empty" role="status">
          Open an image to start annotating.
          <span className="canvas-empty-hint">
            Drop a file here, or paste with ⌘/Ctrl+V. Scroll to zoom; middle-click
            or Space+drag to pan; 0 resets view.
          </span>
        </div>
      ) : (
        <div className="canvas-stage">
          <canvas
            ref={canvasRef}
            className="annotation-canvas"
            style={{
              cursor: cursorForView(tool, spaceHeld, panDragging),
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          {textEditor && layout ? (
            <textarea
              ref={textareaRef}
              className="text-editor"
              value={textEditor.text}
              placeholder="Label"
              aria-label="Text label"
              style={{
                left:
                  viewOrigin(layout, viewport).originX +
                  textEditor.x * displayScale(layout, viewport),
                top:
                  viewOrigin(layout, viewport).originY +
                  textEditor.y * displayScale(layout, viewport),
                // Match on-canvas scale but keep a readable minimum while editing.
                fontSize: `${Math.max(
                  14,
                  TEXT_FONT_SIZE * displayScale(layout, viewport),
                )}px`,
              }}
              onChange={(e) => {
                const text = e.target.value
                setTextEditor((ed) => {
                  if (!ed) {
                    return ed
                  }
                  const next = { ...ed, text }
                  textEditorRef.current = next
                  return next
                })
              }}
              onPointerDown={(e) => {
                // Keep focus on the overlay; don't let the canvas start a new gesture.
                e.stopPropagation()
              }}
              onBlur={() => {
                if (ignoreTextBlurRef.current) {
                  return
                }
                finishTextEditor(true)
              }}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  finishTextEditor(true)
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  finishTextEditor(false)
                }
              }}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}

function upsert(
  doc: AnnotationDocument,
  shape: Annotation,
): AnnotationDocument {
  const index = doc.shapes.findIndex((s) => s.id === shape.id)
  if (index === -1) {
    return { shapes: [...doc.shapes, shape], selectedId: shape.id }
  }
  const shapes = doc.shapes.slice()
  shapes[index] = shape
  return { shapes, selectedId: shape.id }
}

function cursorForView(
  tool: ToolId,
  spaceHeld: boolean,
  panDragging: boolean,
): string {
  if (panDragging) {
    return 'grabbing'
  }
  if (spaceHeld) {
    return 'grab'
  }
  switch (tool) {
    case 'select':
      return 'default'
    case 'rectangle':
    case 'arrow':
      return 'crosshair'
    case 'text':
      return 'text'
  }
}

/**
 * Layout for a full-workspace canvas with the image centered (contain, no
 * upscale) and a small margin so the area around the image is drawable.
 * Pointer mapping uses image coordinates that may fall outside [0,iw]×[0,ih].
 * The editor does not paint white around the image; export fills that on output.
 */
function computeLayout(
  image: HTMLImageElement | null,
  viewW: number,
  viewH: number,
): {
  viewW: number
  viewH: number
  imageScale: number
  offsetX: number
  offsetY: number
} | null {
  if (!image || viewW <= 0 || viewH <= 0) {
    return null
  }
  const iw = image.naturalWidth
  const ih = image.naturalHeight
  const margin = Math.max(
    24,
    Math.min(64, Math.floor(Math.min(viewW, viewH) * 0.05)),
  )
  const availW = Math.max(1, viewW - margin * 2)
  const availH = Math.max(1, viewH - margin * 2)
  const imageScale = Math.min(availW / iw, availH / ih, 1)
  const cssW = iw * imageScale
  const cssH = ih * imageScale
  return {
    viewW,
    viewH,
    imageScale,
    offsetX: (viewW - cssW) / 2,
    offsetY: (viewH - cssH) / 2,
  }
}
