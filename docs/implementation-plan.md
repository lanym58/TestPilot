# TestPilot 实现计划

## Phase 1: 项目脚手架 + 文件服务（2天）

### 1.1 创建 Electron 项目
- [ ] 使用 electron-vite 脚手架创建项目（Vue 3 + TypeScript 模板）
- [ ] 配置 electron-builder 打包
- [ ] 安装依赖：element-plus、pinia、markdown-it、uuid、vue-router

### 1.2 文件服务层
- [ ] 实现 `src/main/fileService.ts`
  - `openWorkspace(path)` — 打开工作空间，自动创建子目录
  - `listPlans()` / `readPlan(id)` / `writePlanState(id, state)` / `deletePlan(id)`
  - `listBugs()` / `readBug(id)` / `writeBug(bug)` / `deleteBug(id)`
  - `listFixes(bugId?)` / `readFix(id)` / `writeFix(fix)`
  - `listAutoTestRuns()` / `readAutoTestRun(id)`
  - `readTestResult(planId, itemId)` / `writeTestResult(result)`
  - `copyScreenshot(sourcePath, bugId)` — 复制截图到 screenshots/
  - `generateWorkspaceClaudeMd()` — 生成 WORKSPACE_CLAUDE.md
- [ ] 文件写入使用原子操作（写 .tmp 再 rename）

### 1.3 IPC 桥接
- [ ] 实现 `src/main/ipcHandlers.ts` — 注册所有 ipcMain.handle
- [ ] 实现 `src/preload/index.ts` — contextBridge 暴露 `window.api`

### 1.4 Pinia Stores
- [ ] `workspaceStore.ts` — 工作空间路径、打开/关闭
- [ ] `planStore.ts` — 计划列表、当前计划
- [ ] `sessionStore.ts` — 当前测试会话、操作缓冲
- [ ] `bugStore.ts` — Bug 列表、筛选状态

---

## Phase 2: 基础 UI — 计划和仪表盘（2天）

### 2.1 路由和布局
- [ ] 配置 vue-router 路由表
  - `/` — Dashboard
  - `/plans` — PlanList
  - `/plans/:id` — PlanDetail
  - `/test/:planId/:itemId` — TestSession
  - `/bugs` — BugList
  - `/bugs/:id` — BugDetail
- [ ] 主布局：左侧导航栏 + 右侧内容区

### 2.2 Dashboard 概览页
- [ ] 统计卡片：计划数、模块数、功能项数、测试要点数
- [ ] 完成率进度条（已测/总数）
- [ ] Bug 状态分布（open/fixing/fixed/verified/closed）
- [ ] 最近测试活动列表

### 2.3 测试计划管理
- [ ] PlanList：计划卡片列表，每个显示名称、导入日期、进度
- [ ] 导入按钮：文件选择器选 .md 文件
- [ ] PlanDetail：按模块折叠展示功能项，每项显示状态标签
- [ ] 每个功能项有「开始测试」按钮跳转 TestSession

### 2.4 Markdown 解析器
- [ ] 实现 `markdownParser.ts`
- [ ] 解析规则：
  - `## 一、xxx` / `## 二、xxx` → 一级模块
  - `### 2A. xxx` → 二级模块
  - 表格行 `| 1.1 | 功能项 | 描述 | 要点 | [ ] |` → 测试项
  - `[ ]` / `[x]` → passed 状态
- [ ] 兼容 test-plan.md 的表格格式

---

## Phase 3: 内嵌浏览器 + 操作录制（4天）⭐ 核心

### 3.1 EmbeddedBrowser 组件
- [ ] 使用 Electron `<webview>` 标签嵌入
- [ ] 地址栏（可输入 URL、回车导航）
- [ ] 导航按钮：后退、前进、刷新
- [ ] 加载状态指示器
- [ ] 配置 webpreferences：contextIsolation, preload 指向 recorder.ts
- [ ] 处理 `will-navigate`、`did-navigate`、`did-fail-load` 事件

### 3.2 操作录制脚本
- [ ] 实现 `src/preload/recorder.ts`
- [ ] 捕获事件：
  - **click**: 元素选择器 + label + 坐标
  - **input/change**: 选择器 + label + value（密码记为 `[密码]`）
  - **navigate**: URL 变化（popstate, hashchange）
  - **scroll**: 防抖，过滤 < 100px
- [ ] 元素标签识别：aria-label > data-testid > label > placeholder > innerText
- [ ] input 事件 500ms 防抖，只记录最终值
- [ ] 通过 `ipcRenderer.sendToHost()` 发送到主窗口

### 3.3 ActionRecorder 侧栏
- [ ] 实时显示操作列表，每条带图标（点击/输入/导航/滚动）
- [ ] 每条可内联编辑
- [ ] 「+手动步骤」按钮添加 type=observe 的观察记录
- [ ] 「清除」按钮重置操作列表
- [ ] 步骤自动编号

