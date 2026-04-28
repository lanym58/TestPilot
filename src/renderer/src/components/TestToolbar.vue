<script setup lang="ts">
import { ref, computed, toRaw } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useSessionStore } from '../stores/sessionStore'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { usePlanStore } from '../stores/planStore'
import { useBugStore } from '../stores/bugStore'
import { formatActions } from '../utils/actionFormatter'
import type { TestResult, BugRecord, BugSeverity } from '../../../main/types'

const props = defineProps<{
  webContentsId?: number
}>()

const router = useRouter()
const session = useSessionStore()
const workspace = useWorkspaceStore()
const planStore = usePlanStore()
const bugStore = useBugStore()

// Bug form dialog state
const showBugDialog = ref(false)
const bugForm = ref({
  title: '',
  description: '',
  severity: 'medium' as BugSeverity
})

const stepsPreview = computed(() => formatActions(session.actions))

const severityOptions: { value: BugSeverity; label: string }[] = [
  { value: 'critical', label: '严重 (Critical)' },
  { value: 'high', label: '高 (High)' },
  { value: 'medium', label: '中 (Medium)' },
  { value: 'low', label: '低 (Low)' }
]

async function updatePlanItem(passed: boolean, testedAt: string, notes: string, bugId: string | null): Promise<void> {
  if (!planStore.currentPlan || !session.currentItem) return
  const updated = {
    ...planStore.currentPlan,
    modules: planStore.currentPlan.modules.map((m) => ({
      ...m,
      items: m.items.map((item) =>
        item.id === session.currentItem!.id
          ? { ...item, passed, testedAt, notes, bugId }
          : item
      )
    }))
  }
  await planStore.savePlan(updated)
}

async function markPassed(): Promise<void> {
  if (!workspace.path || !session.currentPlanId || !session.currentItem) return

  const result: TestResult = {
    planId: session.currentPlanId,
    itemId: session.currentItem.id,
    passed: true,
    testType: 'manual',
    testedAt: new Date().toISOString(),
    actions: JSON.parse(JSON.stringify(toRaw(session.actions))),
    notes: '',
    bugId: null
  }

  await window.api.writeResult(workspace.path, result)
  await updatePlanItem(true, result.testedAt, '', null)

  ElMessage.success('已标记通过，可继续测试下一项')
}

function openBugDialog(): void {
  if (!session.currentItem) return
  bugForm.value = {
    title: `[${session.currentItem.id}] `,
    description: '',
    severity: 'medium'
  }
  showBugDialog.value = true
}

async function submitBug(): Promise<void> {
  try {
    if (!workspace.path || !session.currentPlanId || !session.currentItem) {
      ElMessage.error('会话状态异常，请返回重试')
      return
    }

    const title = bugForm.value.title.trim()
    if (!title) {
      ElMessage.warning('请输入 Bug 标题')
      return
    }

    const bugId = await bugStore.nextId()
    const stepsText = formatActions(session.actions)

    const bug: BugRecord = {
      id: bugId,
      title,
      description: bugForm.value.description,
      severity: bugForm.value.severity,
      status: 'open',
      planId: session.currentPlanId,
      itemId: session.currentItem.id,
      stepsText,
      actions: JSON.parse(JSON.stringify(toRaw(session.actions))),
      screenshots: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await bugStore.saveBug(bug)

    const result: TestResult = {
      planId: session.currentPlanId,
      itemId: session.currentItem.id,
      passed: false,
      testType: 'manual',
      testedAt: new Date().toISOString(),
      actions: JSON.parse(JSON.stringify(toRaw(session.actions))),
      notes: `Bug: ${bugId}`,
      bugId
    }

    await window.api.writeResult(workspace.path, result)
    await updatePlanItem(false, result.testedAt, `Bug: ${bugId}`, bugId)

    showBugDialog.value = false
    ElMessage.success(`Bug ${bugId} 已创建，可继续测试下一项`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    ElMessage.error(`提交失败: ${msg}`)
  }
}

function goBack(): void {
  session.clearSession()
  router.back()
}
</script>

<template>
  <div class="test-toolbar">
    <el-button @click="goBack">
      &larr; 返回
    </el-button>

    <span class="current-test" v-if="session.currentItem">
      当前测试: {{ session.currentItem.id }} {{ session.currentItem.feature }}
    </span>

    <div class="toolbar-actions">
      <ScreenshotButton
        :bug-id="'TEMP'"
        :web-contents-id="webContentsId"
      />
      <el-button type="success" @click="markPassed">
        通过
      </el-button>
      <el-button type="danger" @click="openBugDialog">
        不通过 → 提 Bug
      </el-button>
    </div>
  </div>

  <!-- Bug 提交对话框 -->
  <el-dialog v-model="showBugDialog" title="提交 Bug" width="600px" :close-on-click-modal="false">
    <el-form label-width="80px">
      <el-form-item label="标题" required>
        <el-input v-model="bugForm.title" placeholder="Bug 标题" />
      </el-form-item>
      <el-form-item label="严重程度">
        <el-select v-model="bugForm.severity" style="width: 100%">
          <el-option
            v-for="opt in severityOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="详细描述">
        <el-input
          v-model="bugForm.description"
          type="textarea"
          :rows="4"
          placeholder="描述 Bug 的具体表现、期望行为等"
        />
      </el-form-item>
      <el-form-item label="复现步骤">
        <div class="steps-preview">{{ stepsPreview || '（无操作记录）' }}</div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="showBugDialog = false">取消</el-button>
      <el-button type="danger" @click="submitBug">提交 Bug</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts">
import ScreenshotButton from './ScreenshotButton.vue'
</script>

<style scoped>
.test-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
}

.current-test {
  flex: 1;
  font-weight: 600;
  font-size: 14px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.steps-preview {
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 13px;
  white-space: pre-wrap;
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
  color: #606266;
}
</style>
