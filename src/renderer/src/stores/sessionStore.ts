import { defineStore } from 'pinia'
import { ref, computed, watch, toRaw } from 'vue'
import type { ActionRecord, TestItem } from '../../../main/types'

const DRAFT_KEY = 'testpilot_session_draft'
const AUTO_SAVE_INTERVAL = 30_000

export const useSessionStore = defineStore('session', () => {
  const currentItem = ref<TestItem | null>(null)
  const currentPlanId = ref<string | null>(null)
  const actions = ref<ActionRecord[]>([])
  const isRecording = ref(false)
  const browserUrl = ref('')
  let autoSaveTimer: ReturnType<typeof setInterval> | null = null

  const nextSeq = computed(() => actions.value.length + 1)

  function startSession(planId: string, item: TestItem): void {
    currentPlanId.value = planId
    currentItem.value = item
    actions.value = []
    isRecording.value = true
    browserUrl.value = ''
    startAutoSave()
  }

  function addAction(action: Omit<ActionRecord, 'seq'>): void {
    actions.value = [
      ...actions.value,
      { ...action, seq: nextSeq.value }
    ]
  }

  function removeAction(seq: number): void {
    actions.value = actions.value
      .filter((a) => a.seq !== seq)
      .map((a, i) => ({ ...a, seq: i + 1 }))
  }

  function clearSession(): void {
    currentItem.value = null
    currentPlanId.value = null
    actions.value = []
    isRecording.value = false
    browserUrl.value = ''
    stopAutoSave()
    localStorage.removeItem(DRAFT_KEY)
  }

  // --- Auto-save draft ---
  function saveDraft(): void {
    if (!isRecording.value) return
    const draft = {
      currentPlanId: currentPlanId.value,
      currentItem: currentItem.value ? toRaw(currentItem.value) : null,
      actions: JSON.parse(JSON.stringify(toRaw(actions.value))),
      browserUrl: browserUrl.value,
      savedAt: new Date().toISOString()
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }

  function restoreDraft(): boolean {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return false
    try {
      const draft = JSON.parse(raw)
      if (draft.currentPlanId && draft.currentItem) {
        currentPlanId.value = draft.currentPlanId
        currentItem.value = draft.currentItem
        actions.value = draft.actions || []
        browserUrl.value = draft.browserUrl || ''
        isRecording.value = true
        startAutoSave()
        return true
      }
    } catch { /* ignore corrupt draft */ }
    return false
  }

  function startAutoSave(): void {
    stopAutoSave()
    autoSaveTimer = setInterval(saveDraft, AUTO_SAVE_INTERVAL)
  }

  function stopAutoSave(): void {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      autoSaveTimer = null
    }
  }

  return {
    currentItem,
    currentPlanId,
    actions,
    isRecording,
    browserUrl,
    nextSeq,
    startSession,
    addAction,
    removeAction,
    clearSession,
    saveDraft,
    restoreDraft
  }
})
