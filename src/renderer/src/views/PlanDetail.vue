<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePlanStore } from '../stores/planStore'

const route = useRoute()
const router = useRouter()
const planStore = usePlanStore()

onMounted(async () => {
  const planId = route.params.planId as string

  if (planStore.plans.length === 0) {
    await planStore.loadPlans()
  }
  planStore.selectPlan(planId)

  if (!planStore.currentPlan) {
    router.push({ name: 'plans' })
  }
})

function startTest(itemId: string): void {
  if (!planStore.currentPlan) return
  router.push({
    name: 'test-session',
    params: { planId: planStore.currentPlan.planId, itemId }
  })
}

function statusType(passed: boolean | null): '' | 'success' | 'danger' | 'info' {
  if (passed === true) return 'success'
  if (passed === false) return 'danger'
  return 'info'
}

function statusText(passed: boolean | null): string {
  if (passed === true) return '通过'
  if (passed === false) return '不通过'
  return '未测试'
}

function goBack(): void {
  router.push({ name: 'plans' })
}
</script>

<template>
  <div class="plan-detail" v-if="planStore.currentPlan">
    <div class="page-header">
      <div>
        <el-button text @click="goBack">&larr; 返回</el-button>
        <h2 style="display:inline; margin-left: 8px">{{ planStore.currentPlan.name }}</h2>
      </div>
    </div>

    <div v-for="mod in planStore.currentPlan.modules" :key="mod.id" class="module-section">
      <h3 class="module-title">{{ mod.name }}</h3>

      <el-table :data="mod.items" stripe>
        <el-table-column prop="id" label="#" width="70" />
        <el-table-column prop="feature" label="功能项" min-width="150" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="testPoints" label="测试要点" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.passed)" size="small">
              {{ statusText(row.passed) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="startTest(row.id)">
              开始测试
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: 20px;
}

.module-section {
  margin-bottom: 24px;
}

.module-title {
  margin: 0 0 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #409eff;
  color: #303133;
}
</style>
