import { create } from 'zustand'
import { scheduleSync } from '../services/syncService'

export interface Tab {
  id: string
  title: string
  url: string
  favicon?: string
  loading: boolean
  canGoBack: boolean
  canGoForward: boolean
  pinned?: boolean
  zoom?: number
}

interface TabState {
  tabs: Tab[]
  activeTabId: string | null
  closedTabs: string[]
  addTab: (url?: string) => void
  removeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTab: (id: string, updates: Partial<Tab>) => void
  restoreClosedTab: () => void
  togglePinTab: (id: string) => void
  duplicateTab: (id: string) => void
  moveTab: (fromIndex: number, toIndex: number) => void
  saveSession: () => Promise<void>
  loadSession: () => Promise<void>
}

const DEFAULT_URL = 'bamboo://newtab'

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  closedTabs: [],

  saveSession: async () => {
    const { tabs, activeTabId } = get()
    const sessionTabs = tabs.map(t => ({
      url: t.url,
      title: t.title,
      favicon: t.favicon,
      pinned: t.pinned || false,
      zoom: t.zoom || 1
    }))
    await (window as any).bambooApi.updateSession({
      tabs: sessionTabs,
      activeTabId
    })
    scheduleSync()
  },

  loadSession: async () => {
    const params = new URLSearchParams(window.location.search)
    const urlParam = params.get('url')
    if (urlParam) {
      get().addTab(urlParam)
      return
    }

    const sessionData = await (window as any).bambooApi.getSession()
    if (sessionData && sessionData.tabs && sessionData.tabs.length > 0) {
      let restoredTabs = sessionData.tabs
        .filter((t: any) => t.url !== 'bamboo://view')
        .map((t: any) => ({
          id: Math.random().toString(36).substring(7),
          ...t,
          loading: false,
          canGoBack: false,
          canGoForward: false,
          zoom: t.zoom || 1
        }))

      if (restoredTabs.length === 0) {
        const newId = Math.random().toString(36).substring(7)
        restoredTabs = [{
          id: newId,
          title: 'Новая вкладка',
          url: DEFAULT_URL,
          loading: false,
          canGoBack: false,
          canGoForward: false,
          pinned: false,
          zoom: 1
        }]
      }

      const restoredActiveId = sessionData.activeTabId === 'bamboo-view'
        ? 'bamboo-view'
        : (restoredTabs.find((t: any) => t.id === sessionData.activeTabId)?.id || restoredTabs[0].id)

      set({ 
        tabs: restoredTabs, 
        activeTabId: restoredActiveId 
      })
    } else {
      get().addTab()
    }
  },

  addTab: (url = DEFAULT_URL) => {
    const id = Math.random().toString(36).substring(7)
    const newTab: Tab = {
      id,
      title: 'Новая вкладка',
      url,
      loading: false,
      canGoBack: false,
      canGoForward: false,
      pinned: false,
      zoom: 1
    }
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: id,
    }))
    get().saveSession()
  },

  removeTab: (id) => {
    if (id === 'bamboo-view') return
    set((state) => {
      const tabToRemove = state.tabs.find(t => t.id === id)
      const newTabs = state.tabs.filter((t) => t.id !== id)
      
      let newActiveId = state.activeTabId
      if (state.activeTabId === id) {
        const closedIdx = state.tabs.findIndex(t => t.id === id)
        if (newTabs.length > 0) {
          const newIdx = closedIdx < newTabs.length ? closedIdx : newTabs.length - 1
          newActiveId = newTabs[newIdx].id
        } else {
          newActiveId = null
        }
      }

      const result = {
        tabs: newTabs,
        activeTabId: newActiveId,
        closedTabs: tabToRemove ? [tabToRemove.url, ...state.closedTabs] : state.closedTabs
      }

      if (result.tabs.length === 0) {
        const newId = Math.random().toString(36).substring(7)
        result.tabs = [{
          id: newId,
          title: 'Новая вкладка',
          url: DEFAULT_URL,
          loading: false,
          canGoBack: false,
          canGoForward: false,
          pinned: false,
          zoom: 1
        }]
        result.activeTabId = newId
      }

      return result
    })
    get().saveSession()
  },

  setActiveTab: (id) => {
    set({ activeTabId: id })
    get().saveSession()
  },

  updateTab: (id, updates) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }))
    if (updates.url || updates.title || updates.favicon) {
      get().saveSession()
    }
  },

  duplicateTab: (id) => {
    const tab = get().tabs.find(t => t.id === id)
    if (tab) {
      const newId = Math.random().toString(36).substring(7)
      const newTab: Tab = {
        id: newId,
        title: tab.title,
        url: tab.url,
        favicon: tab.favicon,
        loading: false,
        canGoBack: false,
        canGoForward: false,
        pinned: false,
        zoom: tab.zoom || 1
      }
      set((state) => ({
        tabs: [...state.tabs, newTab],
        activeTabId: newId,
      }))
      get().saveSession()
    }
  },

  moveTab: (fromIndex, toIndex) => {
    set((state) => {
      const newTabs = [...state.tabs]
      const [removed] = newTabs.splice(fromIndex, 1)
      newTabs.splice(toIndex, 0, removed)
      return { tabs: newTabs }
    })
    get().saveSession()
  },

  togglePinTab: (id) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t))
    }))
    get().saveSession()
  },
  
  restoreClosedTab: () => {
    set((state) => {
      if (state.closedTabs.length === 0) return state
      const [url, ...remaining] = state.closedTabs
      const id = Math.random().toString(36).substring(7)
      const newTab: Tab = {
        id,
        title: 'Restored Tab',
        url,
        loading: false,
        canGoBack: false,
        canGoForward: false,
        pinned: false
      }
      return {
        tabs: [...state.tabs, newTab],
        activeTabId: id,
        closedTabs: remaining
      }
    })
    get().saveSession()
  }
}))
