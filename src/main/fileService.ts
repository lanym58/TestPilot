import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { PlanState, BugRecord, FixRecord, TestResult, WorkspaceConfig, TestModule } from './types'

const WORKSPACE_DIRS = ['plans', 'bugs', 'screenshots', 'fixes', 'results', 'auto-tests']
const SAFE_NAME_RE = /^[a-zA-Z0-9._\-\u4e00-\u9fff]+$/

export function assertSafeName(name: string): void {
  if (!SAFE_NAME_RE.test(name)) {
    throw new Error(`不安全的名称: ${name}`)
  }
}

export function assertInsideWorkspace(workspacePath: string, resolvedPath: string): void {
  const resolved = path.resolve(resolvedPath)
  const base = path.resolve(workspacePath)
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error(`路径越界: ${resolved}`)
  }
}

const WORKSPACE_CLAUDE_MD = `# 测试工作空间 — ClaudeCode 操作说明

## Bug 修复流程

修复本工作空间中的 Bug 时，请遵循以下步骤：

1. 读取 \`bugs/BUG-XXXX.json\` 了解问题
2. 在目标项目中修复代码
3. 在 \`fixes/\` 目录创建修复记录文件：
   - 文件名：\`FIX-XXXX.json\`（递增编号）
   - 格式：
     {
       "id": "FIX-XXXX",
       "bugId": "BUG-XXXX",
       "changedFiles": [{ "file": "路径", "description": "修改说明" }],
       "result": "fixed | partially_fixed | not_fixed",
       "notes": "备注",
       "regressionTested": false,
       "author": "claudecode",
       "createdAt": "ISO时间"
     }
4. 如果运行了自动化测试，将结果保存到 \`auto-tests/run-YYYY-MM-DDTHH-MM.json\`

## 文件位置
- Bug 记录：\`bugs/BUG-*.json\`
- 修复记录：\`fixes/FIX-*.json\`
- 自动测试结果：\`auto-tests/run-*.json\`
- 截图：\`screenshots/\`
`

export function initWorkspace(workspacePath: string, name: string): void {
  for (const dir of WORKSPACE_DIRS) {
    fs.mkdirSync(path.join(workspacePath, dir), { recursive: true })
  }

  const configDir = path.join(workspacePath, '.testpilot')
  fs.mkdirSync(configDir, { recursive: true })

  const configPath = path.join(configDir, 'config.json')
  if (!fs.existsSync(configPath)) {
    const config: WorkspaceConfig = {
      name,
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    }
    writeJson(configPath, config)
  }

  const claudeMdPath = path.join(workspacePath, 'WORKSPACE_CLAUDE.md')
  if (!fs.existsSync(claudeMdPath)) {
    fs.writeFileSync(claudeMdPath, WORKSPACE_CLAUDE_MD, 'utf-8')
  }
}

export function getWorkspaceConfig(workspacePath: string): WorkspaceConfig | null {
  return readJson<WorkspaceConfig>(path.join(workspacePath, '.testpilot', 'config.json'))
}

export function writeJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })

  const tmpPath = filePath + '.tmp'
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmpPath, filePath)
}

export function readJson<T = unknown>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

export function listFiles(dirPath: string, pattern: RegExp): string[] {
  if (!fs.existsSync(dirPath)) {
    return []
  }
  return fs.readdirSync(dirPath).filter((f) => pattern.test(f)).sort()
}

// --- Plan ---

export function importPlan(workspacePath: string, mdFilePath: string, name: string): PlanState {
  const planId = `plan-${uuidv4().slice(0, 8)}`
  const mdContent = fs.readFileSync(mdFilePath, 'utf-8')

  // Copy original MD
  fs.copyFileSync(mdFilePath, path.join(workspacePath, 'plans', `${planId}.md`))

  // Parse MD into modules
  const modules = parsePlanMarkdown(mdContent)

  const state: PlanState = {
    planId,
    name,
    sourceFile: `${planId}.md`,
    importedAt: new Date().toISOString(),
    modules
  }

  writePlanState(workspacePath, state)
  return state
}

