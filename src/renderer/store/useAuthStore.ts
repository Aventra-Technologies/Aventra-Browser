import { create } from 'zustand'

export interface User {
  id: string
  email: string
  displayName: string
  avatar?: string
  status?: string
  connectedProviders?: string[]
  createdAt?: string
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isSyncEnabled: boolean
  loading: boolean
  error: string | null
  lastSyncTime: number | null
  isDeviceRegistered: boolean
  
  // Actions
  setUser: (user: User | null) => void
  setAccessToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSyncEnabled: (enabled: boolean) => void
  setLastSyncTime: (time: number | null) => void
  setDeviceRegistered: (registered: boolean) => void
  logout: () => void
}

const getCachedUser = () => {
  try {
    const data = localStorage.getItem('bamboo_user')
    return data ? JSON.parse(data) : null
  } catch (e) {
    return null
  }
}

const initialUser = getCachedUser()

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  accessToken: null,
  isAuthenticated: !!initialUser,
  isSyncEnabled: false,
  loading: true, // initial state before checking tokens
  error: null,
  lastSyncTime: null,
  isDeviceRegistered: false,
  
  setUser: (user) => {
    try {
      if (user) {
        localStorage.setItem('bamboo_user', JSON.stringify(user))
      } else {
        localStorage.removeItem('bamboo_user')
      }
    } catch (e) {
      console.warn('Failed to persist user to localStorage', e)
    }
    set({ user, isAuthenticated: !!user })
  },
  setAccessToken: (accessToken) => set({ accessToken }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSyncEnabled: (isSyncEnabled) => set({ isSyncEnabled }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
  setDeviceRegistered: (isDeviceRegistered) => set({ isDeviceRegistered }),
  logout: () => {
    try {
      localStorage.removeItem('bamboo_user')
    } catch (e) {
      console.warn('Failed to clear cached user', e)
    }
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isSyncEnabled: false,
      isDeviceRegistered: false,
      error: null,
      lastSyncTime: null
    })
  }
}))
