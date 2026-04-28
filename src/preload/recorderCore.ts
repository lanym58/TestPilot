import type { ActionRecord } from '../main/types'

const LABEL_MAX_LENGTH = 20

export function extractLabel(el: HTMLElement): string {
  // Priority: aria-label > data-testid > label[for] > placeholder > innerText (truncated)
  const ariaLabel = el.getAttribute('aria-label')
  if (ariaLabel) return ariaLabel

  const testId = el.getAttribute('data-testid')
  if (testId) return testId

  // Associated <label for="id">
  const id = el.getAttribute('id')
  if (id) {
    const doc = (el as { ownerDocument?: Document }).ownerDocument ?? document
    const escapedId = id.replace(/"/g, '\\"')
    const label = doc.querySelector(`label[for="${escapedId}"]`)
    if (label?.textContent) return label.textContent.trim()
  }

  const placeholder = el.getAttribute('placeholder')
  if (placeholder) return placeholder

  const text = el.innerText?.trim() ?? ''
  if (text.length > LABEL_MAX_LENGTH) {
    return text.slice(0, LABEL_MAX_LENGTH)
  }
  return text
}

export function isPasswordField(el: HTMLElement): boolean {
  return el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'password'
}

export function getSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`

  const tag = el.tagName.toLowerCase()
  const className = (el.className ?? '').toString().trim()
  if (className) {
    const classes = className.split(/\s+/).join('.')
    return `${tag}.${classes}`
  }

  return tag
}

export function createActionFromEvent(
  type: ActionRecord['type'],
  el: HTMLElement,
  extra?: { value?: string; url?: string; description?: string; target?: string }
): Omit<ActionRecord, 'seq'> {
  if (type === 'navigate') {
    return { type, url: extra?.url }
  }

  if (type === 'observe') {
    return { type, description: extra?.description }
  }

  if (type === 'scroll') {
    return { type, target: extra?.target }
  }

  const label = extractLabel(el)
  const selector = getSelector(el)

  if (type === 'input') {
    const value = isPasswordField(el) ? '[密码]' : (extra?.value ?? '')
    return { type, selector, label: label || undefined, value }
  }

  // click
  return { type, selector, label: label || undefined }
}

export function shouldRecordScroll(deltaPixels: number): boolean {
  return deltaPixels >= 100
}
