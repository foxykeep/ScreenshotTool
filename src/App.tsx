import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import './App.css'
import { AnnotationCanvas } from './components/AnnotationCanvas'
import { Toolbar } from './components/Toolbar'
import {
  canRedo,
  canUndo,
  commit,
  createHistory,
  redo,
  removeShape,
  replacePresent,
  setSelection,
  undo,
  type HistoryState,
} from './model/history'
import {
  copyPngToClipboard,
  downloadPng,
  renderExportBlob,
} from './lib/exportImage'
import { captureDisplayFrame, loadImageFromFile } from './lib/imageSource'
import { EMPTY_DOCUMENT } from './types/annotations'
import type {
  AnnotationDocument,
  ExportMode,
  ToolId,
} from './types/annotations'

/**
 * ScreenshotTool app: load/capture, annotate, undo/redo, export.
 */
function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [history, setHistory] = useState<HistoryState>(() => createHistory())
  const [tool, setTool] = useState<ToolId>('select')
  const [exportMode, setExportMode] = useState<ExportMode>('download')
  const [status, setStatus] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  /** Document snapshot at the start of the current pointer gesture (for one undo step). */
  const baselineRef = useRef<AnnotationDocument>(EMPTY_DOCUMENT)

  const doc = history.present

  const loadImage = useCallback(async (source: Promise<HTMLImageElement>) => {
    setStatus(null)
    try {
      const img = await source
      setImage(img)
      setHistory(replacePresent(EMPTY_DOCUMENT))
      baselineRef.current = EMPTY_DOCUMENT
      setTool('select')
      setStatus(null)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not load image.'
      setStatus(message)
    }
  }, [])

  const onFileChosen = useCallback(
    (file: File) => {
      void loadImage(loadImageFromFile(file))
    },
    [loadImage],
  )

  const onCapture = useCallback(() => {
    void loadImage(captureDisplayFrame())
  }, [loadImage])

  const onClear = useCallback(() => {
    setImage(null)
    setHistory(replacePresent(EMPTY_DOCUMENT))
    baselineRef.current = EMPTY_DOCUMENT
    setStatus(null)
  }, [])

  const onDocumentLive = useCallback((next: AnnotationDocument) => {
    setHistory((h) => ({ ...h, present: next }))
  }, [])

  const onDocumentCommit = useCallback((next: AnnotationDocument) => {
    setHistory((h) => {
      const withBaseline = { ...h, present: baselineRef.current }
      const committed = commit(withBaseline, next)
      baselineRef.current = committed.present
      return committed
    })
  }, [])

  const onSelect = useCallback((id: string | null) => {
    setHistory((h) => {
      const next = setSelection(h, id)
      baselineRef.current = next.present
      return next
    })
  }, [])

  const handleUndo = useCallback(() => {
    setHistory((h) => {
      const next = undo(h)
      baselineRef.current = next.present
      return next
    })
  }, [])

  const handleRedo = useCallback(() => {
    setHistory((h) => {
      const next = redo(h)
      baselineRef.current = next.present
      return next
    })
  }, [])

  const handleExport = useCallback(async () => {
    if (!image) {
      return
    }
    setStatus(null)
    try {
      const blob = await renderExportBlob(image, doc)
      if (exportMode === 'download') {
        downloadPng(blob)
        setStatus('Downloaded PNG.')
      } else {
        await copyPngToClipboard(blob)
        setStatus('Copied image to clipboard.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed.'
      setStatus(message)
    }
  }, [image, doc, exportMode])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
        return
      }
      if (
        mod &&
        (e.key.toLowerCase() === 'y' ||
          (e.key.toLowerCase() === 'z' && e.shiftKey))
      ) {
        e.preventDefault()
        handleRedo()
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedId = baselineRef.current.selectedId
        if (selectedId == null) {
          return
        }
        e.preventDefault()
        setHistory((h) => {
          const id = h.present.selectedId
          if (id == null) {
            return h
          }
          const nextDoc = removeShape(h.present, id)
          const committed = commit(
            { ...h, present: baselineRef.current },
            nextDoc,
          )
          baselineRef.current = committed.present
          return committed
        })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleUndo, handleRedo])

  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDragOver(true)
  }
  const onDragLeave = (e: DragEvent) => {
    if (e.currentTarget === e.target) {
      setDragOver(false)
    }
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      onFileChosen(file)
    }
  }

  return (
    <div
      className={dragOver ? 'app-shell drag-over' : 'app-shell'}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header className="app-header">
        <div className="header-text">
          <h1>ScreenshotTool</h1>
          <p className="tagline">
            Load or capture a screenshot, annotate it, then export.
          </p>
        </div>
        <Toolbar
          tool={tool}
          onToolChange={setTool}
          exportMode={exportMode}
          onExportModeChange={setExportMode}
          canUndo={canUndo(history)}
          canRedo={canRedo(history)}
          canExport={image != null}
          hasImage={image != null}
          onOpenFile={() => fileInputRef.current?.click()}
          onCapture={onCapture}
          onClear={onClear}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onExport={() => void handleExport()}
          fileInputRef={fileInputRef}
          onFileChosen={onFileChosen}
        />
      </header>

      <main className="app-main">
        <AnnotationCanvas
          image={image}
          tool={tool}
          document={doc}
          onDocumentLive={onDocumentLive}
          onDocumentCommit={onDocumentCommit}
          onSelect={onSelect}
        />
      </main>

      {status ? (
        <div className="status-bar" role="status">
          {status}
        </div>
      ) : null}
    </div>
  )
}

export default App
