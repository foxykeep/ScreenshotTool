import type {
  Annotation,
  AnnotationDocument,
  AnnotationId,
} from '../types/annotations'
import { EMPTY_DOCUMENT } from '../types/annotations'

/** Snapshot-based undo/redo stack over immutable annotation documents. */
export type HistoryState = {
  readonly past: readonly AnnotationDocument[]
  readonly present: AnnotationDocument
  readonly future: readonly AnnotationDocument[]
}

const MAX_HISTORY = 100

/** Creates an empty history. */
export function createHistory(
  present: AnnotationDocument = EMPTY_DOCUMENT,
): HistoryState {
  return { past: [], present, future: [] }
}

/**
 * Commits a new present document, pushing the previous present onto past.
 * Clears redo stack. Skips no-op commits when present is referentially equal.
 */
export function commit(
  history: HistoryState,
  next: AnnotationDocument,
): HistoryState {
  if (next === history.present) {
    return history
  }
  const past = [...history.past, history.present]
  if (past.length > MAX_HISTORY) {
    past.shift()
  }
  return { past, present: next, future: [] }
}

/**
 * Updates selection without recording history (selection is ephemeral chrome).
 */
export function setSelection(
  history: HistoryState,
  selectedId: AnnotationId | null,
): HistoryState {
  if (history.present.selectedId === selectedId) {
    return history
  }
  return {
    ...history,
    present: { ...history.present, selectedId },
  }
}

/** Fresh history with the given present (used when loading/clearing the canvas). */
export function replacePresent(present: AnnotationDocument): HistoryState {
  return { past: [], present, future: [] }
}

/** Undoes to the previous snapshot, if any. */
export function undo(history: HistoryState): HistoryState {
  if (history.past.length === 0) {
    return history
  }
  const past = history.past.slice(0, -1)
  const present = history.past[history.past.length - 1]!
  const future = [history.present, ...history.future]
  return { past, present, future }
}

/** Redoes to the next snapshot, if any. */
export function redo(history: HistoryState): HistoryState {
  if (history.future.length === 0) {
    return history
  }
  const [next, ...rest] = history.future
  return {
    past: [...history.past, history.present],
    present: next!,
    future: rest,
  }
}

export function canUndo(history: HistoryState): boolean {
  return history.past.length > 0
}

export function canRedo(history: HistoryState): boolean {
  return history.future.length > 0
}

/** Returns a shape by id, or undefined. */
export function findShape(
  doc: AnnotationDocument,
  id: AnnotationId | null,
): Annotation | undefined {
  if (id == null) {
    return undefined
  }
  return doc.shapes.find((s) => s.id === id)
}

/** Immutable upsert: replace same id or append. */
export function upsertShape(
  doc: AnnotationDocument,
  shape: Annotation,
): AnnotationDocument {
  const index = doc.shapes.findIndex((s) => s.id === shape.id)
  if (index === -1) {
    return {
      shapes: [...doc.shapes, shape],
      selectedId: shape.id,
    }
  }
  const shapes = doc.shapes.slice()
  shapes[index] = shape
  return { shapes, selectedId: shape.id }
}

/** Removes a shape by id and clears selection if it was selected. */
export function removeShape(
  doc: AnnotationDocument,
  id: AnnotationId,
): AnnotationDocument {
  return {
    shapes: doc.shapes.filter((s) => s.id !== id),
    selectedId: doc.selectedId === id ? null : doc.selectedId,
  }
}
