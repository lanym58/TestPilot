import { describe, it, expect } from 'vitest'
import { parsePlanMarkdown } from '../src/main/fileService'

describe('parsePlanMarkdown edge cases', () => {
  it('should return empty array for content without ## headers', () => {
    const result = parsePlanMarkdown('# Title\n\nSome text without modules')
    expect(result).toEqual([])
  })

  it('should return empty items for module without table', () => {
    const result = parsePlanMarkdown('## 空模块\n\n没有表格内容\n')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('空模块')
    expect(result[0].items).toHaveLength(0)
  })

  it('should skip table header and separator rows', () => {
    const md = `## 模块A

| # | 功能项 | 功能描述 | 通过 |
|---|--------|----------|------|
| 1.1 | 登录 | 用户登录 | |
`
    const result = parsePlanMarkdown(md)
    expect(result[0].items).toHaveLength(1)
    expect(result[0].items[0].feature).toBe('登录')
  })

  it('should handle 5-column table (description + testPoints separate)', () => {
    const md = `## 测试

| # | 功能项 | 功能描述 | 测试要点 | 通过 |
|---|--------|----------|----------|------|
| 1.1 | 登录 | 身份认证 | 正确密码能登录 | |
`
    const result = parsePlanMarkdown(md)
    expect(result[0].items[0].description).toBe('身份认证')
    // 4th capture group should be testPoints
    expect(result[0].items[0].testPoints).toBe('正确密码能登录')
  })

  it('should handle multiple modules', () => {
    const md = `## 模块A

| # | 功能项 | 描述 | 通过 |
|---|--------|------|------|
| 1.1 | A1 | descA1 | |

## 模块B

| # | 功能项 | 描述 | 通过 |
|---|--------|------|------|
| 2.1 | B1 | descB1 | |
| 2.2 | B2 | descB2 | |
`
    const result = parsePlanMarkdown(md)
    expect(result).toHaveLength(2)
    expect(result[0].items).toHaveLength(1)
    expect(result[1].items).toHaveLength(2)
    expect(result[1].id).toBe('m2')
  })

  it('should handle special characters in feature names', () => {
    const md = `## 特殊字符

| # | 功能项 | 描述 | 通过 |
|---|--------|------|------|
| 1.1 | 用户"登录" & 注册 | 包含特殊字符 | |
`
    const result = parsePlanMarkdown(md)
    expect(result[0].items[0].feature).toBe('用户"登录" & 注册')
  })

  it('should handle empty content', () => {
    expect(parsePlanMarkdown('')).toEqual([])
  })

  it('should set default values for test items', () => {
    const md = `## M

| # | 功能项 | 描述 | 通过 |
|---|--------|------|------|
| 1.1 | F | D | |
`
    const item = parsePlanMarkdown(md)[0].items[0]
    expect(item.passed).toBeNull()
    expect(item.testType).toBe('manual')
    expect(item.testedAt).toBeNull()
    expect(item.notes).toBe('')
    expect(item.bugId).toBeNull()
  })
})
