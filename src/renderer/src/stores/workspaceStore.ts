import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { WorkspaceConfig } from '../../../main/types'

export const useWorkspaceStore = defineStore('workspace', () => {
  const path = ref<string | null>(null)
  const config = ref<WorkspaceConfig | null>(null)
  const isOpen = ref(false)

  async function openWorkspace(): Promise<boolean> {
    const selected = await window.api.openWorkspaceDialog()
    if (!selected) return false

    const existing = await window.api.getWorkspaceConfig(selected)
    if (existing) {
      path.value = selected
      config.value = existing
      isOpen.value = true
      await window.api.watchFixes(selected)
      return true
    }

    // New workspace — init with folder name
    const name = selected.split(/[/\\]/).pop() || 'TestPilot'
    config.value = await window.api.initWorkspace(selected, name)
    path.value = selected
    isOpen.value = true
    await window.api.watchFixes(selected)
    return true
  }

  function closeWorkspace(): void {
    path.value = null
    config.value = null
    isOpen.value = false
  }

  return { path, config, isOpen, openWorkspace, closeWorkspace }
})
