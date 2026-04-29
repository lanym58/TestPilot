import { ipcMain, dialog, BrowserWindow, webContents } from 'electron'
import { join } from 'path'
import * as fileService from './fileService'
import type { BugRecord, FixRecord, TestResult, PlanState } from './types'

const authorizedWorkspaces = new Set<string>()

export function isAuthorizedWorkspace(p: string): boolean {
  return authorizedWorkspaces.has(p)
}

function assertAuthorized(p: string): void {
  if (!authorizedWorkspaces.has(p)) {
    throw new Error(`未授权的工作空间路径`)
  }
}

function safe<T>(fn: () => T | Promise<T>): Promise<T | null> {
  return Promise.resolve()
    .then(fn)
    .catch(() => null)
}

export function registerIpcHandlers(): void {
  // App info
  ipcMain.handle('app:getRecorderPreload', () => {
    return join(__dirname, '../preload/recorder.js')
  })

  // Workspace
  ipcMain.handle('workspace:open', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择工作空间文件夹'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const selected = result.filePaths[0]
    authorizedWorkspaces.add(selected)
    return selected
  })

  ipcMain.handle('workspace:init', (_e, workspacePath: string, name: string) =>
    safe(() => {
      assertAuthorized(workspacePath)
      fileService.initWorkspace(workspacePath, name)
      return fileService.getWorkspaceConfig(workspacePath)
    })
  )

  ipcMain.handle('workspace:getConfig', (_e, workspacePath: string) =>
    safe(() => {
      assertAuthorized(workspacePath)
      return fileService.getWorkspaceConfig(workspacePath)
    })
  )

  // Plans — import only via dialog (no arbitrary path from renderer)
  ipcMain.handle('plan:import', async (_e, workspacePath: string, name: string) => {
    assertAuthorized(workspacePath)
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      title: '选择测试计划 Markdown 文件'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return safe(() => fileService.importPlan(workspacePath, result.filePaths[0], name))
  })

  ipcMain.handle('plan:list', (_e, workspacePath: string) =>
    safe(() => { assertAuthorized(workspacePath); return fileService.listPlans(workspacePath) })
  )

  ipcMain.handle('plan:read', (_e, workspacePath: string, planId: string) =>
    safe(() => { assertAuthorized(workspacePath); return fileService.readPlanState(workspacePath, planId) })
  )

  ipcMain.handle('plan:save', (_e, workspacePath: string, state: PlanState) =>
    safe(() => { assertAuthorized(workspacePath); fileService.writePlanState(workspacePath, state); return true })
  )

  // Bugs
  ipcMain.handle('bug:list', (_e, workspacePath: string) =>
    safe(() => { assertAuthorized(workspacePath); return fileService.listBugs(workspacePath) })
  )

  ipcMain.handle('bug:read', (_e, workspacePath: string, bugId: string) =>
    safe(() => { assertAuthorized(workspacePath); return fileService.readBug(workspacePath, bugId) })
  )

  ipcMain.handle('bug:write', (_e, workspacePath: string, bug: BugRecord) =>
    safe(() => { assertAuthorized(workspacePath); fileService.writeBug(workspacePath, bug); return true })
  )

  ipcMain.handle('bug:create', (_e, workspacePath: string, bugWithoutId: Omit<BugRecord, 'id'>) =>
    safe(() => { assertAuthorized(workspacePath); return fileService.createBugAtomic(workspacePath, bugWithoutId) })
  )

  ipcMain.handle('bug:nextId', (_e, workspacePath: string) =>
    safe(() => { assertAuthorized(workspacePath); return fileService.nextBugId(workspacePath) })
  )

  // Screenshots
  ipcMain.handle('screenshot:capture', async (
    _e, workspacePath: string, bugId: string, index: number, webContentsId: number
  ) => {
    assertAuthorized(workspacePath)
    const wc = webContents.fromId(webContentsId)
    if (!wc) return null
    const image = await wc.capturePage()
    const buffer = image.toPNG()
    return safe(() => fileService.writeScreenshot(workspacePath, bugId, index, buffer))
  })

  // Test Results
  ipcMain.handle('result:write', (_e, workspacePath: string, result: TestResult) =>
    safe(() => { assertAuthorized(workspacePath); fileService.writeTestResult(workspacePath, result); return true })
  )

  ipcMain.handle('result:read', (_e, workspacePath: string, planId: string, itemId: string) =>
    safe(() => { assertAuthorized(workspacePath); return fileService.readTestResult(workspacePath, planId, itemId) })
  )

  // Fixes
  ipcMain.handle('fix:write', (_e, workspacePath: string, fix: FixRecord) =>
    safe(() => { assertAuthorized(workspacePath); fileService.writeFix(workspacePath, fix); return true })
  )

  ipcMain.handle('fix:list', (_e, workspacePath: string) =>
    safe(() => { assertAuthorized(workspacePath); return fileService.listFixes(workspacePath) })
  )
}
