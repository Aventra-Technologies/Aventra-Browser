import { app, BrowserWindow, shell, ipcMain, session, webContents } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'
import * as fs from 'fs'
import store from './storage'
import { setupAuthHandlers } from './auth'
import { setupUpdateManager } from './updateManager'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Suppress AMD DirectComposition GPU errors in console
app.commandLine.appendSwitch('disable-features', 'DirectCompositionVideoOverlays')

process.env.DIST = join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : join(process.env.DIST, '../public')

let trackingProtectionMode = (store as any).get('settings.trackingProtection') || 'standard'

function isBlockedUrl(rawUrl: string, mode: 'standard' | 'strict' | 'disabled'): boolean {
  if (mode === 'disabled') return false;
  
  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    // Standard blocked hosts
    const standardHosts = [
      'google-analytics.com',
      'googletagmanager.com',
      'googlesyndication.com',
      'googleadservices.com',
      'doubleclick.net',
      'adnxs.com',
      'adsystem.com',
      'amazon-adsystem.com',
      'facebook.net',
      'hotjar.com',
      'mixpanel.com',
      'amplitude.com',
      'scorecardresearch.com',
      'quantserve.com',
      'mc.yandex.ru',
      'criteo.com',
      'taboola.com',
      'outbrain.com',
      'adroll.com'
    ];

    // Special path checks for standard blocking
    if (hostname.endsWith('facebook.com') && pathname.startsWith('/tr/')) {
      return true;
    }
    if (hostname.endsWith('yandex.ru') && pathname.startsWith('/clck/')) {
      return true;
    }

    const matchesStandardHost = standardHosts.some(host =>
      hostname === host || hostname.endsWith('.' + host)
    );
    if (matchesStandardHost) return true;

    // Strict blocked hosts
    if (mode === 'strict') {
      const strictHosts = [
        'disqus.com',
        'snapchat.com'
      ];
      const matchesStrictHost = strictHosts.some(host =>
        hostname === host || hostname.endsWith('.' + host)
      );
      if (matchesStrictHost) return true;

      // Special path checks for strict blocking
      if (hostname.endsWith('twitter.com') && pathname.startsWith('/widgets')) {
        return true;
      }
      if (hostname === 'platform.twitter.com') {
        return true;
      }
      if (hostname.endsWith('linkedin.com') && pathname.startsWith('/analytics/')) {
        return true;
      }
      if (hostname.endsWith('pinterest.com') && pathname.startsWith('/tr/')) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

const setupSessionBlocking = (sess: any) => {
  sess.webRequest.onBeforeRequest((details: any, callback: any) => {
    if (isBlockedUrl(details.url, trackingProtectionMode)) {
      return callback({ cancel: true })
    }
    callback({ cancel: false })
  })
}

let win: BrowserWindow | null = null
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow(incognito = false, initialUrl?: string) {
  const sessionData = (store as any).get('session')
  const { width, height, x, y, isMaximized } = sessionData.windowState

  const newWin = new BrowserWindow({
    width: width || 1280,
    height: height || 800,
    x,
    y,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#070a0f',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      sandbox: false,
      partition: incognito ? `incognito_${Date.now()}` : undefined
    },
  })

  if (!win) win = newWin

  if (isMaximized) {
    newWin.maximize()
  }

  const saveWindowState = () => {
    const bounds = newWin.getBounds()
    const isMax = newWin.isMaximized()
    ;(store as any).set('session.windowState', {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: isMax
    })
  }

  newWin.on('resize', saveWindowState)
  newWin.on('move', saveWindowState)
  newWin.on('maximize', saveWindowState)
  newWin.on('unmaximize', saveWindowState)

  // Test active push message to Renderer-process.
  newWin.webContents.on('did-finish-load', () => {
    newWin?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  newWin.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('bamboo://')) {
      e.preventDefault()
    }
  })

  const urlParams = initialUrl ? `?url=${encodeURIComponent(initialUrl)}` : ''
  const hash = incognito ? '#incognito' : ''

  if (VITE_DEV_SERVER_URL) {
    newWin.loadURL(VITE_DEV_SERVER_URL + urlParams + hash)
  } else {
    newWin.loadFile(join(process.env.DIST || '', 'index.html'), { 
      hash,
      query: initialUrl ? { url: initialUrl } : undefined
    })
  }

  // Open external links in default browser
  newWin.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('session-created', (sess) => {
  setupSessionBlocking(sess)
})

app.whenReady().then(() => {
  setupSessionBlocking(session.defaultSession)

  // Set up security headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:; frame-src 'self' https:; worker-src 'self' blob:; child-src 'self' https:; object-src 'none';"]
      }
    })
  })

  // Set up download manager
  session.defaultSession.on('will-download', (event, item, webContents) => {
    const fileName = item.getFilename()
    const fileSize = item.getTotalBytes()
    const filePath = join(app.getPath('downloads'), fileName)
    item.setSavePath(filePath)

    const downloadId = Math.random().toString(36).substring(7)
    
    win?.webContents.send('download-started', {
      id: downloadId,
      name: fileName,
      size: fileSize,
      path: filePath,
    })

    item.on('updated', (event, state) => {
      if (state === 'interrupted') {
        win?.webContents.send('download-interrupted', downloadId)
      } else if (state === 'progressing') {
        if (win && !win.isDestroyed()) {
          win.setProgressBar(item.getReceivedBytes() / fileSize)
          win.webContents.send('download-progress', {
            id: downloadId,
            received: item.getReceivedBytes(),
          })
        }
      }
    })

    item.once('done', (event, state) => {
      if (win && !win.isDestroyed()) {
        win.setProgressBar(-1)
        if (state === 'completed') {
          win.webContents.send('download-completed', downloadId)
        } else {
          win.webContents.send('download-failed', downloadId)
        }
      }
    })
  })

  createWindow()
})

