import { create } from 'zustand'

export interface UpdateInfo {
  ok?: boolean
  currentVersion?: string
  latestVersion?: string
  version?: string
  available?: boolean
  required?: boolean
  packageUrl?: string
  sha256?: string
  size?: number
  releaseNotes?: string[]
  publishedAt?: string
}

export interface UpdateState {
  state: 'idle' | 'checking' | 'update_available' | 'downloading' | 'downloaded' | 'applying' | 'latest' | 'error'
  progress: number
  error: string | null
  updateInfo: UpdateInfo | null
  currentVersion: string
  
  checkForUpdates: () => Promise<void>
  downloadUpdate: () => Promise<void>
  applyUpdateAndRestart: () => Promise<void>
  initUpdater: () => void
}

export const useUpdateStore = create<UpdateState>((set) => ({
  state: 'idle',
  progress: 0,
  error: null,
  updateInfo: null,
  currentVersion: '1.0.0',

  checkForUpdates: async () => {
    set({ state: 'checking', error: null })
    try {
      const result = await window.bambooUpdater.checkForUpdates()
      set({
        state: result.state as any,
        error: result.error,
        updateInfo: result.updateInfo,
        currentVersion: (result as any).currentVersion || result.updateInfo?.currentVersion || '1.0.0'
      })
    } catch (e: any) {
      set({ state: 'error', error: e.message || 'Failed to check for updates' })
    }
  },

  downloadUpdate: async () => {
    set({ state: 'downloading', progress: 0, error: null })
    try {
      await window.bambooUpdater.downloadUpdate()
    } catch (e: any) {
      set({ state: 'error', error: e.message || 'Failed to download update' })
    }
  },

  applyUpdateAndRestart: async () => {
    set({ state: 'applying', error: null })
    try {
      await window.bambooUpdater.applyUpdateAndRestart()
    } catch (e: any) {
      set({ state: 'error', error: e.message || 'Failed to apply update' })
    }
  },

  initUpdater: async () => {
    try {
      // Sync initial status
      const initial = await window.bambooUpdater.getStatus()
      set({
        state: initial.state as any,
        progress: initial.progress,
        error: initial.error,
        updateInfo: initial.updateInfo,
        currentVersion: (initial as any).currentVersion || '1.0.0'
      })

      // Subscribe to changes
      window.bambooUpdater.onStatusChange((status: any) => {
        set({
          state: status.state,
          progress: status.progress,
          error: status.error,
          updateInfo: status.updateInfo,
          currentVersion: (status as any).currentVersion || '1.0.0'
        })
      })
    } catch (e) {
      console.error('Failed to initialize updater store bindings:', e)
    }
  }
}))
