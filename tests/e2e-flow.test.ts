/**
 * E2E 流程测试 — 模拟完整用户操作链路
 *
 * 1. 打开工作空间
 * 2. 导入 MD 测试计划
 * 3. 开始测试（模拟操作录制）
 * 4. 标记通过
 * 5. 标记不通过 → 创建 Bug
 * 6. 查看 Bug 列表
 * 7. 查看 Bug 详情
 * 8. Bug 状态流转
 * 9. 创建修复记录
 * 10. 验证工作空间文件完整性
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  initWorkspace,
  getWorkspaceConfig,
  importPlan,
  readPlanState,
  writePlanState,
  listPlans,
  listBugs,
  readBug,
  writeBug,
  createBugAtomic,
  nextBugId,
  writeTestResult,
  readTestResult,
  writeFix,
  listFixes,
  writeScreenshot
} from '../src/main/fileService'
import { formatActions } from '../src/renderer/src/utils/actionFormatter'
import type { ActionRecord, BugRecord, TestResult, FixRecord } from '../src/main/types'

let workspace: string
let mdPath: string

beforeAll(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'testpilot-e2e-'))
  mdPath = path.join(workspace, 'test-plan.md')
  fs.writeFileSync(mdPath, `# 示例系统测试计划

## 认证与登录

| # | 功能项 | 功能描述/测试要点 | 通过 |
|---|--------|-------------------|------|
| 1.1 | 用户名密码登录 | 输入用户名和密码完成身份认证 | |
| 1.2 | 退出登录 | 点击退出按钮清除会话 | |

## 用户管理

| # | 功能项 | 功能描述/测试要点 | 通过 |
|---|--------|-------------------|------|
| 2.1 | 用户列表 | 查看所有用户列表并支持搜索 | |
| 2.2 | 新增用户 | 填写表单创建新用户账号 | |
`)
})

afterAll(() => {
  fs.rmSync(workspace, { recursive: true, force: true })
})

describe('E2E: 完整测试管理流程', () => {
  let planId: string

  it('Step 1: 初始化工作空间', () => {
    initWorkspace(workspace, 'E2E 测试项目')

    const config = getWorkspaceConfig(workspace)
    expect(config).not.toBeNull()
    expect(config!.name).toBe('E2E 测试项目')
    expect(config!.version).toBe('1.0.0')

    // 验证目录结构
    for (const dir of ['plans', 'bugs', 'screenshots', 'fixes', 'results', 'auto-tests']) {
      expect(fs.existsSync(path.join(workspace, dir))).toBe(true)
    }
    expect(fs.existsSync(path.join(workspace, 'WORKSPACE_CLAUDE.md'))).toBe(true)
    expect(fs.existsSync(path.join(workspace, '.testpilot', 'config.json'))).toBe(true)
  })

  it('Step 2: 导入 Markdown 测试计划', () => {
    const state = importPlan(workspace, mdPath, '示例系统测试计划')
    planId = state.planId

    expect(state.name).toBe('示例系统测试计划')
    expect(state.modules).toHaveLength(2)
    expect(state.modules[0].name).toBe('认证与登录')
    expect(state.modules[0].items).toHaveLength(2)
    expect(state.modules[1].name).toBe('用户管理')
    expect(state.modules[1].items).toHaveLength(2)

    // 验证 MD 原始文件已复制
    expect(fs.existsSync(path.join(workspace, 'plans', `${planId}.md`))).toBe(true)
    // 验证 state JSON 已保存
    expect(fs.existsSync(path.join(workspace, 'plans', `${planId}.state.json`))).toBe(true)

    // 验证 listPlans 能找到
    const plans = listPlans(workspace)
    expect(plans).toContain(planId)
  })

  it('Step 3: 模拟测试会话 — 功能项 1.1 通过', () => {
    // 模拟操作录制
    const actions: ActionRecord[] = [
      { seq: 1, type: 'navigate', url: 'http://localhost:3000/login' },
      { seq: 2, type: 'input', selector: '#username', label: '用户名', value: 'admin' },
      { seq: 3, type: 'input', selector: '#password', label: '密码', value: '[密码]' },
      { seq: 4, type: 'click', selector: '.login-btn', label: '登录' }
    ]

    // 验证 actionFormatter 生成中文步骤
    const stepsText = formatActions(actions)
    expect(stepsText).toContain('打开 http://localhost:3000/login')
    expect(stepsText).toContain('在【用户名】输入 "admin"')
    expect(stepsText).toContain('在【密码】输入 "[密码]"')
    expect(stepsText).toContain('点击【登录】')

    // 保存测试结果（通过）
    const result: TestResult = {
      planId,
      itemId: '1.1',
      passed: true,
      testType: 'manual',
      testedAt: new Date().toISOString(),
      actions,
      notes: '登录成功',
      bugId: null
    }
    writeTestResult(workspace, result)

    // 更新计划状态
    const state = readPlanState(workspace, planId)!
    const updated = {
      ...state,
      modules: state.modules.map((m) => ({
        ...m,
        items: m.items.map((item) =>
          item.id === '1.1' ? { ...item, passed: true, testedAt: result.testedAt } : item
        )
      }))
    }
    writePlanState(workspace, updated)

    // 验证结果已保存
    const savedResult = readTestResult(workspace, planId, '1.1')
    expect(savedResult).not.toBeNull()
    expect(savedResult!.passed).toBe(true)

    // 验证计划状态已更新
    const savedState = readPlanState(workspace, planId)!
    const item11 = savedState.modules[0].items[0]
    expect(item11.passed).toBe(true)
  })

  it('Step 4: 模拟测试会话 — 功能项 1.2 不通过 → 创建 Bug', () => {
    const actions: ActionRecord[] = [
      { seq: 1, type: 'navigate', url: 'http://localhost:3000/dashboard' },
      { seq: 2, type: 'click', selector: '.logout-btn', label: '退出' },
      { seq: 3, type: 'observe', description: '页面未跳转到登录页，仍停留在 dashboard' }
    ]

    const stepsText = formatActions(actions)

    // 原子创建 Bug（防止竞态）
    const bug = createBugAtomic(workspace, {
      title: '[1.2] 退出登录后页面未跳转',
      description: '点击退出按钮后页面无响应，未清除会话',
      severity: 'high',
      status: 'open',
      planId,
      itemId: '1.2',
      stepsText,
      actions,
      screenshots: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    expect(bug.id).toBe('BUG-0001')
    expect(bug.title).toBe('[1.2] 退出登录后页面未跳转')

    // 保存测试结果（不通过）
    const result: TestResult = {
      planId,
      itemId: '1.2',
      passed: false,
      testType: 'manual',
      testedAt: new Date().toISOString(),
      actions,
      notes: `Bug: ${bug.id}`,
      bugId: bug.id
    }
    writeTestResult(workspace, result)

    // 更新计划状态
    const state = readPlanState(workspace, planId)!
    const updated = {
      ...state,
      modules: state.modules.map((m) => ({
        ...m,
        items: m.items.map((item) =>
          item.id === '1.2' ? { ...item, passed: false, testedAt: result.testedAt, bugId: bug.id } : item
        )
      }))
    }
    writePlanState(workspace, updated)
  })

  it('Step 5: 截图保存', () => {
    const buffer = Buffer.from('fake-png-screenshot-data')
    const filename = writeScreenshot(workspace, 'BUG-0001', 1, buffer)
    expect(filename).toBe('BUG-0001-1.png')
    expect(fs.existsSync(path.join(workspace, 'screenshots', 'BUG-0001-1.png'))).toBe(true)

    // 更新 Bug 的 screenshots
    const bug = readBug(workspace, 'BUG-0001')!
    writeBug(workspace, { ...bug, screenshots: [filename], updatedAt: new Date().toISOString() })
  })

  it('Step 6: Bug 列表查询 + 筛选', () => {
    const bugs = listBugs(workspace)
    expect(bugs).toHaveLength(1)
    expect(bugs[0]).toBe('BUG-0001')

    const bug = readBug(workspace, 'BUG-0001')!
    expect(bug.severity).toBe('high')
    expect(bug.status).toBe('open')
    expect(bug.screenshots).toContain('BUG-0001-1.png')
  })

  it('Step 7: Bug 状态流转 open → fixing → fixed', () => {
    let bug = readBug(workspace, 'BUG-0001')!

    // open → fixing
    writeBug(workspace, { ...bug, status: 'fixing', updatedAt: new Date().toISOString() })
    bug = readBug(workspace, 'BUG-0001')!
    expect(bug.status).toBe('fixing')

    // fixing → fixed
    writeBug(workspace, { ...bug, status: 'fixed', updatedAt: new Date().toISOString() })
    bug = readBug(workspace, 'BUG-0001')!
    expect(bug.status).toBe('fixed')
  })

  it('Step 8: 创建修复记录', () => {
    const fix: FixRecord = {
      id: 'FIX-0001',
      bugId: 'BUG-0001',
      changedFiles: [
        { file: 'src/views/dashboard.vue', description: '修复退出按钮事件绑定' },
        { file: 'src/stores/auth.ts', description: '添加会话清除逻辑' }
      ],
      result: 'fixed',
      notes: '修复了退出登录功能',
      regressionTested: false,
      author: 'claudecode',
      createdAt: new Date().toISOString()
    }
    writeFix(workspace, fix)

    const fixes = listFixes(workspace)
    expect(fixes).toHaveLength(1)
    expect(fixes[0]).toBe('FIX-0001')
  })

  it('Step 9: 再创建一个 Bug — 验证 ID 递增', () => {
    const bug2 = createBugAtomic(workspace, {
      title: '[2.1] 用户列表加载失败',
      description: '打开用户列表页面时显示空白',
      severity: 'medium',
      status: 'open',
      planId,
      itemId: '2.1',
      stepsText: '',
      actions: [],
      screenshots: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    expect(bug2.id).toBe('BUG-0002')

    const allBugs = listBugs(workspace)
    expect(allBugs).toHaveLength(2)
  })

  it('Step 10: 验证工作空间文件完整性', () => {
    // Plans
    const plans = listPlans(workspace)
    expect(plans).toHaveLength(1)

    const state = readPlanState(workspace, planId)!
    const item11 = state.modules[0].items[0]
    const item12 = state.modules[0].items[1]
    expect(item11.passed).toBe(true)
    expect(item12.passed).toBe(false)
    expect(item12.bugId).toBe('BUG-0001')

    // Test results
    const result11 = readTestResult(workspace, planId, '1.1')
    expect(result11!.passed).toBe(true)
    const result12 = readTestResult(workspace, planId, '1.2')
    expect(result12!.passed).toBe(false)
    expect(result12!.bugId).toBe('BUG-0001')

    // Bugs
    const bugs = listBugs(workspace)
    expect(bugs).toEqual(['BUG-0001', 'BUG-0002'])

    const bug1 = readBug(workspace, 'BUG-0001')!
    expect(bug1.status).toBe('fixed')
    expect(bug1.screenshots).toHaveLength(1)

    // Fixes
    const fixes = listFixes(workspace)
    expect(fixes).toEqual(['FIX-0001'])

    // Screenshots
    expect(fs.existsSync(path.join(workspace, 'screenshots', 'BUG-0001-1.png'))).toBe(true)

    // Workspace files
    expect(fs.existsSync(path.join(workspace, 'WORKSPACE_CLAUDE.md'))).toBe(true)
    expect(fs.existsSync(path.join(workspace, '.testpilot', 'config.json'))).toBe(true)
  })
})
