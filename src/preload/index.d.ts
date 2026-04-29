import { ElectronAPI } from '@electron-toolkit/preload'
import type { BugRecord, FixRecord, TestResult, PlanState, WorkspaceConfig } from '../main/types'

interface TestPilotAPI {
  getRecorderPreload(): Promise<string>
  openWorkspaceDialog(): Promise<string | null>
  initWorkspace(path: string, name: string): Promise<WorkspaceConfig>
  getWorkspaceConfig(path: string): Promise<WorkspaceConfig | null>
  importPlan(workspace: string, name: string): Promise<PlanState | null>
  listPlans(workspace: string): Promise<string[]>
  readPlan(workspace: string, planId: string): Promise<PlanState | null>
  savePlan(workspace: string, state: PlanState): Promise<boolean>
  listBugs(workspace: string): Promise<string[]>
  readBug(workspace: string, bugId: string): Promise<BugRecord | null>
  writeBug(workspace: string, bug: BugRecord): Promise<boolean>
  nextBugId(workspace: string): Promise<string>
  captureScreenshot(workspace: string, bugId: string, index: number, webContentsId: number): Promise<string | null>
  writeResult(workspace: string, result: TestResult): Promise<boolean>
  readResult(workspace: string, planId: string, itemId: string): Promise<TestResult | null>
  writeFix(workspace: string, fix: FixRecord): Promise<boolean>
  listFixes(workspace: string): Promise<string[]>
  watchFixes(workspace: string): Promise<void>
  stopWatch(): Promise<void>
  onShortcut(channel: string, callback: () => void): () => void
  onFixesChanged(callback: (filename: string) => void): () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: TestPilotAPI
  }
}
