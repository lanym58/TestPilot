<script setup lang="ts">
import { onMounted, ref, computed, toRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useBugStore } from '../stores/bugStore'
import type { BugRecord, BugStatus, BugSeverity } from '../../../main/types'

const route = useRoute()
const router = useRouter()
const bugStore = useBugStore()

const editing = ref(false)
const editForm = ref({ title: '', description: '', severity: 'medium' as BugSeverity })

onMounted(async () => {
  const bugId = route.params.bugId as string
  if (bugStore.bugs.length === 0) {
    await bugStore.loadBugs()
  }
  bugStore.selectBug(bugId)

  if (!bugStore.currentBug) {
    router.push({ name: 'bugs' })
  }
})

const bug = computed(() => bugStore.currentBug)

const severityOptions: { value: BugSeverity; label: string }[] = [
  { value: 'critical', label: '严重' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' }
]

const statusFlow: BugStatus[] = ['open', 'fixing', 'fixed', 'verified', 'closed']

const statusLabel: Record<BugStatus, string> = {
  open: '待修复', fixing: '修复中', fixed: '已修复', verified: '已验证', closed: '已关闭'
}

function statusType(s: BugStatus): '' | 'danger' | 'warning' | 'info' | 'success' {
  const map: Record<BugStatus, '' | 'danger' | 'warning' | 'info' | 'success'> = {
    open: 'danger', fixing: 'warning', fixed: 'success', verified: 'success', closed: 'info'
  }
  return map[s]
}

async function changeStatus(newStatus: BugStatus): Promise<void> {
  if (!bug.value) return
  const updated: BugRecord = { ...JSON.parse(JSON.stringify(toRaw(bug.value))), status: newStatus, updatedAt: new Date().toISOString() }
  await bugStore.saveBug(updated)
  ElMessage.success(`状态已更新为「${statusLabel[newStatus]}」`)
}

function startEdit(): void {
  if (!bug.value) return
  editForm.value = {
    title: bug.value.title,
    description: bug.value.description,
    severity: bug.value.severity
  }
  editing.value = true
}

async function saveBug(): Promise<void> {
  if (!bug.value) return
  const updated: BugRecord = {
    ...JSON.parse(JSON.stringify(toRaw(bug.value))),
    title: editForm.value.title,
    description: editForm.value.description,
    severity: editForm.value.severity,
    updatedAt: new Date().toISOString()
  }
  await bugStore.saveBug(updated)
  editing.value = false
  ElMessage.success('已保存')
}

function cancelEdit(): void {
  editing.value = false
}

function goBack(): void {
  router.push({ name: 'bugs' })
}
</script>

<template>
  <div class="bug-detail" v-if="bug">
    <div class="page-header">
      <el-button text @click="goBack">&larr; 返回列表</el-button>
      <el-tag :type="statusType(bug.status)" size="large">{{ statusLabel[bug.status] }}</el-tag>
    </div>

    <h2>{{ bug.id }}: {{ bug.title }}</h2>

    <!-- Status Flow -->
    <div class="status-flow">
      <span class="flow-label">状态流转：</span>
      <el-button
        v-for="s in statusFlow"
        :key="s"
        :type="bug.status === s ? 'primary' : 'default'"
        :disabled="bug.status === s"
        size="small"
        @click="changeStatus(s)"
      >
        {{ statusLabel[s] }}
      </el-button>
    </div>

    <!-- Info Section -->
    <el-descriptions border :column="2" class="info-section">
      <el-descriptions-item label="严重程度">
        <el-select v-if="editing" v-model="editForm.severity" size="small">
          <el-option v-for="opt in severityOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <span v-else>{{ severityOptions.find(o => o.value === bug.severity)?.label }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="关联功能项">{{ bug.itemId }}</el-descriptions-item>
      <el-descriptions-item label="创建时间">{{ new Date(bug.createdAt).toLocaleString() }}</el-descriptions-item>
      <el-descriptions-item label="更新时间">{{ new Date(bug.updatedAt).toLocaleString() }}</el-descriptions-item>
    </el-descriptions>

    <!-- Description -->
    <el-card shadow="never" class="section">
      <template #header>
        <div class="section-header">
          <span>描述</span>
          <el-button v-if="!editing" text size="small" @click="startEdit">编辑</el-button>
          <template v-else>
            <el-button size="small" @click="cancelEdit">取消</el-button>
            <el-button type="primary" size="small" @click="saveBug">保存</el-button>
          </template>
        </div>
      </template>
      <el-input
        v-if="editing"
        v-model="editForm.description"
        type="textarea"
        :rows="4"
        placeholder="Bug 详细描述"
      />
      <p v-else class="description-text">{{ bug.description || '（无描述）' }}</p>
    </el-card>

    <!-- Reproduction Steps -->
    <el-card shadow="never" class="section">
      <template #header>复现步骤</template>
      <pre class="steps-text">{{ bug.stepsText || '（无复现步骤）' }}</pre>
    </el-card>

    <!-- Screenshots -->
    <el-card shadow="never" class="section" v-if="bug.screenshots.length > 0">
      <template #header>截图 ({{ bug.screenshots.length }})</template>
      <div class="screenshot-gallery">
        <div v-for="(img, idx) in bug.screenshots" :key="idx" class="screenshot-item">
          {{ img }}
        </div>
      </div>
    </el-card>

    <!-- Title Edit -->
    <el-card shadow="never" class="section" v-if="editing">
      <template #header>标题</template>
      <el-input v-model="editForm.title" />
    </el-card>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.status-flow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0;
}

.flow-label {
  font-size: 13px;
  color: #909399;
}

.info-section {
  margin: 16px 0;
}

.section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.description-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
}

.steps-text {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.8;
}

.screenshot-gallery {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.screenshot-item {
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
}
</style>
