<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useSessionStore } from '../stores/sessionStore'

const props = defineProps<{
  initialUrl?: string
  fullscreen?: boolean
}>()

const emit = defineEmits<{
  (e: 'webcontents-id', id: number): void
  (e: 'toggle-fullscreen'): void
}>()

const session = useSessionStore()
const webviewRef = ref<HTMLElement | null>(null)
const urlInput = ref(props.initialUrl || session.browserUrl || '')
const isLoading = ref(false)
const canGoBack = ref(false)
const canGoForward = ref(false)
const recorderPreload = ref('')
let webviewBound = false

interface WebViewElement extends HTMLElement {
  src: string
  loadURL(url: string): void
  goBack(): void
  goForward(): void
  reload(): void
  canGoBack(): boolean
  canGoForward(): boolean
  getWebContentsId(): number
}

function getWv(): WebViewElement | null {
  return webviewRef.value as unknown as WebViewElement | null
}

function navigate(): void {
  const wv = getWv()
  if (!wv) return

  let url = urlInput.value.trim()
  if (!url) return
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`
    urlInput.value = url
  }
  wv.src = url
}

function goBack(): void {
  const wv = getWv()
  if (wv?.canGoBack()) wv.goBack()
}

function goForward(): void {
  const wv = getWv()
  if (wv?.canGoForward()) wv.goForward()
}

function doReload(): void {
  getWv()?.reload()
}

function bindWebview(wv: WebViewElement): void {
  if (webviewBound) return
  webviewBound = true

  wv.addEventListener('did-start-loading', () => {
    isLoading.value = true
  })

  wv.addEventListener('did-stop-loading', () => {
    isLoading.value = false
    canGoBack.value = wv.canGoBack()
    canGoForward.value = wv.canGoForward()
  })

  wv.addEventListener('did-navigate', ((e: unknown) => {
    const event = e as { url: string }
    urlInput.value = event.url
    session.saveLastUrl(event.url)
  }))

  wv.addEventListener('did-navigate-in-page', ((e: unknown) => {
    const event = e as { url: string }
    urlInput.value = event.url
    session.saveLastUrl(event.url)
  }))

  const VALID_ACTION_TYPES = new Set(['click', 'input', 'scroll', 'navigate', 'observe'])

  wv.addEventListener('ipc-message', ((e: unknown) => {
    const event = e as { channel: string; args: unknown[] }
    if (event.channel !== 'recorder:action') return

    const raw = event.args[0]
    if (typeof raw !== 'object' || raw === null) return
    const a = raw as Record<string, unknown>
    if (!VALID_ACTION_TYPES.has(a.type as string)) return

    session.addAction({
      type: a.type as 'click' | 'input' | 'scroll' | 'navigate' | 'observe',
      selector: typeof a.selector === 'string' ? a.selector.slice(0, 200) : undefined,
      label: typeof a.label === 'string' ? a.label.slice(0, 50) : undefined,
      value: typeof a.value === 'string' ? a.value.slice(0, 500) : undefined,
      url: typeof a.url === 'string' ? a.url.slice(0, 2000) : undefined,
      target: typeof a.target === 'string' ? a.target.slice(0, 100) : undefined,
      description: typeof a.description === 'string' ? a.description.slice(0, 500) : undefined,
      timestamp: typeof a.timestamp === 'number' ? a.timestamp : Date.now()
    })
  }))

  wv.addEventListener('dom-ready', () => {
    try {
      const id = wv.getWebContentsId()
      emit('webcontents-id', id)
    } catch { /* not available yet */ }
  })

  const autoUrl = props.initialUrl || session.browserUrl
  if (autoUrl) {
    wv.src = autoUrl
  }
}

onMounted(async () => {
  recorderPreload.value = await window.api.getRecorderPreload()

  // webview renders after recorderPreload is set — wait for next tick
  await nextTick()

  const wv = getWv()
  if (wv) bindWebview(wv)
})

// Also watch ref in case nextTick wasn't enough
watch(webviewRef, (el) => {
  if (el) bindWebview(el as unknown as WebViewElement)
})

watch(() => props.initialUrl, (url) => {
  if (url) {
    urlInput.value = url
    const wv = getWv()
    if (wv) wv.src = url
  }
})
</script>

<template>
  <div class="embedded-browser">
    <div class="browser-toolbar">
      <el-button-group size="small">
        <el-button :disabled="!canGoBack" @click="goBack">
          &lt;
        </el-button>
        <el-button :disabled="!canGoForward" @click="goForward">
          &gt;
        </el-button>
        <el-button @click="doReload">
          &#x21bb;
        </el-button>
      </el-button-group>

      <el-input
        v-model="urlInput"
        size="small"
        placeholder="输入网址..."
        class="url-input"
        @keyup.enter="navigate"
      >
        <template #append>
          <el-button @click="navigate" :loading="isLoading">
            前往
          </el-button>
        </template>
      </el-input>

      <el-tooltip :content="fullscreen ? '退出全屏 (Esc)' : '浏览器全屏'" placement="bottom">
        <el-button size="small" @click="emit('toggle-fullscreen')">
          {{ fullscreen ? '⊠' : '⊞' }}
        </el-button>
      </el-tooltip>
    </div>

    <webview
      v-if="recorderPreload"
      ref="webviewRef"
      class="browser-view"
      :preload="'file://' + recorderPreload"
      partition="persist:testpilot"
    />
  </div>
</template>

<style scoped>
.embedded-browser {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.browser-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.url-input {
  flex: 1;
}

.browser-view {
  flex: 1;
  border: none;
}
</style>
