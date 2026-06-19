import { apiClient } from './apiClient'
import { useAuthStore } from '../store/useAuthStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useBrowserStore } from '../store/useBrowserStore'
import { useTabStore } from '../store/useTabStore'

const LOGIN_REQUIRED_MESSAGE = 'Login to Bamboo Account to enable sync'

const canSync = () => {
  const authStore = useAuthStore.getState()
  return Boolean(
    !authStore.loading &&
    authStore.isAuthenticated &&
    authStore.accessToken &&
    authStore.isSyncEnabled
  )
}

const requireSyncAuth = () => {
  const authStore = useAuthStore.getState()
  if (!canSync()) {
    authStore.setError(LOGIN_REQUIRED_MESSAGE)
    return false
  }

  authStore.setError(null)
  return true
}

export const syncService = {
  async pullSettings() {
    try {
      if (!requireSyncAuth()) return
      const remoteSettings = await apiClient('/api/browser/sync/settings', { method: 'GET' })
      const settings = remoteSettings?.settings ?? remoteSettings
      if (settings && Object.keys(settings).length > 0) {
        useSettingsStore.getState().updateSettings(settings)
      }
    } catch (e) {
      console.warn('Failed to pull settings', e)
    }
  },

  async pushSettings() {
    try {
      if (!requireSyncAuth()) return
      const state = useSettingsStore.getState()
      const payload = {
        theme: state.theme,
        language: state.language,
        searchEngine: state.searchEngine,
        homePage: state.homePage,
        showBookmarksBar: state.showBookmarksBar
      }
      await apiClient('/api/browser/sync/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings: payload })
      })
    } catch (e) {
      console.warn('Failed to push settings', e)
    }
  },

  async pullBookmarks() {
    try {
      if (!requireSyncAuth()) return
      const remoteBookmarks = await apiClient('/api/browser/sync/bookmarks', { method: 'GET' })
      const bookmarks = remoteBookmarks?.bookmarks ?? remoteBookmarks
      if (Array.isArray(bookmarks)) {
        // Merge logic: For now, simply setting them (or you can do a deeper merge using updatedAt)
        // Bamboo browser stores them via addBookmark, removeBookmark, or by overriding store
        const newBookmarks = bookmarks.map((b: any) => ({
          id: b.id,
          title: b.title,
          url: b.url,
          favicon: b.favicon,
          addedAt: new Date(b.createdAt || b.updatedAt).getTime() || Date.now(),
          folderId: b.folderId
        }))
        useBrowserStore.setState({ bookmarks: newBookmarks })
      }
    } catch (e) {
      console.warn('Failed to pull bookmarks', e)
    }
  },

  async pushBookmarks() {
    try {
      if (!requireSyncAuth()) return
      const bookmarks = useBrowserStore.getState().bookmarks
      const payload = bookmarks.map(b => ({
        id: b.id,
        title: b.title,
        url: b.url,
        favicon: b.favicon || '',
        folderId: b.folderId || null,
        createdAt: new Date(b.addedAt).toISOString(),
        updatedAt: new Date().toISOString()
      }))
      await apiClient('/api/browser/sync/bookmarks', {
        method: 'PUT',
        body: JSON.stringify({ bookmarks: payload })
      })
    } catch (e) {
      console.warn('Failed to push bookmarks', e)
    }
  },

  async pullTabs() {
    try {
      if (!requireSyncAuth()) return
      const remoteTabs = await apiClient('/api/browser/sync/tabs', { method: 'GET' })
      const tabs = remoteTabs?.tabs ?? remoteTabs
      if (Array.isArray(tabs)) {
        const newTabs = tabs.map((t: any) => ({
          id: t.id,
          title: t.title,
          url: t.url,
          favicon: t.favicon,
          pinned: t.pinned || false,
          loading: false,
          canGoBack: false,
          canGoForward: false
        }))
        if (newTabs.length > 0) {
          useTabStore.setState({ tabs: newTabs, activeTabId: newTabs[0].id })
        }
      }
    } catch (e) {
      console.warn('Failed to pull tabs', e)
    }
  },

  async pushTabs() {
    try {
      if (!requireSyncAuth()) return
      const { tabs, activeTabId } = useTabStore.getState()
      const payload = tabs.map(t => ({
        id: t.id,
        title: t.title,
        url: t.url,
        favicon: t.favicon || '',
        pinned: t.pinned || false,
        active: t.id === activeTabId,
        updatedAt: new Date().toISOString()
      }))
      await apiClient('/api/browser/sync/tabs', {
        method: 'PUT',
        body: JSON.stringify({ tabs: payload })
      })
    } catch (e) {
      console.warn('Failed to push tabs', e)
    }
  },

  async syncNow() {
    if (!requireSyncAuth()) return

    try {
      // Pull
      await Promise.all([
        this.pullSettings(),
        this.pullBookmarks(),
        this.pullTabs()
      ])
      
      // Push local state to ensure backend is fully in sync
      await Promise.all([
        this.pushSettings(),
        this.pushBookmarks(),
        this.pushTabs()
      ])
      
      useAuthStore.getState().setLastSyncTime(Date.now())
    } catch (e) {
      console.error('Sync failed', e)
    }
  }
}

// Debounce logic for automatic synchronization
let syncTimeout: any = null
export const scheduleSync = () => {
  if (!canSync()) return
  
  if (syncTimeout) clearTimeout(syncTimeout)
  syncTimeout = setTimeout(() => {
    syncService.syncNow()
  }, 4000) // 4 seconds debounce
}
