import { describe, it, expect } from 'vitest'
import { extractLabel, isPasswordField, createActionFromEvent, shouldRecordScroll } from '../src/preload/recorderCore'

// Mock minimal DOM element
function mockElement(overrides: Record<string, unknown> = {}): HTMLElement {
  return {
    tagName: 'INPUT',
    getAttribute: (name: string) => (overrides as Record<string, string>)[`attr:${name}`] ?? null,
    closest: () => null,
    innerText: '',
    type: '',
    ...overrides
  } as unknown as HTMLElement
}

function mockLabel(text: string, forId: string): HTMLLabelElement {
  return {
    tagName: 'LABEL',
    textContent: text,
    getAttribute: (name: string) => name === 'for' ? forId : null
  } as unknown as HTMLLabelElement
}

describe('extractLabel', () => {
  it('should prefer aria-label', () => {
    const el = mockElement({ 'attr:aria-label': '用户名' })
    expect(extractLabel(el)).toBe('用户名')
  })

  it('should use data-testid as fallback', () => {
    const el = mockElement({ 'attr:data-testid': 'username-input' })
    expect(extractLabel(el)).toBe('username-input')
  })

  it('should use placeholder as fallback', () => {
    const el = mockElement({ 'attr:placeholder': '请输入用户名' })
    expect(extractLabel(el)).toBe('请输入用户名')
  })

  it('should use innerText truncated to 20 chars', () => {
    const el = mockElement({
      innerText: '这是一段非常长的按钮文字，超过二十个字符应该被截断'
    })
    expect(extractLabel(el)).toBe('这是一段非常长的按钮文字，超过二十个字符')
  })

  it('should return empty string when no identifiers found', () => {
    const el = mockElement({ innerText: '' })
    expect(extractLabel(el)).toBe('')
  })

  it('should use associated label element', () => {
    const el = mockElement({
      'attr:id': 'username',
      ownerDocument: {
        querySelector: (sel: string) => {
          if (sel === 'label[for="username"]') {
            return mockLabel('用户名', 'username')
          }
          return null
        }
      }
    })
    expect(extractLabel(el)).toBe('用户名')
  })
})

describe('isPasswordField', () => {
  it('should detect password input', () => {
    const el = mockElement({ type: 'password', tagName: 'INPUT' })
    expect(isPasswordField(el)).toBe(true)
  })

  it('should return false for text input', () => {
    const el = mockElement({ type: 'text', tagName: 'INPUT' })
    expect(isPasswordField(el)).toBe(false)
  })

  it('should return false for non-input element', () => {
    const el = mockElement({ tagName: 'DIV' })
    expect(isPasswordField(el)).toBe(false)
  })
})

describe('createActionFromEvent', () => {
  it('should create click action', () => {
    const el = mockElement({ 'attr:aria-label': '登录' })
    const action = createActionFromEvent('click', el)
    expect(action.type).toBe('click')
    expect(action.label).toBe('登录')
  })

  it('should create input action with value', () => {
    const el = mockElement({
      'attr:aria-label': '用户名',
      tagName: 'INPUT',
      type: 'text',
      value: 'admin'
    })
    const action = createActionFromEvent('input', el, { value: 'admin' })
    expect(action.type).toBe('input')
    expect(action.label).toBe('用户名')
    expect(action.value).toBe('admin')
  })

  it('should mask password value', () => {
    const el = mockElement({
      'attr:aria-label': '密码',
      tagName: 'INPUT',
      type: 'password',
      value: 'secret123'
    })
    const action = createActionFromEvent('input', el, { value: 'secret123' })
    expect(action.value).toBe('[密码]')
  })

  it('should create navigate action', () => {
    const action = createActionFromEvent('navigate', null as unknown as HTMLElement, { url: 'http://localhost:3000' })
    expect(action.type).toBe('navigate')
    expect(action.url).toBe('http://localhost:3000')
  })

  it('should include CSS selector', () => {
    const el = mockElement({
      'attr:data-testid': 'submit-btn',
      tagName: 'BUTTON',
      id: 'submitBtn'
    })
    const action = createActionFromEvent('click', el)
    expect(action.selector).toBe('#submitBtn')
  })

  it('should fallback to tag+class selector when no id', () => {
    const el = mockElement({
      tagName: 'BUTTON',
      className: 'btn primary',
      id: ''
    })
    const action = createActionFromEvent('click', el)
    expect(action.selector).toBe('button.btn.primary')
  })
})

describe('shouldRecordScroll', () => {
  it('should record scroll >= 100px', () => {
    expect(shouldRecordScroll(150)).toBe(true)
  })

  it('should filter scroll < 100px', () => {
    expect(shouldRecordScroll(50)).toBe(false)
  })

  it('should record exactly 100px', () => {
    expect(shouldRecordScroll(100)).toBe(true)
  })
})
