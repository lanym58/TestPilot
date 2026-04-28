<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useWorkspaceStore } from '../stores/workspaceStore'

const props = defineProps<{
  bugId?: string
  webContentsId?: number
}>()

const isTaking = ref(false)
const screenshotCount = ref(0)

async function takeScreenshot(): Promise<void> {
  const ws = useWorkspaceStore()
  if (!ws.path || !props.bugId || !props.webContentsId) {
    ElMessage.warning('请先设置 Bug ID')
    return
  }

  isTaking.value = true
  try {
    screenshotCount.value++
    const filename = await window.api.captureScreenshot(
      ws.path,
      props.bugId,
      screenshotCount.value,
      props.webContentsId
    )
    if (filename) {
      ElMessage.success(`截图已保存: ${filename}`)
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
