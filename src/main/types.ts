export interface WorkspaceConfig {
  name: string
  createdAt: string
  version: string
}

export interface ActionRecord {
  seq: number
  type: 'navigate' | 'click' | 'input' | 'scroll' | 'observe'
  url?: string
  selector?: string
  label?: string
  value?: string
  target?: string
  description?: string
  timestamp?: number
}

export interface TestItem {
  id: string
  feature: string
  description: string
  testPoints: string
  passed: boolean | null
  testType: 'manual' | 'auto'
  testedAt: string | null
  notes: string
  bugId: string | null
}

export interface TestModule {
  id: string
  name: string
  items: TestItem[]
}

export interface PlanState {
  planId: string
  name: string
  sourceFile: string
  importedAt: string
  modules: TestModule[]
}

export type BugSeverity = 'critical' | 'high' | 'medium' | 'low'
export type BugStatus = 'open' | 'fixing' | 'fixed' | 'verified' | 'closed'

export interface BugRecord {
  id: string
  title: string
  description: string
  severity: BugSeverity
  status: BugStatus
  planId: string
  itemId: string
  stepsText: string
  actions: ActionRecord[]
  screenshots: string[]
  createdAt: string
  updatedAt: string
}

export interface FixRecord {
  id: string
  bugId: string
  changedFiles: Array<{ file: string; description: string }>
  result: 'fixed' | 'partially_fixed' | 'not_fixed'
  notes: string
  regressionTested: boolean
  author: string
  createdAt: string
}

export interface TestResult {
  planId: string
  itemId: string
  passed: boolean
  testType: 'manual' | 'auto'
  testedAt: string
  actions: ActionRecord[]
  notes: string
  bugId: string | null
}
