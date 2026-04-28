import { ipcRenderer } from 'electron'
import { extractLabel, isPasswordField, getSelector, shouldRecordScroll } from './recorderCore'

interface RecordedAction {
  type: 'click' | 'input' | 'scroll' | 'navigate'
  selector?: string
  label?: string
  value?: string
  url?: string
  target?: string
  timestamp: number
}

function send(action: RecordedAction): void {
  ipcRenderer.sendToHost('recorder:action', action)
}

// --- Click ---
document.addEventListener('click', (e) => {
  const el = e.target as HTMLElement
  if (!el) return

  const label = extractLabel(el)
  const selector = getSelector(el)

  send({
    type: 'click',
    selector,
    label: label || undefined,
    timestamp: Date.now()
  })
}, true)

// --- Input (debounced 500ms) ---
const inputTimers = new Map<HTMLElement, ReturnType<typeof setTimeout>>()

document.addEventListener('input', (e) => {
  const el = e.target as HTMLInputElement
  if (!el) return

  const existing = inputTimers.get(el)
  if (existing) clearTimeout(existing)

  inputTimers.set(el, setTimeout(() => {
    inputTimers.delete(el)

    const label = extractLabel(el)
    const selector = getSelector(el)
    const value = isPasswordField(el) ? '[密码]' : el.value

    send({
      type: 'input',
      selector,
      label: label || undefined,
      value,
      timestamp: Date.now()
    })
  }, 500))
}, true)

// --- Scroll (filter < 100px) ---
let lastScrollY = window.scrollY

document.addEventListener('scroll', () => {
  const delta = Math.abs(window.scrollY - lastScrollY)
  if (!shouldRecordScroll(delta)) return

  lastScrollY = window.scrollY

  const target = window.scrollY < 100
    ? '页面顶部'
    : document.documentElement.scrollHeight - window.scrollY - window.innerHeight < 100
      ? '页面底部'
      : `Y=${Math.round(window.scrollY)}`

  send({
    type: 'scroll',
    target,
    timestamp: Date.now()
  })
}, { passive: true })

// --- Navigation (popstate + pushState/replaceState monkey-patch) ---
function onNavigate(): void {
  send({
    type: 'navigate',
    url: window.location.href,
    timestamp: Date.now()
  })
}

window.addEventListener('popstate', onNavigate)
window.addEventListener('hashchange', onNavigate)

// Monkey-patch pushState/replaceState for SPA frameworks
const originalPushState = history.pushState.bind(history)
const originalReplaceState = history.replaceState.bind(history)

history.pushState = function (...args: Parameters<typeof history.pushState>) {
  originalPushState(...args)
  onNavigate()
}

history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
  originalReplaceState(...args)
  onNavigate()
}

// Send initial navigation
onNavigate()
