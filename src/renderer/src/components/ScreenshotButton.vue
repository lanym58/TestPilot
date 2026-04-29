<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useWorkspaceStore } from '../stores/workspaceStore'

const props = defineProps<{
  webContentsId?: number
}>()

const emit = defineEmits<{
  (e: 'captured', filename: string): void
}>()

const isTaking = ref(false)
const screenshotCount = ref(0)

async function takeScreenshot(): Promise<void> {
  const ws = useWorkspaceStore()
  if (!ws.path || !props.webContentsId) {
    ElMessage.warning('无法截图：webview 未就绪')
    return
  }

  isTaking.value = true
  try {
    screenshotCount.value++
    const prefix = `SCR-${Date.now()}`
    const filename = await window.api.captureScreenshot(
      ws.path,
      prefix,
      screenshotCount.value,
      props.webContentsId
    )
    if (filename) {
      ElMessage.success(`截图已保存: ${filename}`)
      emit('captured', filename)
    } else {
      ElMessage.error('截图失败')
      screenshotCount.value--
    }
  } finally {
    isTaking.value = false
  }
}
</script>

<template>
  <el-button
    type="warning"
    :loading="isTaking"
    @click="takeScreenshot"
  >
    截图
  </el-button>
</template>
