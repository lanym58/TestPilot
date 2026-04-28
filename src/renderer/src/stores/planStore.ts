import { defineStore } from 'pinia'
import { ref, toRaw } from 'vue'
import type { PlanState } from '../../../main/types'
import { useWorkspaceStore } from './workspaceStore'

export const usePlanStore = defineStore('plan', () => {
  const plans = ref<PlanState[]>([])
  const currentPlan = ref<PlanState | null>(null)

  async function loadPlans(): Promise<void> {
    const ws = useWorkspaceStore()
    if (!ws.path) return

    const planIds = await window.api.listPlans(ws.path)
    const results = await Promise.all(planIds.map((id) => window.api.readPlan(ws.path!, id)))
    plans.value = results.filter((p): p is PlanState => p !== null)
  }

  async function importPlan(name: string): Promise<PlanState | null> {
    const ws = useWorkspaceStore()
    if (!ws.path) return null

    const plan = await window.api.importPlan(ws.path, name)
    if (plan) {
      plans.value = [...plans.value, plan]
    }
    return plan
  }

  async function savePlan(state: PlanState): Promise<void> {
    const ws = useWorkspaceStore()
    if (!ws.path) return

    await window.api.savePlan(ws.path, JSON.parse(JSON.stringify(toRaw(state))))
    plans.value = plans.value.map((p) => (p.planId === state.planId ? state : p))
    if (currentPlan.value?.planId === state.planId) {
      currentPlan.value = state
    }
  }

  function selectPlan(planId: string): void {
    currentPlan.value = plans.value.find((p) => p.planId === planId) || null
  }

  return { plans, currentPlan, loadPlans, importPlan, savePlan, selectPlan }
})
