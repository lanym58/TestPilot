import { describe, it, expect } from 'vitest'
import { formatAction, formatActions } from '../src/renderer/src/utils/actionFormatter'
import type { ActionRecord } from '../src/main/types'

describe('formatAction', () => {
  it('should format navigate action', () => {
    const action: ActionRecord = { seq: 1, type: 'navigate', url: 'http://localhost:3000/login' }
    expect(formatAction(action)).toBe('1. 打开 http://localhost:3000/login')
  })

  it('should format click action with label', () => {
    const action: ActionRecord = { seq: 2, type: 'click', selector: '.btn', label: '登录' }
    expect(formatAction(action)).toBe('2. 点击【登录】')
  })

  it('should format click action without label — use selector', () => {
    const action: ActionRecord = { seq: 2, type: 'click', selector: '.submit-btn' }
    expect(formatAction(action)).toBe('2. 点击 .submit-btn')
  })

  it('should format input action with value', () => {
    const action: ActionRecord = { seq: 3, type: 'input', selector: '#username', label: '用户名', value: 'admin' }
    expect(formatAction(action)).toBe('3. 在【用户名】输入 "admin"')
  })

  it('should format input action with empty value', () => {
    const action: ActionRecord = { seq: 3, type: 'input', selector: '#password', label: '密码', value: '' }
    expect(formatAction(action)).toBe('3. 【密码】留空')
  })

  it('should format input action without label', () => {
    const action: ActionRecord = { seq: 3, type: 'input', selector: '#email', value: 'test@example.com' }
    expect(formatAction(action)).toBe('3. 在 #email 输入 "test@example.com"')
  })

  it('should format scroll action', () => {
    const action: ActionRecord = { seq: 4, type: 'scroll', target: '页面底部' }
    expect(formatAction(action)).toBe('4. 滚动至 页面底部')
  })

  it('should format observe action', () => {
    const action: ActionRecord = { seq: 5, type: 'observe', description: '页面无响应，无错误提示' }
    expect(formatAction(action)).toBe('5. 观察：页面无响应，无错误提示')
  })

  it('should format password input as masked', () => {
    const action: ActionRecord = { seq: 3, type: 'input', selector: '#password', label: '密码', value: '[密码]' }
    expect(formatAction(action)).toBe('3. 在【密码】输入 "[密码]"')
  })
})

describe('formatActions', () => {
  it('should format multiple actions into numbered text', () => {
    const actions: ActionRecord[] = [
      { seq: 1, type: 'navigate', url: 'http://localhost:3000/login' },
      { seq: 2, type: 'input', selector: '#username', label: '用户名', value: 'admin' },
      { seq: 3, type: 'input', selector: '#password', label: '密码', value: '' },
      { seq: 4, type: 'click', selector: '.login-btn', label: '登录' },
      { seq: 5, type: 'observe', description: '页面无响应' }
    ]

    const result = formatActions(actions)
    expect(result).toBe(
      '复现步骤：\n' +
      '1. 打开 http://localhost:3000/login\n' +
      '2. 在【用户名】输入 "admin"\n' +
      '3. 【密码】留空\n' +
      '4. 点击【登录】\n' +
      '5. 观察：页面无响应'
    )
  })

  it('should return empty string for empty actions', () => {
    expect(formatActions([])).toBe('')
  })
})
