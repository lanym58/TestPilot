<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBugStore } from '../stores/bugStore'
import type { BugSeverity, BugStatus } from '../../../main/types'

const router = useRouter()
const bugStore = useBugStore()

const filterSeverity = ref<BugSeverity | ''>('')
const filterStatus = ref<BugStatus | ''>('')

onMounted(() => {
  bugStore.loadBugs()
})

const filteredBugs = computed(() => {
  return bugStore.bugs
    .filter((b) => !filterSeverity.value || b.severity === filterSeverity.value)
    .filter((b) => !filterStatus.value || b.status === filterStatus.value)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

function openBug(bugId: string): void {
  bugStore.selectBug(bugId)
  router.push({ name: 'bug-detail', params: { bugId } })
}

function severityType(s: BugSeverity): '' | 'danger' | 'warning' | 'info' | 'success' {
  const map: Record<BugSeverity, '' | 'danger' | 'warning' | 'info' | 'success'> = {
    critical: 'danger', high: 'warning', medium: '', low: 'info'
  }
  return map[s]
}

function statusType(s: BugStatus): '' | 'danger' | 'warning' | 'info' | 'success' {
  const map: Record<BugStatus, '' | 'danger' | 'warning' | 'info' | 'success'> = {
    open: 'danger', fixing: 'warning', fixed: 'success', verified: 'success', closed: 'info'
  }
  return map[s]
}

const severityLabel: Record<BugSeverity, string> = {
  critical: '严重', high: '高', medium: '中', low: '低'
}

const statusLabel: Record<BugStatus, string> = {
  open: '待修复', fixing: '修复中', fixed: '已修复', verified: '已验证', closed: '已关闭'
}
</script>

<template>
  <div class="bug-list">
    <div class="page-header">
      <h2>Bug 列表</h2>
      <div class="filters">
        <el-select v-model="filterSeverity" placeholder="严重程度" clearable size="small" style="width:120px">
          <el-option label="严重" value="critical" />
          <el-option label="高" value="high" />
          <el-option label="中" value="medium" />
          <el-option label="低" value="low" />
        </el-select>
        <el-select v-model="filterStatus" placeholder="状态" clearable size="small" style="width:120px">
          <el-option label="待修复" value="open" />
          <el-option label="修复中" value="fixing" />
          <el-option label="已修复" value="fixed" />
          <el-option label="已验证" value="verified" />
          <el-option label="已关闭" value="closed" />
        </el-select>
      </div>
    </div>

    <el-empty v-if="filteredBugs.length === 0" description="暂无 Bug" />

    <el-table v-else :data="filteredBugs" stripe @row-click="(row) => openBug(row.id)" style="cursor:pointer">
      <el-table-column prop="id" label="ID" width="110" />
      <el-table-column prop="title" label="标题" min-width="250" show-overflow-tooltip />
      <el-table-column label="严重度" width="90">
        <template #default="{ row }">
          <el-tag :type="severityType(row.severity)" size="small">
            {{ severityLabel[row.severity as BugSeverity] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">
            {{ statusLabel[row.status as BugStatus] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="itemId" label="功能项" width="80" />
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">
          {{ new Date(row.createdAt).toLocaleString() }}
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.filters {
  display: flex;
  gap: 8px;
}
</style>
