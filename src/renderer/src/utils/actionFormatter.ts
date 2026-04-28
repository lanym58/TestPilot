import type { ActionRecord } from '../../../main/types'

export function formatAction(action: ActionRecord): string {
  const prefix = `${action.seq}. `

  switch (action.type) {
    case 'navigate':
      return `${prefix}打开 ${action.url ?? ''}`

    case 'click':
      return action.label
        ? `${prefix}点击【${action.label}】`
        : `${prefix}点击 ${action.selector ?? ''}`

    case 'input': {
      const target = action.label ? `【${action.label}】` : `${action.selector ?? ''}`
      const sep = action.label ? '' : ' '
      if (action.value === '' || action.value === undefined) {
        return action.label
          ? `${prefix}${target}留空`
          : `${prefix}${target} 留空`
      }
      return `${prefix}在${sep}${target}${sep}输入 "${action.value}"`
    }

    case 'scroll':
      return `${prefix}滚动至 ${action.target ?? ''}`

    case 'observe':
      return `${prefix}观察：${action.description ?? ''}`

    default:
      return `${prefix}${action.type}`
  }
}

export function formatActions(actions: ReadonlyArray<ActionRecord>): string {
  if (actions.length === 0) return ''

  const lines = actions.map(formatAction)
  return `复现步骤：\n${lines.join('\n')}`
}
