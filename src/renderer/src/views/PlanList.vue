<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlanStore } from '../stores/planStore'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { ElMessage } from 'element-plus'

const router = useRouter()
const planStore = usePlanStore()
const workspace = useWorkspaceStore()
const importName = ref('')
const showImportDialog = ref(false)

onMounted(() => {
  planStore.loadPlans()
})

function openImportDialog(): void {
  importName.value = ''
  showImportDialog.value = true
}

async function doImport(): Promise<void> {
  if (!importName.value.trim()) {
    ElMessage.warning('请输入计划名称')
    return
  }
  const plan = await planStore.importPlan(importName.value.trim())
  if (plan) {
    ElMessage.success('导入成功')
    showImportDialog.value = false
    router.push({ name: 'plan-detail', params: { planId: plan.planId } })
  } else {
    ElMessage.info('已取消')
  }
}

function openPlan(planId: string): void {
  planStore.selectPlan(planId)
  router.push({ name: 'plan-detail', params: { planId } })
}

function planStats(plan: { modules: { items: { passed: boolean | null }[] }[] }) {
  let total = 0, passed = 0, failed = 0
  for (const m of plan.modules) {
    for (const item of m.items) {
      total++
      if (item.passed === true) passed++
      else if (item.passed === false) failed++
    }
  }
  return { total, passed, failed, untested: total - passed - failed }
}
</script>

<template>
  <div class="plan-list">
    <div class="page-header">
      <h2>测试计划</h2>
      <el-button type="primary" @click="openImportDialog">导入 Markdown</el-button>
    </div>

    <el-empty v-if="planStore.plans.length === 0" description="暂无测试计划，点击上方按钮导入" />

    <div class="plan-cards">
      <el-card
        v-for="plan in planStore.plans"
        :key="plan.planId"
        shadow="hover"
        class="plan-card"
        @click="openPlan(plan.planId)"
      >
        <template #header>
          <span class="plan-name">{{ plan.name }}</span>
        </template>
        <div class="plan-stats">
          <el-tag>{{ planStats(plan).total }} 项</el-tag>
          <el-tag type="success" v-if="planStats(plan).passed > 0">
            通过 {{ planStats(plan).passed }}
          </el-tag>
          <el-tag type="danger" v-if="planStats(plan).failed > 0">
            失败 {{ planStats(plan).failed }}
          </el-tag>
          <el-tag type="info" v-if="planStats(plan).untested > 0">
            未测 {{ planStats(plan).untested }}
          </el-tag>
        </div>
        <div class="plan-meta">
          导入时间: {{ new Date(plan.importedAt).toLocaleString() }}
        </div>
      </el-card>
    </div>

    <!-- Import Dialog -->
    <el-dialog v-model="showImportDialog" title="导入测试计划" width="400px">
      <el-form>
        <el-form-item label="计划名称">
          <el-input v-model="importName" placeholder="例如：TYZCSys 测试计划" @keyup.enter="doImport" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showImportDialog = false">取消</el-button>
        <el-button type="primary" @click="doImport">选择文件并导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.plan-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.plan-card {
  cursor: pointer;
}

.plan-name {
  font-weight: 600;
  font-size: 16px;
}

.plan-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.plan-meta {
  font-size: 12px;
  color: #909399;
}
</style>
