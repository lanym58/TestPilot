<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { usePlanStore } from '../stores/planStore'
import { useBugStore } from '../stores/bugStore'

const planStore = usePlanStore()
const bugStore = useBugStore()

onMounted(() => {
  planStore.loadPlans()
  bugStore.loadBugs()
})

const stats = computed(() => {
  let totalItems = 0, passed = 0, failed = 0
  for (const plan of planStore.plans) {
    for (const mod of plan.modules) {
      for (const item of mod.items) {
        totalItems++
        if (item.passed === true) passed++
        else if (item.passed === false) failed++
      }
    }
  }
  const untested = totalItems - passed - failed
  const rate = totalItems > 0 ? Math.round((passed / totalItems) * 100) : 0
  return { plans: planStore.plans.length, totalItems, passed, failed, untested, rate, bugs: bugStore.bugs.length }
})
</script>

<template>
  <div class="dashboard">
    <h2>概览</h2>

    <div class="stat-cards">
      <el-card shadow="never" class="stat-card">
        <div class="stat-value">{{ stats.plans }}</div>
        <div class="stat-label">测试计划</div>
      </el-card>
      <el-card shadow="never" class="stat-card">
        <div class="stat-value">{{ stats.totalItems }}</div>
        <div class="stat-label">功能项</div>
      </el-card>
      <el-card shadow="never" class="stat-card success">
        <div class="stat-value">{{ stats.passed }}</div>
        <div class="stat-label">通过</div>
      </el-card>
      <el-card shadow="never" class="stat-card danger">
        <div class="stat-value">{{ stats.failed }}</div>
        <div class="stat-label">不通过</div>
      </el-card>
      <el-card shadow="never" class="stat-card info">
        <div class="stat-value">{{ stats.untested }}</div>
        <div class="stat-label">未测试</div>
      </el-card>
      <el-card shadow="never" class="stat-card warning">
        <div class="stat-value">{{ stats.bugs }}</div>
        <div class="stat-label">Bug</div>
      </el-card>
    </div>

    <el-card shadow="never" style="margin-top: 20px" v-if="stats.totalItems > 0">
      <template #header>完成率</template>
      <el-progress
        :percentage="stats.rate"
        :stroke-width="20"
        :text-inside="true"
        :status="stats.rate === 100 ? 'success' : ''"
      />
    </el-card>

    <el-empty v-if="stats.plans === 0" description="请先导入测试计划" style="margin-top: 40px" />
  </div>
</template>

<style scoped>
.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.stat-card {
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.stat-card.success .stat-value { color: #67c23a; }
.stat-card.danger .stat-value { color: #f56c6c; }
.stat-card.info .stat-value { color: #909399; }
.stat-card.warning .stat-value { color: #e6a23c; }
</style>
