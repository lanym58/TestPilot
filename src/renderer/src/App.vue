<script setup lang="ts">
import { useWorkspaceStore } from './stores/workspaceStore'

const workspace = useWorkspaceStore()

async function handleOpenWorkspace(): Promise<void> {
  await workspace.openWorkspace()
}
</script>

<template>
  <div v-if="!workspace.isOpen" class="welcome">
    <div class="welcome-content">
      <h1>TestPilot</h1>
      <p>内嵌浏览器的文件式测试管理工具</p>
      <el-button type="primary" size="large" @click="handleOpenWorkspace">
        打开工作空间
      </el-button>
    </div>
  </div>

  <el-container v-else class="app-layout">
    <el-aside width="200px">
      <div class="aside-header">
        <h3>TestPilot</h3>
        <el-text size="small" type="info">{{ workspace.config?.name }}</el-text>
      </div>
      <el-menu :router="true" :default-active="$route.path">
        <el-menu-item index="/">
          <span>概览</span>
        </el-menu-item>
        <el-menu-item index="/plans">
          <span>测试计划</span>
        </el-menu-item>
        <el-menu-item index="/bugs">
          <span>Bug 列表</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-main>
      <router-view />
    </el-main>
  </el-container>
</template>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.welcome {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.welcome-content {
  text-align: center;
}

.welcome-content h1 {
  font-size: 48px;
  color: #409eff;
  margin-bottom: 8px;
}

.welcome-content p {
  color: #909399;
  margin-bottom: 24px;
}

.app-layout {
  height: 100vh;
}

.aside-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.aside-header h3 {
  margin: 0 0 4px;
}

.el-aside {
  border-right: 1px solid #e4e7ed;
  background: #fff;
}
</style>
