import './App.css'

/**
 * Minimal app shell for ScreenshotTool.
 * Canvas tools (load, capture, annotate, export) land in later slices.
 */
function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>ScreenshotTool</h1>
        <p className="tagline">
          Load or capture a screenshot, annotate it, then export.
        </p>
      </header>
      <main className="app-main">
        <div className="canvas-placeholder" role="status">
          Canvas workspace coming next — open an image or capture the screen
          once tools land.
        </div>
      </main>
    </div>
  )
}

export default App
