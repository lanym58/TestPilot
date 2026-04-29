import { app, shell, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerIpcHandlers, isAuthorizedWorkspace } from './ipcHandlers'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.testpilot.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  registerShortcuts()
  registerFixesWatcher()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// --- Shortcuts ---
const SHORTCUTS: Array<{ key: string; channel: string }> = [
  { key: 'CommandOrControl+Shift+S', channel: 'shortcut:screenshot' },
  { key: 'CommandOrControl+Shift+P', channel: 'shortcut:pass' },
  { key: 'CommandOrControl+Shift+F', channel: 'shortcut:fail' },
  { key: 'CommandOrControl+Shift+M', channel: 'shortcut:manual-step' }
]

let shortcutsRegistered = false

function registerShortcuts(): void {
  app.on('browser-window-focus', () => {
    if (shortcutsRegistered) return
    for (const { key, channel } of SHORTCUTS) {
      globalShortcut.register(key, () => {
        BrowserWindow.getFocusedWindow()?.webContents.send(channel)
      })
    }
    shortcutsRegistered = true
  })

  app.on('browser-window-blur', () => {
    if (!shortcutsRegistered) return
    for (const { key } of SHORTCUTS) {
      globalShortcut.unregister(key)
    }
    shortcutsRegistered = false
  })
}

// --- Fixes directory watcher ---
let fixesWatcher: fs.FSWatcher | null = null

function registerFixesWatcher(): void {
  ipcMain.handle('watch:fixes', (_e, workspacePath: string) => {
    if (!isAuthorizedWorkspace(workspacePath)) return
    if (fixesWatcher) {
      fixesWatcher.close()
    }
    const fixesDir = join(workspacePath, 'fixes')
    if (!fs.existsSync(fixesDir)) return

    fixesWatcher = fs.watch(fixesDir, (eventType, filename) => {
      if (filename?.endsWith('.json')) {
        const wins = BrowserWindow.getAllWindows()
        for (const win of wins) {
          win.webContents.send('fixes:changed', filename)
        }
      }
    })
  })

  ipcMain.handle('watch:stop', () => {
    if (fixesWatcher) {
      fixesWatcher.close()
      fixesWatcher = null
    }
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
