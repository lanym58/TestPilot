<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '../stores/sessionStore'
import { usePlanStore } from '../stores/planStore'
import TestToolbar from '../components/TestToolbar.vue'
import ActionRecorder from '../components/ActionRecorder.vue'
import EmbeddedBrowser from '../components/EmbeddedBrowser.vue'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const planStore = usePlanStore()

const webContentsId = ref<number | undefined>()
const sidebarWidth = ref(280)

onMounted(async () => {
  const planId = route.params.planId as string
  const itemId = route.params.itemId as string

  // Ensure plans are loaded
  if (planStore.plans.length === 0) {
    await planStore.loadPlans()
  }

  planStore.selectPlan(planId)

  if (!planStore.currentPlan) {
    router.back()
    return
  }

  // Find test item
  for (const mod of planStore.currentPlan.modules) {
    const item = mod.items.find((i) => i.id === itemId)
    if (item) {
      session.startSession(planId, item)
      return
    }
  }

  router.back()
})

function onWebContentsId(id: number): void {
  webContentsId.value = id
}
</script>

<template>
  <div class="test-session">
    <TestToolbar :web-contents-id="webContentsId" />

    <div class="session-body">
      <div class="sidebar" :style="{ width: sidebarWidth + 'px' }">
        <ActionRecorder />

        <div class="test-points" v-if="session.currentItem">
          <div class="points-header">测试要点</div>
          <div class="points-content">
            {{ session.currentItem.testPoints }}
          </div>
        </div>
      </div>

      <div class="browser-area">
        <EmbeddedBrowser @webcontents-id="onWebContentsId" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.test-session {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.session-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  display: flex;
  flex-direction: column;
  min-width: 220px;
  max-width: 400px;
  border-right: 1px solid #e4e7ed;
}

.browser-area {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.test-points {
  border-top: 1px solid #e4e7ed;
  max-height: 200px;
  overflow-y: auto;
}

.points-header {
  padding: 8px 12px;
  font-weight: 600;
  font-size: 13px;
  background: #fafafa;
  border-bottom: 1px solid #e4e7ed;
}

.points-content {
  padding: 8px 12px;
  font-size: 13px;
  white-space: pre-wrap;
  line-height: 1.6;
}
</style>
