# TestPilot — 内嵌浏览器的文件式测试管理工具

## 项目概述

TestPilot 是一个 Electron 桌面应用，用于手动测试管理。核心特性是内嵌浏览器测试工作台：测试者在工具中直接操作被测 Web 应用，工具自动录制所有操作，失败时一键生成含复现步骤和截图的 Bug 报告。所有数据以 JSON 文件存储在用户选择的工作空间文件夹中，无需数据库。

## 技术栈

- **桌面框架**: Electron + electron-vite
- **前端**: Vue 3 + TypeScript + Pinia
- **UI 组件**: Element Plus
- **Markdown 解析**: markdown-it
- **ID 生成**: uuid
- **语言**: 界面使用中文

## 项目结构

```
testpilot/
├── src/
│   ├── main/                         # Electron 主进程
│   │   ├── index.ts                  # 窗口管理、应用生命周期
│   │   ├── fileService.ts            # JSON 文件 CRUD（plans/bugs/results/screenshots）
│   │   ├── browserCapture.ts         # 截图服务 webContents.capturePage()
│   │   └── ipcHandlers.ts            # IPC 桥接注册
│   ├── preload/
│   │   ├── index.ts                  # 主窗口 preload（暴露 IPC API）
│   │   └── recorder.ts              # 注入 webview 的操作录制脚本
│   └── renderer/
│       ├── App.vue
│       ├── router.ts
│       ├── stores/
│       │   ├── workspaceStore.ts     # 工作空间状态
│       │   ├── planStore.ts          # 测试计划状态
│       │   ├── sessionStore.ts       # 当前测试会话 + 操作缓冲
│       │   └── bugStore.ts           # Bug 列表状态
│       ├── views/
│       │   ├── Dashboard.vue         # 概览仪表盘
│       │   ├── PlanList.vue          # 测试计划列表
│       │   ├── PlanDetail.vue        # 计划详情（模块/功能项树）
│       │   ├── TestSession.vue       # 测试工作台（内嵌浏览器 + 操作录制）
│       │   ├── BugList.vue           # Bug 列表
│       │   └── BugDetail.vue         # Bug 详情（复现步骤 + 截图 + 修复记录）
│       ├── components/
│       │   ├── EmbeddedBrowser.vue   # webview 包装（地址栏 + 前进后退刷新）
│       │   ├── ActionRecorder.vue    # 实时操作记录侧栏
│       │   ├── ScreenshotButton.vue  # 悬浮截图按钮
│       │   ├── TestToolbar.vue       # 通过/不通过/提Bug 工具栏
│       │   ├── ManualStepInput.vue   # 手动添加观察步骤
│       │   └── TestChecklist.vue     # 测试要点清单
│       └── utils/
│           ├── actionFormatter.ts    # 操作记录 → 中文复现步骤文本
│           └── markdownParser.ts     # 解析 MD 测试计划表格
```

## 工作空间文件夹结构

用户选择一个文件夹作为工作空间，数据按子文件夹分类保存：

```
workspace/
├── WORKSPACE_CLAUDE.md               # 给 ClaudeCode 看的操作说明（自动生成）
├── .testpilot/config.json             # 工作空间配置
├── plans/
│   ├── plan-001.md                    # 导入的原始 markdown（只读副本）
│   └── plan-001.state.json            # 解析后的结构 + 勾选状态
├── bugs/
│   └── BUG-0001.json                  # Bug 记录
├── screenshots/
│   └── BUG-0001-1.png                 # Bug 截图
├── fixes/
│   └── FIX-0001.json                  # 修复记录（关联 Bug）
├── results/
│   └── plan-001/
│       └── item-1.1.json             # 测试结果（含操作录制）
└── auto-tests/
    └── run-2026-04-28T10-30.json      # 自动化测试结果
```

## 数据格式

### plan-001.state.json（测试计划状态）
```json
{
  "planId": "plan-001",
  "name": "TYZCSys 测试计划",
  "sourceFile": "plan-001.md",
  "importedAt": "2026-04-28T10:00:00Z",
  "modules": [
    {
      "id": "m1",
      "name": "认证与登录",
      "items": [
        {
          "id": "1.1",
          "feature": "用户名密码登录",
          "description": "输入用户名和密码完成身份认证，获取JWT令牌",
          "testPoints": "① 正确账号密码能登录成功并跳转首页 ② 错误密码提示...",
          "passed": null,
          "testType": "manual",
          "testedAt": null,
          "notes": "",
          "bugId": null
        }
      ]
    }
  ]
}
```

