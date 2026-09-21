/** Creates a reasonably unique annotation id. */
export function createAnnotationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `ann-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}