setupAuthHandlers()
setupUpdateManager()

// IPC Handlers
ipcMain.on('window-control', (_, action: 'minimize' | 'maximize' | 'close') => {
  const sender = BrowserWindow.fromWebContents(_.sender)
  if (!sender) return
  if (action === 'minimize') sender.minimize()
  else if (action === 'maximize') sender.isMaximized() ? sender.unmaximize() : sender.maximize()
  else if (action === 'close') sender.close()
})

ipcMain.on('new-window', (_, incognito = false, initialUrl?: string) => {
  createWindow(incognito, initialUrl)
})

ipcMain.handle('download-url', (event, url) => {
  const contents = event.sender
  if (contents) {
    contents.session.downloadURL(url)
  }
})

ipcMain.handle('get-bookmarks', () => (store as any).get('bookmarks'))
ipcMain.handle('add-bookmark', (_, bookmark) => {
  const bookmarks = (store as any).get('bookmarks')
  ;(store as any).set('bookmarks', [...bookmarks, bookmark])
})
ipcMain.handle('update-bookmark', (_, id, updates) => {
  const bookmarks = (store as any).get('bookmarks')
  ;(store as any).set('bookmarks', bookmarks.map((b: any) => b.id === id ? { ...b, ...updates } : b))
})
ipcMain.handle('remove-bookmark', (_, id) => {
  const bookmarks = (store as any).get('bookmarks')
  ;(store as any).set('bookmarks', bookmarks.filter((b: any) => b.id !== id))
})

ipcMain.handle('get-shortcuts', () => (store as any).get('shortcuts') || [])
ipcMain.handle('add-shortcut', (_, shortcut) => {
  const shortcuts = (store as any).get('shortcuts') || []
  ;(store as any).set('shortcuts', [...shortcuts, shortcut])
})
ipcMain.handle('remove-shortcut', (_, id) => {
  const shortcuts = (store as any).get('shortcuts') || []
  ;(store as any).set('shortcuts', shortcuts.filter((s: any) => s.id !== id))
})

ipcMain.handle('get-history', () => (store as any).get('history'))
ipcMain.handle('add-history', (_, entry) => {
  const history = (store as any).get('history')
  ;(store as any).set('history', [entry, ...history.slice(0, 999)]) // Keep last 1000 entries
})
ipcMain.handle('clear-history', () => (store as any).set('history', []))

ipcMain.handle('get-settings', () => (store as any).get('settings'))
ipcMain.handle('update-settings', (_, settings) => {
  const current = (store as any).get('settings')
  ;(store as any).set('settings', { ...current, ...settings })
  if (settings.trackingProtection !== undefined) {
    trackingProtectionMode = settings.trackingProtection
  }
})

ipcMain.handle('capture-web-contents', async (_, webContentsId) => {
  const contents = webContents.fromId(webContentsId)
  if (!contents) throw new Error('WebContents not found')
  const image = await contents.capturePage()
  const pngBuffer = image.toPNG()
  const filePath = join(app.getPath('downloads'), `screenshot_${Date.now()}.png`)
  await fs.promises.writeFile(filePath, pngBuffer)
  return filePath
})

ipcMain.handle('clear-cache', async () => {
  if (session.defaultSession) {
    await session.defaultSession.clearCache()
    await session.defaultSession.clearStorageData()
  }
})

ipcMain.on('exit-app', () => {
  app.quit()
})

ipcMain.handle('get-session', () => (store as any).get('session'))
ipcMain.handle('update-session', (_, sessionData) => {
  const current = (store as any).get('session')
  ;(store as any).set('session', { ...current, ...sessionData })
})

ipcMain.on('open-file', (_, path) => {
  shell.openPath(path)
})

ipcMain.on('show-item-in-folder', (_, path) => {
  shell.showItemInFolder(path)
})