### BUG-0001.json（Bug 记录）
```json
{
  "id": "BUG-0001",
  "title": "[1.1] 空密码提交无校验",
  "description": "提交空密码时无表单验证提示",
  "severity": "high",
  "status": "open",
  "planId": "plan-001",
  "itemId": "1.1",
  "stepsText": "复现步骤：\n1. 打开 http://localhost:3000/login\n2. 在【用户名】输入框输入 \"admin\"\n3. 【密码】留空\n4. 点击【登录】按钮\n5. 观察：页面无响应，无错误提示",
  "actions": [
    { "seq": 1, "type": "navigate", "url": "http://localhost:3000/login" },
    { "seq": 2, "type": "input", "selector": "#username", "label": "用户名", "value": "admin" },
    { "seq": 3, "type": "input", "selector": "#password", "label": "密码", "value": "" },
    { "seq": 4, "type": "click", "selector": ".login-btn", "label": "登录" },
    { "seq": 5, "type": "observe", "description": "页面无响应，无错误提示" }
  ],
  "screenshots": ["BUG-0001-1.png"],
  "createdAt": "2026-04-28T14:05:00Z",
  "updatedAt": "2026-04-28T14:05:00Z"
}
```

### FIX-0001.json（修复记录，ClaudeCode 写入）
```json
{
  "id": "FIX-0001",
  "bugId": "BUG-0001",
  "changedFiles": [
    { "file": "frontend/src/views/login/index.vue", "description": "添加 el-form required 校验规则" },
    { "file": "frontend/src/views/login/utils/rule.ts", "description": "新增密码非空校验函数" }
  ],
  "result": "fixed",
  "notes": "添加了 Element Plus 表单校验规则 + 单元测试",
  "regressionTested": false,
  "author": "claudecode",
  "createdAt": "2026-04-28T15:00:00Z"
}
```

### results/plan-001/item-1.1.json（测试结果 + 操作录制）
```json
{
  "planId": "plan-001",
  "itemId": "1.1",
  "passed": false,
  "testType": "manual",
  "testedAt": "2026-04-28T14:00:00Z",
  "actions": [
    { "seq": 1, "type": "navigate", "url": "http://localhost:3000/login", "timestamp": 1714312800000 },
    { "seq": 2, "type": "input", "selector": "#username", "label": "用户名", "value": "admin" },
    { "seq": 3, "type": "click", "selector": ".login-btn", "label": "登录" },
    { "seq": 4, "type": "observe", "description": "页面无响应" }
  ],
  "notes": "空密码提交无校验",
  "bugId": "BUG-0001"
}
```

### auto-tests/run-*.json（自动化测试结果）
```json
{
  "runId": "run-2026-04-28T10-30",
  "runner": "claudecode",
  "timestamp": "2026-04-28T10:30:00Z",
  "results": [
    { "planId": "plan-001", "itemId": "1.1", "passed": true, "output": "Login test passed", "duration": 1200 },
    { "planId": "plan-001", "itemId": "1.2", "passed": false, "output": "Logout redirect failed", "duration": 800 }
  ]
}
```

## 操作录制机制

### recorder.ts 注入到 webview
- 捕获事件：click、input/change、popstate/hashchange、scroll
- 元素标签识别优先级：`aria-label` > `data-testid` > `<label>` 文本 > `placeholder` > `innerText`（截断20字）
- 通过 `ipcRenderer.sendToHost()` 发送给主窗口
- 密码字段值记录为 `[密码]`，不记录明文
- input 事件 500ms 防抖，只记录最终值
- scroll 事件过滤小于 100px 的滚动

### actionFormatter.ts 转换规则
- `navigate` → `打开 {url}`
- `click` → `点击【{label}】`
- `input` → `在【{label}】输入 "{value}"`（空值 → `【{label}】留空`）
- `scroll` → `滚动至 {target}`
- `observe` → `观察：{description}`

## 测试工作台 UI 布局