export function parsePlanMarkdown(content: string): TestModule[] {
  const modules: TestModule[] = []
  const lines = content.split('\n')

  let currentModule: TestModule | null = null
  let moduleIndex = 0

  for (const line of lines) {
    // Match ## Module header
    const moduleMatch = line.match(/^##\s+(.+)$/)
    if (moduleMatch) {
      moduleIndex++
      currentModule = {
        id: `m${moduleIndex}`,
        name: moduleMatch[1].trim(),
        items: []
      }
      modules.push(currentModule)
      continue
    }

    // Match table row: | id | feature | description | passed |
    if (!currentModule) continue
    const rowMatch = line.match(/^\|\s*([0-9]+\.[0-9]+)\s*\|\s*(.+?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|/)
    if (rowMatch) {
      currentModule.items.push({
        id: rowMatch[1],
        feature: rowMatch[2].trim(),
        description: rowMatch[3].trim(),
        testPoints: rowMatch[4]?.trim() || rowMatch[3].trim(),
        passed: null,
        testType: 'manual',
        testedAt: null,
        notes: '',
        bugId: null
      })
    }
  }

  return modules
}

export function readPlanState(workspacePath: string, planId: string): PlanState | null {
  assertSafeName(planId)
  return readJson<PlanState>(path.join(workspacePath, 'plans', `${planId}.state.json`))
}

export function writePlanState(workspacePath: string, state: PlanState): void {
  assertSafeName(state.planId)
  writeJson(path.join(workspacePath, 'plans', `${state.planId}.state.json`), state)
}

export function listPlans(workspacePath: string): string[] {
  return listFiles(path.join(workspacePath, 'plans'), /\.state\.json$/)
    .map((f) => f.replace('.state.json', ''))
}

// --- Bug ---

export function writeBug(workspacePath: string, bug: BugRecord): void {
  assertSafeName(bug.id)
  writeJson(path.join(workspacePath, 'bugs', `${bug.id}.json`), bug)
}

export function readBug(workspacePath: string, bugId: string): BugRecord | null {
  assertSafeName(bugId)
  return readJson<BugRecord>(path.join(workspacePath, 'bugs', `${bugId}.json`))
}

export function listBugs(workspacePath: string): string[] {
  return listFiles(path.join(workspacePath, 'bugs'), /^BUG-\d+\.json$/)
    .map((f) => f.replace('.json', ''))
}

export function nextBugId(workspacePath: string): string {
  const bugs = listBugs(workspacePath)
  if (bugs.length === 0) return 'BUG-0001'

  const maxNum = Math.max(...bugs.map((b) => parseInt(b.replace('BUG-', ''), 10)))
  return `BUG-${String(maxNum + 1).padStart(4, '0')}`
}

// --- Screenshot ---

export function writeScreenshot(
  workspacePath: string,
  bugId: string,
  index: number,
  buffer: Buffer
): string {
  assertSafeName(bugId)
  const filename = `${bugId}-${index}.png`
  fs.writeFileSync(path.join(workspacePath, 'screenshots', filename), buffer)
  return filename
}

// --- Test Result ---

export function writeTestResult(workspacePath: string, result: TestResult): void {
  assertSafeName(result.planId)
  assertSafeName(result.itemId)
  const dir = path.join(workspacePath, 'results', result.planId)
  fs.mkdirSync(dir, { recursive: true })
  writeJson(path.join(dir, `${result.itemId}.json`), result)
}

export function readTestResult(
  workspacePath: string,
  planId: string,
  itemId: string
): TestResult | null {
  assertSafeName(planId)
  assertSafeName(itemId)
  return readJson<TestResult>(path.join(workspacePath, 'results', planId, `${itemId}.json`))
}

// --- Fix ---

export function writeFix(workspacePath: string, fix: FixRecord): void {
  assertSafeName(fix.id)
  writeJson(path.join(workspacePath, 'fixes', `${fix.id}.json`), fix)
}

export function listFixes(workspacePath: string): string[] {
  return listFiles(path.join(workspacePath, 'fixes'), /^FIX-\d+\.json$/)
    .map((f) => f.replace('.json', ''))
}
