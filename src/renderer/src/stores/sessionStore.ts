import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ActionRecord, TestItem } from '../../../main/types'

export const useSessionStore = defineStore('session', () => {
  const currentItem = ref<TestItem | null>(null)
  const currentPlanId = ref<string | null>(null)
  const actions = ref<ActionRecord[]>([])
  const isRecording = ref(false)
  const browserUrl = ref('')

  const nextSeq = computed(() => actions.value.length + 1)

  function startSession(planId: string, item: TestItem): void {
    currentPlanId.value = planId
    currentItem.value = item
    actions.value = []
    isRecording.value = true
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
    clearSession
  }
})
