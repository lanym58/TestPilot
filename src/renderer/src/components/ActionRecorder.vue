<script setup lang="ts">
import { useSessionStore } from '../stores/sessionStore'
import { formatAction } from '../utils/actionFormatter'

const session = useSessionStore()

function addManualStep(): void {
  const description = window.prompt('输入观察步骤描述：')
  if (!description) return
  session.addAction({ type: 'observe', description, timestamp: Date.now() })
}

function removeStep(seq: number): void {
  session.removeAction(seq)
}
</script>

<template>
  <div class="action-recorder">
    <div class="recorder-header">
      <span class="title">操作记录</span>
      <el-tag v-if="session.isRecording" type="danger" size="small" effect="dark">
        录制中
      </el-tag>
    </div>

    <div class="action-list">
      <div
        v-for="action in session.actions"
        :key="action.seq"
        class="action-item"
      >
        <span class="action-text">{{ formatAction(action) }}</span>
        <el-button
          type="danger"
          size="small"
          text
          @click="removeStep(action.seq)"
        >
          &times;
        </el-button>
      </div>

      <el-empty v-if="session.actions.length === 0" description="等待操作..." :image-size="60" />
    </div>

    <div class="recorder-footer">
      <el-button size="small" @click="addManualStep">
        + 手动步骤
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.action-recorder {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid #e4e7ed;
}

.recorder-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #e4e7ed;
  background: #fafafa;
}

.title {
  font-weight: 600;
  font-size: 13px;
}

.action-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.action-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  margin-bottom: 2px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
}

.action-item:hover {
  background: #f5f7fa;
}

.action-text {
  flex: 1;
  word-break: break-all;
}

.recorder-footer {
  padding: 8px 12px;
  border-top: 1px solid #e4e7ed;
}
</style>
