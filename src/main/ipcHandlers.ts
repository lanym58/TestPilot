import { ipcMain, dialog, BrowserWindow, webContents } from 'electron'
import * as fileService from './fileService'
import type { BugRecord, FixRecord, TestResult, PlanState } from './types'

function safe<T>(fn: () => T | Promise<T>): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  return Promise.resolve()
    .then(fn)
    .then((data) => ({ ok: true as const, data }))
    .catch((err: unknown) => ({
      ok: false as const,
      error: err instanceof Error ? err.message : '未知错误'
    }))
}

export function registerIpcHandlers(): void {
  // Workspace
  ipcMain.handle('workspace:open', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择工作空间文件夹'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('workspace:init', (_e, workspacePath: string, name: string) =>
    safe(() => {
      fileService.initWorkspace(workspacePath, name)
      return fileService.getWorkspaceConfig(workspacePath)
    })
  )

  ipcMain.handle('workspace:getConfig', (_e, workspacePath: string) =>
    safe(() => fileService.getWorkspaceConfig(workspacePath))
  )

  // Plans — import only via dialog (no arbitrary path from renderer)
  ipcMain.handle('plan:import', async (_e, workspacePath: string, name: string) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      title: '选择测试计划 Markdown 文件'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return safe(() => fileService.importPlan(workspacePath, result.filePaths[0], name))
  })

  ipcMain.handle('plan:list', (_e, workspacePath: string) =>
    safe(() => fileService.listPlans(workspacePath))
  )

  ipcMain.handle('plan:read', (_e, workspacePath: string, planId: string) =>
    safe(() => fileService.readPlanState(workspacePath, planId))
  )

  ipcMain.handle('plan:save', (_e, workspacePath: string, state: PlanState) =>
    safe(() => {
      fileService.writePlanState(workspacePath, state)
      return true
    })
  )

  // Bugs
  ipcMain.handle('bug:list', (_e, workspacePath: string) =>
    safe(() => fileService.listBugs(workspacePath))
  )

  ipcMain.handle('bug:read', (_e, workspacePath: string, bugId: string) =>
    safe(() => fileService.readBug(workspacePath, bugId))
  )

  ipcMain.handle('bug:write', (_e, workspacePath: string, bug: BugRecord) =>
    safe(() => {
      fileService.writeBug(workspacePath, bug)
      return true
    })
  )

  ipcMain.handle('bug:nextId', (_e, workspacePath: string) =>
    safe(() => fileService.nextBugId(workspacePath))
  )

  // Screenshots — capture webview by webContentsId
  ipcMain.handle('screenshot:capture', async (
    _e,
    workspacePath: string,
    bugId: string,
    index: number,
    webContentsId: number
  ) => {
    const wc = webContents.fromId(webContentsId)
    if (!wc) return null

    const image = await wc.capturePage()
    const buffer = image.toPNG()
    return safe(() => fileService.writeScreenshot(workspacePath, bugId, index, buffer))
  })

  // Test Results
  ipcMain.handle('result:write', (_e, workspacePath: string, result: TestResult) =>
    safe(() => {
      fileService.writeTestResult(workspacePath, result)
      return true
    })
  )

  ipcMain.handle('result:read', (_e, workspacePath: string, planId: string, itemId: string) =>
    safe(() => fileService.readTestResult(workspacePath, planId, itemId))
  )

  // Fixes
  ipcMain.handle('fix:write', (_e, workspacePath: string, fix: FixRecord) =>
    safe(() => {
      fileService.writeFix(workspacePath, fix)
      return true
    })
  )

  ipcMain.handle('fix:list', (_e, workspacePath: string) =>
    safe(() => fileService.listFixes(workspacePath))
  )
}
