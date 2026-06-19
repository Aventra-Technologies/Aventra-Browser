import { apiClient } from './apiClient'
import { useAuthStore } from '../store/useAuthStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useBrowserStore } from '../store/useBrowserStore'
import { useTabStore } from '../store/useTabStore'

export const authService = {
  async register(data: any) {
    const response = await apiClient('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: false
    })
    
    // Assume response contains { user, accessToken, refreshToken }
    if (response.refreshToken) {
      await window.bambooApi.authSetToken('refreshToken', response.refreshToken)
    }
    if (response.accessToken) {
      await window.bambooApi.authSetToken('accessToken', response.accessToken)
    }
    
    const store = useAuthStore.getState()
    store.setAccessToken(response.accessToken)
    store.setUser(response.user)
    store.setError(null)
    
    await this.registerDevice()
    
    return response
  },

  async login(data: any) {
    const response = await apiClient('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth: false
    })
    
    if (response.refreshToken) {
      await window.bambooApi.authSetToken('refreshToken', response.refreshToken)
    }
    if (response.accessToken) {
      await window.bambooApi.authSetToken('accessToken', response.accessToken)
    }
    
    const store = useAuthStore.getState()
    store.setAccessToken(response.accessToken)
    store.setUser(response.user)
    store.setError(null)
    
    await this.registerDevice()
    
    return response
  },

  async logout() {
    const store = useAuthStore.getState()
    const token = store.accessToken
    
    if (token) {
      try {
        const deviceInfo = await window.bambooApi.authGetDeviceInfo()
        if (deviceInfo && deviceInfo.deviceId) {
          await apiClient(`/api/browser/devices/${deviceInfo.deviceId}`, {
            method: 'DELETE'
          })
        }
      } catch (e) {
        console.warn('Device deregistration failed', e)
      }
    }

    try {
      await apiClient('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.warn('Logout request failed, continuing local logout', e)
    }
    
    await window.bambooApi.authRemoveToken('refreshToken')
    await window.bambooApi.authRemoveToken('accessToken')
    store.logout()
  },

  async fetchMe() {
    const response = await apiClient('/api/auth/me', { method: 'GET' })
    useAuthStore.getState().setUser(response)
    return response
  },

  async registerDevice() {
    const store = useAuthStore.getState()
    if (!store.isAuthenticated || !store.accessToken) {
      store.setDeviceRegistered(false)
      return
    }

    try {
      const deviceInfo = await window.bambooApi.authGetDeviceInfo()
      await apiClient('/api/browser/devices/register', {
        method: 'POST',
        body: JSON.stringify(deviceInfo)
      })
      store.setDeviceRegistered(true)
      
      // Step 4: enable sync, call POST pull, push if needed
      store.setSyncEnabled(true)
      
      let pullResponse: any = null
      try {
        pullResponse = await apiClient('/api/browser/sync/pull', {
          method: 'POST'
        })
        
        // If pull returns data, update local stores
        if (pullResponse) {
          if (pullResponse.settings && Object.keys(pullResponse.settings).length > 0) {
            useSettingsStore.getState().updateSettings(pullResponse.settings)
          }
          if (Array.isArray(pullResponse.bookmarks)) {
            const newBookmarks = pullResponse.bookmarks.map((b: any) => ({
              id: b.id,
              title: b.title,
              url: b.url,
              favicon: b.favicon,
              addedAt: new Date(b.createdAt || b.updatedAt).getTime() || Date.now(),
              folderId: b.folderId
            }))
            useBrowserStore.setState({ bookmarks: newBookmarks })
          }
          if (Array.isArray(pullResponse.tabs)) {
            const newTabs = pullResponse.tabs.map((t: any) => ({
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
        }
        
        store.setLastSyncTime(Date.now())
      } catch (pullError) {
        console.warn('Sync pull failed', pullError)
      }
      
      // Check if sync push is needed
      const hasLocalBookmarks = useBrowserStore.getState().bookmarks.length > 0
      const hasLocalTabs = useTabStore.getState().tabs.length > 0
      const serverHasNoBookmarks = !pullResponse || !pullResponse.bookmarks || pullResponse.bookmarks.length === 0
      const serverHasNoTabs = !pullResponse || !pullResponse.tabs || pullResponse.tabs.length === 0
      
      const pushNeeded = pullResponse?.pushNeeded || 
                         pullResponse?.needPush || 
                         pullResponse?.need_push || 
                         (hasLocalBookmarks && serverHasNoBookmarks) || 
                         (hasLocalTabs && serverHasNoTabs)
                         
      if (pushNeeded) {
        try {
          await apiClient('/api/browser/sync/push', {
            method: 'POST'
          })
        } catch (pushError) {
          console.warn('Sync push failed', pushError)
        }
      }
    } catch (e) {
      console.warn('Device registration failed', e)
      store.setDeviceRegistered(false)
    }
  },

  async googleLogin() {
    try {
      const GOOGLE_AUTH_URL = 'https://api.bamboo-ecosystem.tech/api/auth/google/login'
      useTabStore.getState().addTab(GOOGLE_AUTH_URL)
    } catch (e: any) {
      throw new Error(e.message || 'Google login failed')
    }
  },
  
  async initAuth() {
    const store = useAuthStore.getState()
    store.setLoading(true)
    try {
      const storedAccessToken = await window.bambooApi.authGetToken('accessToken')
      const storedRefreshToken = await window.bambooApi.authGetToken('refreshToken')

      if (storedAccessToken) {
        store.setAccessToken(storedAccessToken)
      } else if (storedRefreshToken) {
        const newAccessToken = await window.bambooApi.authApiRefresh()
        store.setAccessToken(newAccessToken)
        await window.bambooApi.authSetToken('accessToken', newAccessToken)
      } else {
        store.logout()
        return
      }

      // Fetch user profile after restoring or refreshing the access token
      await this.fetchMe()
      
      // Register device once auth is confirmed
      await this.registerDevice()
      store.setError(null)
    } catch (e: any) {
      console.warn("Init auth failed", e)
      const isNetworkError = e.message?.includes('Network error') || e.message?.includes('Failed to fetch')
      if (isNetworkError && store.user) {
        console.warn('Network offline during startup. Retaining cached local session.')
        store.setError(null)
      } else {
        store.logout()
      }
    } finally {
      store.setLoading(false)
    }
  }
}
