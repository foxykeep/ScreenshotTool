import {
  useCallback,
  useEffect,
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
import { createAnnotationId } from '../lib/id'

type DragMode =
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
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 })

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

  const layout = computeLayout(image, viewSize.width, viewSize.height)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !image || !layout) {
      return
    }
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0)
    drawDocument(ctx, doc, draft)
  }, [image, doc, draft, layout])

  const toImagePoint = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current
      if (!canvas || !layout) {
        return null
      }
      const rect = canvas.getBoundingClientRect()
      const x = ((clientX - rect.left) / rect.width) * canvas.width
      const y = ((clientY - rect.top) / rect.height) * canvas.height
      return { x, y }
    },
    [layout],
  )

  const finishTextEditor = useCallback(
    (save: boolean) => {
      const editor = textEditor
      if (!editor) {
        return
      }
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
      }
    },
    [textEditor, onDocumentCommit],
  )

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!image || textEditor) {
      return
    }
    const pt = toImagePoint(e.clientX, e.clientY)
    if (!pt) {
      return
    }
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    canvas.setPointerCapture(e.pointerId)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    if (tool === 'text') {
      const id = createAnnotationId()
      setTextEditor({ id, x: pt.x, y: pt.y, text: '', isNew: true })
      onSelect(id)
      return
    }

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
      setTextEditor({
        id: hit.shape.id,
        x: hit.shape.x,
        y: hit.shape.y,
        text: hit.shape.text,
        isNew: false,
      })
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
          Open an image or capture the screen to start annotating.
          <span className="canvas-empty-hint">
            You can also drop an image file here.
          </span>
        </div>
      ) : (
        <div
          className="canvas-stage"
          style={
            layout
              ? { width: layout.cssWidth, height: layout.cssHeight }
              : undefined
          }
        >
          <canvas
            ref={canvasRef}
            className="annotation-canvas"
            style={
              layout
                ? {
                    width: layout.cssWidth,
                    height: layout.cssHeight,
                    cursor: cursorForTool(tool),
                  }
                : undefined
            }
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          {textEditor && layout ? (
            <textarea
              className="text-editor"
              autoFocus
              value={textEditor.text}
              placeholder="Label"
              style={{
                left: (textEditor.x / image.naturalWidth) * layout.cssWidth,
                top: (textEditor.y / image.naturalHeight) * layout.cssHeight,
                fontSize: `${(TEXT_FONT_SIZE / image.naturalHeight) * layout.cssHeight}px`,
              }}
              onChange={(e) =>
                setTextEditor((ed) =>
                  ed ? { ...ed, text: e.target.value } : ed,
                )
              }
              onBlur={() => finishTextEditor(true)}
              onKeyDown={(e) => {
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

function cursorForTool(tool: ToolId): string {
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

function computeLayout(
  image: HTMLImageElement | null,
  viewW: number,
  viewH: number,
): { cssWidth: number; cssHeight: number } | null {
  if (!image || viewW <= 0 || viewH <= 0) {
    return null
  }
  const iw = image.naturalWidth
  const ih = image.naturalHeight
  const scale = Math.min(viewW / iw, viewH / ih, 1)
  return {
    cssWidth: Math.max(1, Math.floor(iw * scale)),
    cssHeight: Math.max(1, Math.floor(ih * scale)),
  }
}
