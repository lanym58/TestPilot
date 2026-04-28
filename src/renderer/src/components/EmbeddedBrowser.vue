<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useSessionStore } from '../stores/sessionStore'

const props = defineProps<{
  initialUrl?: string
}>()

const emit = defineEmits<{
  (e: 'webcontents-id', id: number): void
}>()

const session = useSessionStore()
const webviewRef = ref<HTMLElement | null>(null)
const urlInput = ref(props.initialUrl || '')
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
    session.browserUrl = event.url
  }))

  wv.addEventListener('did-navigate-in-page', ((e: unknown) => {
    const event = e as { url: string }
    urlInput.value = event.url
    session.browserUrl = event.url
  }))

  wv.addEventListener('ipc-message', ((e: unknown) => {
    const event = e as { channel: string; args: unknown[] }
    if (event.channel === 'recorder:action') {
      const action = event.args[0] as Parameters<typeof session.addAction>[0]
      session.addAction(action)
    }
  }))

  wv.addEventListener('dom-ready', () => {
    try {
      const id = wv.getWebContentsId()
      emit('webcontents-id', id)
    } catch { /* not available yet */ }
  })

  if (props.initialUrl) {
    wv.src = props.initialUrl
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
    </div>

    <webview
      v-if="recorderPreload"
      ref="webviewRef"
      class="browser-view"
      :preload="'file://' + recorderPreload"
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
