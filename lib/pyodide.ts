// Loads Pyodide (CPython compiled to WebAssembly) lazily from a CDN, once per
// browser session. There is no npm package pulled in on purpose — the runtime
// is ~10MB and only ever needed on the "code" exercise page.

const PYODIDE_VERSION = "0.26.4"
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

// Minimal shape of the Pyodide instance we actually use.
export interface PyodideInterface {
  runPythonAsync(code: string): Promise<unknown>
  setStdout(options: { batched: (text: string) => void }): void
  setStderr(options: { batched: (text: string) => void }): void
}

declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInterface>
  }
}

let pyodidePromise: Promise<PyodideInterface> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("Impossible de charger Pyodide.")))
      return
    }
    const script = document.createElement("script")
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Impossible de charger Pyodide."))
    document.head.appendChild(script)
  })
}

export function getPyodide(): Promise<PyodideInterface> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Pyodide n'est disponible que côté navigateur."))
  }
  if (!pyodidePromise) {
    pyodidePromise = loadScript(`${PYODIDE_CDN}pyodide.js`).then(() => {
      if (!window.loadPyodide) throw new Error("Pyodide n'a pas pu être initialisé.")
      return window.loadPyodide({ indexURL: PYODIDE_CDN })
    })
  }
  return pyodidePromise
}

export interface RunResult {
  output: string
  error: string | null
}

export async function runPython(code: string): Promise<RunResult> {
  const pyodide = await getPyodide()
  let output = ""
  let error: string | null = null

  pyodide.setStdout({ batched: (text: string) => { output += text + "\n" } })
  pyodide.setStderr({ batched: (text: string) => { error = (error ?? "") + text + "\n" } })

  try {
    await pyodide.runPythonAsync(code)
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  return { output: output.replace(/\n$/, ""), error: error ? (error as string).trim() : null }
}