### 3.4 TestSession 页面
- [ ] 分栏布局（可拖拽调整宽度）
- [ ] 左栏上部：ActionRecorder
- [ ] 左栏下部：TestChecklist（显示当前测试项的要点清单）
- [ ] 右栏：EmbeddedBrowser（填满剩余空间）
- [ ] 顶部工具栏：返回按钮、当前测试项标题、截图/通过/不通过按钮
- [ ] 进入时自动导航到测试项的 targetUrl（如已配置）
- [ ] 接收 webview 的 ipc-message 事件，推送到 sessionStore

---

## Phase 4: 截图 + 测试结果（2天）

### 4.1 截图服务
- [ ] 实现 `src/main/browserCapture.ts`
- [ ] `captureWebview(webContentsId, savePath)` 使用 `webContents.capturePage()`
- [ ] 保存为 PNG 到 screenshots/ 目录
- [ ] 文件名格式：`{bugId}-{seq}.png` 或 `session-{timestamp}.png`

### 4.2 ScreenshotButton
- [ ] 悬浮在内嵌浏览器右上角
- [ ] 点击后截图、显示缩略图 toast 提示
- [ ] 截图路径暂存到 sessionStore，提 Bug 时自动附加

### 4.3 TestToolbar
- [ ] 「通过」按钮：弹出备注对话框 → 保存测试结果（passed=true + 操作记录）→ 更新计划状态
- [ ] 「不通过→提Bug」按钮：
  1. 调用 actionFormatter 生成中文复现步骤
  2. 弹出 Bug 表单（标题预填、复现步骤已填、截图已附）
  3. 补充严重度、备注
  4. 保存 Bug + 测试结果（passed=false, bugId 关联）
- [ ] 「保存草稿」：保存当前操作记录，不标记结果

### 4.4 操作格式化
- [ ] 实现 `actionFormatter.ts`
- [ ] 转换规则：
  - navigate → `打开 {url}`
  - click → `点击【{label}】`
  - input(有值) → `在【{label}】输入 "{value}"`
  - input(无值) → `【{label}】留空`
  - scroll → `滚动至 {target}`
  - observe → `观察：{description}`
- [ ] 输出带编号的复现步骤文本

---

## Phase 5: Bug 管理（2天）

### 5.1 BugList 页面
- [ ] 表格列：编号、标题、严重度、状态、关联测试项、创建日期
- [ ] 筛选：状态（全部/open/fixing/fixed/verified/closed）、严重度
- [ ] 按日期倒序排列
- [ ] 「新建 Bug」按钮（不通过测试项时的手动入口）

### 5.2 BugDetail 页面
- [ ] Bug 基本信息（可编辑标题、描述、严重度）
- [ ] 状态流转按钮：open → fixing → fixed → verified → closed
- [ ] 复现步骤（渲染 stepsText）
- [ ] 截图画廊（点击放大）
- [ ] 修复记录列表（从 fixes/ 读取关联此 Bug 的 FIX-*.json）
  - 每条显示：修改的文件、结果标签、回归测试标记、备注
- [ ] 关联测试项链接（跳转到 PlanDetail 高亮该项）

### 5.3 失败测试自动创建 Bug
- [ ] TestToolbar 点「不通过」时自动生成 Bug JSON
- [ ] 预填：标题 = `[{itemId}] {feature}`、复现步骤、操作记录、截图
- [ ] 用户只需补充严重度和额外说明

---

## Phase 6: ClaudeCode 集成 + 收尾（2天）

### 6.1 WORKSPACE_CLAUDE.md 生成
- [ ] 打开工作空间时自动生成/更新
- [ ] 包含：Bug 修复流程说明、文件格式规范、目录说明
- [ ] 包含当前 open 状态的 Bug 列表摘要

### 6.2 修复记录查看
- [ ] BugDetail 中展示关联的 FIX-*.json 内容
- [ ] 使用 `fs.watch` 监控 fixes/ 目录
- [ ] ClaudeCode 写入新文件时 UI 自动刷新
- [ ] 回归测试标记（regressionTested）可视化

### 6.3 自动测试 vs 手动测试
- [ ] 测试结果中 testType 字段：`manual` / `automated`
- [ ] PlanDetail 中用不同图标/颜色区分
- [ ] auto-tests/ 目录文件监听，自动更新对应测试项状态
- [ ] Dashboard 显示自动/手动测试比例

### 6.4 快捷键
- [ ] `Ctrl+Shift+S` — 截图
- [ ] `Ctrl+Shift+P` — 标记通过
- [ ] `Ctrl+Shift+F` — 标记不通过 / 提 Bug
- [ ] `Ctrl+Shift+M` — 添加手动观察步骤

### 6.5 会话管理
- [ ] 每 30 秒自动保存会话草稿到 `.testpilot/session-draft.json`
- [ ] 进入 TestSession 时检查是否有草稿，提示恢复
- [ ] 正常完成测试后清除草稿

### 6.6 导出功能
- [ ] 导出 Bug 为 Markdown（用于粘贴到 issue tracker）
- [ ] 导出测试报告为 Markdown（汇总表格 + 通过率）
