import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BugRecord } from '../../../main/types'
import { useWorkspaceStore } from './workspaceStore'

export const useBugStore = defineStore('bug', () => {
  const bugs = ref<BugRecord[]>([])
  const currentBug = ref<BugRecord | null>(null)

  async function loadBugs(): Promise<void> {
    const ws = useWorkspaceStore()
    if (!ws.path) return

    const bugIds = await window.api.listBugs(ws.path)
    const results = await Promise.all(bugIds.map((id) => window.api.readBug(ws.path!, id)))
    bugs.value = results.filter((b): b is BugRecord => b !== null)
  }

  async function saveBug(bug: BugRecord): Promise<void> {
    const ws = useWorkspaceStore()
    if (!ws.path) return

    await window.api.writeBug(ws.path, bug)
    const exists = bugs.value.some((b) => b.id === bug.id)
    if (exists) {
      bugs.value = bugs.value.map((b) => (b.id === bug.id ? bug : b))
    } else {
      bugs.value = [...bugs.value, bug]
    }
    if (currentBug.value?.id === bug.id) {
      currentBug.value = bug
    }
  }

  async function nextId(): Promise<string> {
    const ws = useWorkspaceStore()
    if (!ws.path) return 'BUG-0001'
    return window.api.nextBugId(ws.path)
  }

  function selectBug(bugId: string): void {
    currentBug.value = bugs.value.find((b) => b.id === bugId) || null
  }

  return { bugs, currentBug, loadBugs, saveBug, nextId, selectBug }
})
