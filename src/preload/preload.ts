import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('bambooApi', {
  windowControl: (action: 'minimize' | 'maximize' | 'close') => {
    ipcRenderer.send('window-control', action)
  },
  onMainProcessMessage: (callback: (message: string) => void) => {
    ipcRenderer.on('main-process-message', (_event, message) => callback(message))
  },
  getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
  addBookmark: (bookmark: any) => ipcRenderer.invoke('add-bookmark', bookmark),
  updateBookmark: (id: string, updates: any) => ipcRenderer.invoke('update-bookmark', id, updates),
  removeBookmark: (id: string) => ipcRenderer.invoke('remove-bookmark', id),
  getShortcuts: () => ipcRenderer.invoke('get-shortcuts'),
  addShortcut: (shortcut: any) => ipcRenderer.invoke('add-shortcut', shortcut),
  removeShortcut: (id: string) => ipcRenderer.invoke('remove-shortcut', id),
  getHistory: () => ipcRenderer.invoke('get-history'),
  addHistory: (entry: any) => ipcRenderer.invoke('add-history', entry),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  onDownloadStarted: (callback: (data: any) => void) => ipcRenderer.on('download-started', (_, data) => callback(data)),
  onDownloadProgress: (callback: (data: any) => void) => ipcRenderer.on('download-progress', (_, data) => callback(data)),
  onDownloadCompleted: (callback: (id: string) => void) => ipcRenderer.on('download-completed', (_, id) => callback(id)),
  onDownloadFailed: (callback: (id: string) => void) => ipcRenderer.on('download-failed', (_, id) => callback(id)),
  onDownloadInterrupted: (callback: (id: string) => void) => ipcRenderer.on('download-interrupted', (_, id) => callback(id)),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: any) => ipcRenderer.invoke('update-settings', settings),
  clearCache: () => ipcRenderer.invoke('clear-cache'),
  exitApp: () => ipcRenderer.send('exit-app'),
  getSession: () => ipcRenderer.invoke('get-session'),
  updateSession: (sessionData: any) => ipcRenderer.invoke('update-session', sessionData),
  openFile: (path: string) => ipcRenderer.send('open-file', path),
  showItemInFolder: (path: string) => ipcRenderer.send('show-item-in-folder', path),
  newWindow: (incognito: boolean, url?: string) => ipcRenderer.send('new-window', incognito, url),
  downloadUrl: (url: string) => ipcRenderer.invoke('download-url', url),
  authSetToken: (key: string, value: string) => ipcRenderer.invoke('auth-set-token', key, value),
  authGetToken: (key: string) => ipcRenderer.invoke('auth-get-token', key),
  authRemoveToken: (key: string) => ipcRenderer.invoke('auth-remove-token', key),
  authGetDeviceInfo: () => ipcRenderer.invoke('auth-get-device-info'),
  authSetDeviceName: (newName: string) => ipcRenderer.invoke('auth-set-device-name', newName),
  authApiRefresh: () => ipcRenderer.invoke('auth-api-refresh'),
  authGoogleLogin: () => ipcRenderer.invoke('auth-google-login'),
  captureWebContents: (webContentsId: number) => ipcRenderer.invoke('capture-web-contents', webContentsId),
})

contextBridge.exposeInMainWorld('bambooUpdater', {
  checkForUpdates: () => ipcRenderer.invoke('updater-check'),
  downloadUpdate: () => ipcRenderer.invoke('updater-download'),
  applyUpdateAndRestart: () => ipcRenderer.invoke('updater-apply'),
  getStatus: () => ipcRenderer.invoke('updater-get-status'),
  onStatusChange: (callback: (status: any) => void) => {
    ipcRenderer.on('updater-status-change', (_event, status) => callback(status))
  }
})