```
┌──────────────────────────────────────────────────────────────┐
│  [← 返回]  当前测试: 1.1 用户名密码登录  [截图] [通过] [不通过→提Bug] │
├────────────────┬─────────────────────────────────────────────┤
│  操作记录(自动)  │                                             │
│  1. 打开 login │         内嵌浏览器 (webview)                  │
│  2. 输入 admin │       显示被测试的 Web 应用                    │
│  3. 点击【登录】│                                             │
│  [+手动步骤]    │                                             │
│────────────────│                                             │
│  测试要点:      │                                             │
│  ① 正确账号..  │                                             │
│  ② 错误密码..  │                                             │
└────────────────┴─────────────────────────────────────────────┘
```

## 快捷键

- `Ctrl+Shift+S` — 截图
- `Ctrl+Shift+P` — 标记通过
- `Ctrl+Shift+F` — 标记不通过 / 提 Bug
- `Ctrl+Shift+M` — 添加手动观察步骤

## WORKSPACE_CLAUDE.md 模板

工具打开工作空间时自动生成此文件，指导 ClaudeCode 如何写入修复记录：

```markdown
# 测试工作空间 — ClaudeCode 操作说明

## Bug 修复流程

修复本工作空间中的 Bug 时，请遵循以下步骤：

1. 读取 `bugs/BUG-XXXX.json` 了解问题
2. 在目标项目中修复代码
3. 在 `fixes/` 目录创建修复记录文件：
   - 文件名：`FIX-XXXX.json`（递增编号）
   - 格式：
     {
       "id": "FIX-XXXX",
       "bugId": "BUG-XXXX",
       "changedFiles": [{ "file": "路径", "description": "修改说明" }],
       "result": "fixed | partially_fixed | not_fixed",
       "notes": "备注",
       "regressionTested": false,
       "author": "claudecode",
       "createdAt": "ISO时间"
     }
4. 如果运行了自动化测试，将结果保存到 `auto-tests/run-YYYY-MM-DDTHH-MM.json`

## 文件位置
- Bug 记录：`bugs/BUG-*.json`
- 修复记录：`fixes/FIX-*.json`
- 自动测试结果：`auto-tests/run-*.json`
- 截图：`screenshots/`
```

## 实现阶段

### Phase 1: 项目脚手架 + 文件服务（2天）
1. electron-vite 创建项目（Vue 3 + TypeScript）
2. 安装依赖：element-plus、pinia、markdown-it、uuid
3. 实现 fileService.ts — 所有文件 I/O
4. IPC 桥接 + preload 暴露 API
5. Pinia stores 骨架（workspace、plan、session、bug）

### Phase 2: 基础 UI — 计划和仪表盘（2天）
6. 路由 + 布局框架
7. Dashboard 概览页（计划数/功能项数/要点数/完成率/Bug数）
8. PlanList + PlanDetail（导入 MD、模块树、状态标签）
9. markdownParser.ts — 解析 MD 表格（`| # | 功能项 | ... | 通过 |` 格式）

### Phase 3: 内嵌浏览器 + 操作录制（4天）⭐ 核心
10. EmbeddedBrowser 组件（webview + 地址栏 + 导航）
11. recorder.ts 预加载脚本（注入 webview，捕获 DOM 事件）
12. ActionRecorder 侧栏（实时操作列表、可编辑、可手动添加）
13. TestSession 页面（分栏布局，串联所有组件）

### Phase 4: 截图 + 测试结果（2天）
14. browserCapture.ts（capturePage → PNG）
15. ScreenshotButton 悬浮按钮
16. TestToolbar（通过/不通过/草稿）
17. actionFormatter.ts（操作→中文文本）

### Phase 5: Bug 管理（2天）
18. BugList 页面（表格 + 筛选 + 状态标签）
19. BugDetail 页面（复现步骤 + 截图画廊 + 修复记录 + 状态流转）
20. 失败测试 → 自动创建 Bug（预填复现步骤和截图）

### Phase 6: ClaudeCode 集成 + 收尾（2天）
21. 打开工作空间时生成 WORKSPACE_CLAUDE.md
22. 修复记录视图 + fixes/ 目录文件监听自动刷新
23. 自动测试 vs 手动测试区分标记
24. 快捷键注册
25. 会话草稿自动保存与恢复

## 编码规范

- 使用 TypeScript strict 模式
- 组件使用 `<script setup lang="ts">`
- 文件命名：组件 PascalCase，工具函数 camelCase
- 每个文件 < 400 行，超出则拆分
- 所有用户输入做校验
- 文件写入使用原子操作（写临时文件再重命名）
