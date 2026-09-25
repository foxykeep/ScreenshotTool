import type { RefObject } from 'react'
import type { ToolId } from '../types/annotations'

type ToolbarProps = {
  tool: ToolId
  onToolChange: (tool: ToolId) => void
  canUndo: boolean
  canRedo: boolean
  canExport: boolean
  hasImage: boolean
  /** Clipboard success message; shown near Copy without shifting layout. */
  copyFeedback?: string | null
  onOpenFile: () => void
  onClear: () => void
  onUndo: () => void
  onRedo: () => void
  onDownload: () => void
  onCopy: () => void
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileChosen: (file: File) => void
}

const TOOLS: { id: ToolId; label: string; shortcut: string }[] = [
  { id: 'select', label: 'Select', shortcut: 'S' },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R' },
  { id: 'arrow', label: 'Arrow', shortcut: 'A' },
  { id: 'text', label: 'Text', shortcut: 'T' },
]

/**
 * Top toolbar: source actions, tools, undo/redo, and export buttons.
 */
export function Toolbar({
  tool,
  onToolChange,
  canUndo,
  canRedo,
  canExport,
  hasImage,
  copyFeedback = null,
  onOpenFile,
  onClear,
  onUndo,
  onRedo,
  onDownload,
  onCopy,
  fileInputRef,
  onFileChosen,
}: ToolbarProps) {
  const copyFeedbackVisible = copyFeedback != null && copyFeedback.length > 0

  return (
    <div className="toolbar" role="toolbar" aria-label="Screenshot tools">
      <div className="toolbar-group">
        <button
          type="button"
          className="btn"
          onClick={onOpenFile}
          title="Open image (O)"
        >
          Open…
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="visually-hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) {
              onFileChosen(file)
            }
          }}
        />
        <button
          type="button"
          className="btn"
          onClick={onClear}
          disabled={!hasImage}
          title="Clear image and annotations"
        >
          Clear
        </button>
      </div>

      <div
        className="toolbar-group tool-toggle"
        role="group"
        aria-label="Annotation tools"
      >
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tool === t.id ? 'btn btn-active' : 'btn'}
            aria-pressed={tool === t.id}
            title={`${t.label} (${t.shortcut})`}
            onClick={() => onToolChange(t.id)}
            disabled={!hasImage && t.id !== 'select'}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="toolbar-group">
        <button
          type="button"
          className="btn"
          onClick={onUndo}
          disabled={!canUndo}
        >
          Undo
        </button>
        <button
          type="button"
          className="btn"
          onClick={onRedo}
          disabled={!canRedo}
        >
          Redo
        </button>
      </div>

      <div className="toolbar-export">
        <div className="toolbar-group toolbar-export-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onDownload}
            disabled={!canExport}
            title="Download annotated PNG"
          >
            Download
          </button>
          <div className="export-copy-anchor">
            <span
              className={
                copyFeedbackVisible
                  ? 'export-feedback-float is-visible'
                  : 'export-feedback-float'
              }
              role="status"
              aria-live="polite"
              aria-hidden={!copyFeedbackVisible}
            >
              {copyFeedback ?? ''}
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onCopy}
              disabled={!canExport}
              title="Copy annotated image to clipboard"
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
