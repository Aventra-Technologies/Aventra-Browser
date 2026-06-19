export {}

declare global {
  interface Window {
    bambooApi: {
      windowControl: (action: 'minimize' | 'maximize' | 'close') => void
      onMainProcessMessage: (callback: (message: string) => void) => void
      getBookmarks: () => Promise<any[]>
      addBookmark: (bookmark: any) => Promise<void>
      updateBookmark: (id: string, updates: any) => Promise<void>
      removeBookmark: (id: string) => Promise<void>
      getShortcuts: () => Promise<any[]>
      addShortcut: (shortcut: any) => Promise<void>
      removeShortcut: (id: string) => Promise<void>
      getHistory: () => Promise<any[]>
      addHistory: (entry: any) => Promise<void>
      clearHistory: () => Promise<void>
      onDownloadStarted: (callback: (data: any) => void) => void
      onDownloadProgress: (callback: (data: any) => void) => void
      onDownloadCompleted: (callback: (id: string) => void) => void
      onDownloadFailed: (callback: (id: string) => void) => void
      onDownloadInterrupted: (callback: (id: string) => void) => void
      getSettings: () => Promise<any>
      updateSettings: (settings: any) => Promise<void>
      clearCache: () => Promise<void>
      exitApp: () => void
      getSession: () => Promise<any>
      updateSession: (session: any) => Promise<void>
      openFile: (path: string) => void
      showItemInFolder: (path: string) => void
      newWindow: (incognito: boolean) => void
      authSetToken: (key: string, value: string) => Promise<boolean>
      authGetToken: (key: string) => Promise<string | null>
      authRemoveToken: (key: string) => Promise<boolean>
      authGetDeviceInfo: () => Promise<any>
      authSetDeviceName: (newName: string) => Promise<any>
      authApiRefresh: () => Promise<string>
      authGoogleLogin: () => Promise<{ accessToken: string; refreshToken: string }>
      captureWebContents: (webContentsId: number) => Promise<string>
    }
    bambooUpdater: {
      checkForUpdates: () => Promise<{ state: string; error: string | null; updateInfo: any }>
      downloadUpdate: () => Promise<void>
      applyUpdateAndRestart: () => Promise<void>
      getStatus: () => Promise<{ state: string; progress: number; error: string | null; updateInfo: any }>
      onStatusChange: (callback: (status: any) => void) => void
    }
  }
}
