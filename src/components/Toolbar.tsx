import type { RefObject } from 'react'
import type { ExportMode, ToolId } from '../types/annotations'

type ToolbarProps = {
  tool: ToolId
  onToolChange: (tool: ToolId) => void
  exportMode: ExportMode
  onExportModeChange: (mode: ExportMode) => void
  canUndo: boolean
  canRedo: boolean
  canExport: boolean
  hasImage: boolean
  onOpenFile: () => void
  onCapture: () => void
  onClear: () => void
  onUndo: () => void
  onRedo: () => void
  onExport: () => void
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileChosen: (file: File) => void
}

const TOOLS: { id: ToolId; label: string }[] = [
  { id: 'select', label: 'Select' },
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'arrow', label: 'Arrow' },
  { id: 'text', label: 'Text' },
]

/**
 * Top toolbar: source actions, tools, undo/redo, and export switch.
 */
export function Toolbar({
  tool,
  onToolChange,
  exportMode,
  onExportModeChange,
  canUndo,
  canRedo,
  canExport,
  hasImage,
  onOpenFile,
  onCapture,
  onClear,
  onUndo,
  onRedo,
  onExport,
  fileInputRef,
  onFileChosen,
}: ToolbarProps) {
  return (
    <div className="toolbar" role="toolbar" aria-label="Screenshot tools">
      <div className="toolbar-group">
        <button type="button" className="btn" onClick={onOpenFile}>
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
        <button type="button" className="btn" onClick={onCapture}>
          Capture screen
        </button>
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

      <div className="toolbar-group toolbar-export">
        <div className="segmented" role="group" aria-label="Export mode">
          <button
            type="button"
            className={exportMode === 'download' ? 'btn btn-active' : 'btn'}
            aria-pressed={exportMode === 'download'}
            onClick={() => onExportModeChange('download')}
          >
            Download
          </button>
          <button
            type="button"
            className={exportMode === 'clipboard' ? 'btn btn-active' : 'btn'}
            aria-pressed={exportMode === 'clipboard'}
            onClick={() => onExportModeChange('clipboard')}
          >
            Copy
          </button>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onExport}
          disabled={!canExport}
        >
          {exportMode === 'download' ? 'Download PNG' : 'Copy image'}
        </button>
      </div>
    </div>
  )
}
