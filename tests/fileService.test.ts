import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  initWorkspace,
  readJson,
  writeJson,
  listFiles,
  importPlan,
  readPlanState,
  writePlanState,
  listBugs,
  readBug,
  writeBug,
  nextBugId,
  writeScreenshot,
  writeTestResult,
  readTestResult,
  writeFix,
  getWorkspaceConfig
} from '../src/main/fileService'

let workspace: string

beforeEach(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'testpilot-test-'))
})

afterEach(() => {
  fs.rmSync(workspace, { recursive: true, force: true })
})

describe('initWorkspace', () => {
  it('should create workspace subdirectories and config', () => {
    initWorkspace(workspace, 'Test Project')

    expect(fs.existsSync(path.join(workspace, '.testpilot', 'config.json'))).toBe(true)
    expect(fs.existsSync(path.join(workspace, 'plans'))).toBe(true)
    expect(fs.existsSync(path.join(workspace, 'bugs'))).toBe(true)
    expect(fs.existsSync(path.join(workspace, 'screenshots'))).toBe(true)
    expect(fs.existsSync(path.join(workspace, 'fixes'))).toBe(true)
    expect(fs.existsSync(path.join(workspace, 'results'))).toBe(true)
    expect(fs.existsSync(path.join(workspace, 'auto-tests'))).toBe(true)
    expect(fs.existsSync(path.join(workspace, 'WORKSPACE_CLAUDE.md'))).toBe(true)

    const config = JSON.parse(
      fs.readFileSync(path.join(workspace, '.testpilot', 'config.json'), 'utf-8')
    )
    expect(config.name).toBe('Test Project')
    expect(config.version).toBe('1.0.0')
  })

  it('should not overwrite existing config', () => {
    initWorkspace(workspace, 'First')
    initWorkspace(workspace, 'Second')

    const config = JSON.parse(
      fs.readFileSync(path.join(workspace, '.testpilot', 'config.json'), 'utf-8')
    )
    expect(config.name).toBe('First')
  })
})

describe('readJson / writeJson', () => {
  it('should write and read JSON atomically', () => {
    initWorkspace(workspace, 'Test')
    const filePath = path.join(workspace, 'bugs', 'test.json')
    const data = { id: '1', name: 'test bug' }

    writeJson(filePath, data)
    const result = readJson(filePath)

    expect(result).toEqual(data)
  })

  it('should return null for non-existent file', () => {
    const result = readJson(path.join(workspace, 'nonexistent.json'))
    expect(result).toBeNull()
  })
})

describe('importPlan', () => {
  it('should copy MD file and create state JSON', () => {
    initWorkspace(workspace, 'Test')
    const mdContent = `# 测试计划

## 认证与登录

| # | 功能项 | 功能描述/测试要点 | 通过 |
|---|--------|-------------------|------|
| 1.1 | 用户名密码登录 | 输入用户名和密码完成身份认证 | |
| 1.2 | 退出登录 | 点击退出按钮清除会话 | |

## 用户管理

| # | 功能项 | 功能描述/测试要点 | 通过 |
|---|--------|-------------------|------|
| 2.1 | 用户列表 | 查看所有用户列表 | |
`
    const mdPath = path.join(os.tmpdir(), 'test-plan.md')
    fs.writeFileSync(mdPath, mdContent)

    const state = importPlan(workspace, mdPath, '测试计划')

    expect(fs.existsSync(path.join(workspace, 'plans', `${state.planId}.md`))).toBe(true)
    expect(state.name).toBe('测试计划')
    expect(state.modules).toHaveLength(2)
    expect(state.modules[0].name).toBe('认证与登录')
    expect(state.modules[0].items).toHaveLength(2)
    expect(state.modules[0].items[0].id).toBe('1.1')
    expect(state.modules[0].items[0].feature).toBe('用户名密码登录')
    expect(state.modules[1].name).toBe('用户管理')
    expect(state.modules[1].items[0].id).toBe('2.1')

    fs.unlinkSync(mdPath)
  })
})

describe('bug CRUD', () => {
  it('should write, list, and read bugs', () => {
    initWorkspace(workspace, 'Test')

    const bug = {
      id: 'BUG-0001',
      title: '空密码提交无校验',
      description: '提交空密码时无表单验证提示',
      severity: 'high' as const,
      status: 'open' as const,
      planId: 'plan-001',
      itemId: '1.1',
      stepsText: '1. 打开登录页\n2. 密码留空\n3. 点击登录',
      actions: [],
      screenshots: [],
      createdAt: '2026-04-28T14:00:00Z',
      updatedAt: '2026-04-28T14:00:00Z'
    }

    writeBug(workspace, bug)
    const bugs = listBugs(workspace)
    expect(bugs).toHaveLength(1)
    expect(bugs[0]).toBe('BUG-0001')

    const read = readBug(workspace, 'BUG-0001')
    expect(read).toEqual(bug)
  })

  it('should generate incremental bug IDs', () => {
    initWorkspace(workspace, 'Test')
    expect(nextBugId(workspace)).toBe('BUG-0001')

    writeBug(workspace, {
      id: 'BUG-0001',
      title: 'test',
      description: '',
      severity: 'low',
      status: 'open',
      planId: '',
      itemId: '',
      stepsText: '',
      actions: [],
      screenshots: [],
      createdAt: '',
      updatedAt: ''
    })

    expect(nextBugId(workspace)).toBe('BUG-0002')
  })
})

describe('screenshot', () => {
  it('should write PNG buffer to screenshots dir', () => {
    initWorkspace(workspace, 'Test')
    const buffer = Buffer.from('fake-png-data')
    const filename = writeScreenshot(workspace, 'BUG-0001', 1, buffer)

    expect(filename).toBe('BUG-0001-1.png')
    expect(
      fs.existsSync(path.join(workspace, 'screenshots', 'BUG-0001-1.png'))
    ).toBe(true)
  })
})

describe('test result', () => {
  it('should write and read test results', () => {
    initWorkspace(workspace, 'Test')
    const result = {
      planId: 'plan-001',
      itemId: '1.1',
      passed: true,
      testType: 'manual' as const,
      testedAt: '2026-04-28T14:00:00Z',
      actions: [],
      notes: '',
      bugId: null
    }

    writeTestResult(workspace, result)
    const read = readTestResult(workspace, 'plan-001', '1.1')
    expect(read).toEqual(result)
  })
})

describe('fix record', () => {
  it('should write fix record', () => {
    initWorkspace(workspace, 'Test')
    const fix = {
      id: 'FIX-0001',
      bugId: 'BUG-0001',
      changedFiles: [{ file: 'src/login.vue', description: '添加校验' }],
      result: 'fixed' as const,
      notes: '',
      regressionTested: false,
      author: 'claudecode',
      createdAt: '2026-04-28T15:00:00Z'
    }

    writeFix(workspace, fix)
    const filePath = path.join(workspace, 'fixes', 'FIX-0001.json')
    expect(fs.existsSync(filePath)).toBe(true)
    expect(JSON.parse(fs.readFileSync(filePath, 'utf-8'))).toEqual(fix)
  })
})

describe('getWorkspaceConfig', () => {
  it('should return config for initialized workspace', () => {
    initWorkspace(workspace, 'My Project')
    const config = getWorkspaceConfig(workspace)
    expect(config?.name).toBe('My Project')
  })

  it('should return null for non-workspace dir', () => {
    expect(getWorkspaceConfig(workspace)).toBeNull()
  })
})
