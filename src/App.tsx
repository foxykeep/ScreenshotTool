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
import { imageFileFromClipboardData, loadImageFromFile } from './lib/imageSource'
import { EMPTY_DOCUMENT } from './types/annotations'
import type {
  AnnotationDocument,
  ExportMode,
  ToolId,
} from './types/annotations'

const CLIPBOARD_COPIED_STATUS = 'Copied image to clipboard.'

/**
 * ScreenshotTool app: load image, annotate, undo/redo, export.
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
  const clipboardFeedback =
    status === CLIPBOARD_COPIED_STATUS ? status : null
  const statusBarMessage =
    status != null && status !== CLIPBOARD_COPIED_STATUS ? status : null

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

  const dismissStatus = useCallback(() => {
    setStatus(null)
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
        setStatus(CLIPBOARD_COPIED_STATUS)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed.'
      setStatus(message)
    }
  }, [image, doc, exportMode])

  const handleToolChange = useCallback(
    (next: ToolId) => {
      dismissStatus()
      setTool(next)
    },
    [dismissStatus],
  )

  const handleExportModeChange = useCallback(
    (next: ExportMode) => {
      dismissStatus()
      setExportMode(next)
    },
    [dismissStatus],
  )

  const handleOpenFile = useCallback(() => {
    dismissStatus()
    fileInputRef.current?.click()
  }, [dismissStatus])

  const handleClearClick = useCallback(() => {
    dismissStatus()
    onClear()
  }, [dismissStatus, onClear])

  const handleUndoClick = useCallback(() => {
    dismissStatus()
    handleUndo()
  }, [dismissStatus, handleUndo])

  const handleRedoClick = useCallback(() => {
    dismissStatus()
    handleRedo()
  }, [dismissStatus, handleRedo])

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      const file = imageFileFromClipboardData(e.clipboardData)
      if (!file) {
        return
      }
      e.preventDefault()
      onFileChosen(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [onFileChosen])

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
        handleUndoClick()
        return
      }
      if (
        mod &&
        (e.key.toLowerCase() === 'y' ||
          (e.key.toLowerCase() === 'z' && e.shiftKey))
      ) {
        e.preventDefault()
        handleRedoClick()
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedId = baselineRef.current.selectedId
        if (selectedId == null) {
          return
        }
        e.preventDefault()
        dismissStatus()
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
        return
      }

      if (mod || e.altKey) {
        return
      }

      const key = e.key.toLowerCase()
      if (key === 'o') {
        e.preventDefault()
        handleOpenFile()
        return
      }
      if (key === 's') {
        e.preventDefault()
        handleToolChange('select')
        return
      }
      if (key === 'r') {
        if (image == null) {
          return
        }
        e.preventDefault()
        handleToolChange('rectangle')
        return
      }
      if (key === 'a') {
        if (image == null) {
          return
        }
        e.preventDefault()
        handleToolChange('arrow')
        return
      }
      if (key === 't') {
        if (image == null) {
          return
        }
        e.preventDefault()
        handleToolChange('text')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    image,
    dismissStatus,
    handleUndoClick,
    handleRedoClick,
    handleOpenFile,
    handleToolChange,
  ])

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
            Load a screenshot, annotate it, then export.
          </p>
        </div>
        <Toolbar
          tool={tool}
          onToolChange={handleToolChange}
          exportMode={exportMode}
          onExportModeChange={handleExportModeChange}
          canUndo={canUndo(history)}
          canRedo={canRedo(history)}
          canExport={image != null}
          hasImage={image != null}
          exportFeedback={clipboardFeedback}
          onOpenFile={handleOpenFile}
          onClear={handleClearClick}
          onUndo={handleUndoClick}
          onRedo={handleRedoClick}
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

      {statusBarMessage ? (
        <div className="status-bar" role="status">
          {statusBarMessage}
        </div>
      ) : null}
    </div>
  )
}

export default App
