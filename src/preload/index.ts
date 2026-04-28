import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { BugRecord, FixRecord, TestResult, PlanState, WorkspaceConfig } from '../main/types'

const api = {
  // App
  getRecorderPreload: (): Promise<string> => ipcRenderer.invoke('app:getRecorderPreload'),

  // Workspace
  openWorkspaceDialog: (): Promise<string | null> => ipcRenderer.invoke('workspace:open'),
  initWorkspace: (path: string, name: string): Promise<WorkspaceConfig> =>
    ipcRenderer.invoke('workspace:init', path, name),
  getWorkspaceConfig: (path: string): Promise<WorkspaceConfig | null> =>
    ipcRenderer.invoke('workspace:getConfig', path),

  // Plans
  importPlan: (workspace: string, name: string): Promise<PlanState | null> =>
    ipcRenderer.invoke('plan:import', workspace, name),
  listPlans: (workspace: string): Promise<string[]> =>
    ipcRenderer.invoke('plan:list', workspace),
  readPlan: (workspace: string, planId: string): Promise<PlanState | null> =>
    ipcRenderer.invoke('plan:read', workspace, planId),
  savePlan: (workspace: string, state: PlanState): Promise<boolean> =>
    ipcRenderer.invoke('plan:save', workspace, state),

  // Bugs
  listBugs: (workspace: string): Promise<string[]> =>
    ipcRenderer.invoke('bug:list', workspace),
  readBug: (workspace: string, bugId: string): Promise<BugRecord | null> =>
    ipcRenderer.invoke('bug:read', workspace, bugId),
  writeBug: (workspace: string, bug: BugRecord): Promise<boolean> =>
    ipcRenderer.invoke('bug:write', workspace, bug),
  nextBugId: (workspace: string): Promise<string> =>
    ipcRenderer.invoke('bug:nextId', workspace),

  // Screenshots
  captureScreenshot: (workspace: string, bugId: string, index: number, webContentsId: number): Promise<string | null> =>
    ipcRenderer.invoke('screenshot:capture', workspace, bugId, index, webContentsId),

  // Test Results
  writeResult: (workspace: string, result: TestResult): Promise<boolean> =>
    ipcRenderer.invoke('result:write', workspace, result),
  readResult: (workspace: string, planId: string, itemId: string): Promise<TestResult | null> =>
    ipcRenderer.invoke('result:read', workspace, planId, itemId),

  // Fixes
  writeFix: (workspace: string, fix: FixRecord): Promise<boolean> =>
    ipcRenderer.invoke('fix:write', workspace, fix),
  listFixes: (workspace: string): Promise<string[]> =>
    ipcRenderer.invoke('fix:list', workspace)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  throw new Error('contextIsolation must be enabled')
}
