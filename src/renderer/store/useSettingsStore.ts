import { create } from 'zustand'
import en from '../locales/en.json'
import ru from '../locales/ru.json'
import uk from '../locales/uk.json'
import { scheduleSync } from '../services/syncService'

export type Language = 'en' | 'ru' | 'uk'
export type Theme = 'dark' | 'light' | 'system'
export type StartupPage = 'newtab' | 'previous' | 'custom'

interface SettingsState {
  language: Language
  theme: Theme
  searchEngine: string
  searchEngineName: string
  homePage: string
  startupPage: StartupPage
  showBookmarksBar: boolean
  bookmarksBarVisibility: 'always' | 'newtab' | 'never'
  showOtherBookmarks: boolean
  compactTabs: boolean
  askDownloadFolder: boolean
  downloadFolder: string
  wallpaper: string | null
  trackingProtection: 'standard' | 'strict' | 'disabled'
  
  fetchSettings: () => Promise<void>
  setLanguage: (lang: Language) => Promise<void>
  setTheme: (theme: Theme) => Promise<void>
  setSearchEngine: (name: string, url: string) => Promise<void>
  setHomePage: (url: string) => Promise<void>
  setStartupPage: (type: StartupPage) => Promise<void>
  setShowBookmarksBar: (show: boolean) => Promise<void>
  setBookmarksBarVisibility: (visibility: 'always' | 'newtab' | 'never') => Promise<void>
  setShowOtherBookmarks: (show: boolean) => Promise<void>
  setCompactTabs: (compact: boolean) => Promise<void>
  setAskDownloadFolder: (ask: boolean) => Promise<void>
  setTrackingProtection: (protection: 'standard' | 'strict' | 'disabled') => Promise<void>
  resetSettings: () => Promise<void>
  updateSettings: (settings: Partial<SettingsState>) => void
  
  t: (key: string) => string
}

const translations: Record<Language, any> = { en, ru, uk }

export const useSettingsStore = create<SettingsState>((set, get) => ({
  language: 'en',
  theme: 'dark',
  searchEngine: 'https://www.google.com/search?q=',
  searchEngineName: 'Google',
  homePage: 'bamboo://newtab',
  startupPage: 'newtab',
  showBookmarksBar: true,
  bookmarksBarVisibility: 'always',
  showOtherBookmarks: true,
  compactTabs: false,
  askDownloadFolder: false,
  downloadFolder: '',
  wallpaper: null,
  trackingProtection: 'standard',

  fetchSettings: async () => {
    const settings = await (window as any).bambooApi.getSettings()
    set({ ...settings })
  },

  setLanguage: async (language) => {
    await (window as any).bambooApi.updateSettings({ language })
    set({ language })
    scheduleSync()
  },

  setTheme: async (theme) => {
    await (window as any).bambooApi.updateSettings({ theme })
    set({ theme })
    scheduleSync()
  },

  setSearchEngine: async (searchEngineName, searchEngine) => {
    await (window as any).bambooApi.updateSettings({ searchEngineName, searchEngine })
    set({ searchEngineName, searchEngine })
    scheduleSync()
  },

  setHomePage: async (homePage) => {
    await (window as any).bambooApi.updateSettings({ homePage })
    set({ homePage })
    scheduleSync()
  },

  setStartupPage: async (startupPage) => {
    await (window as any).bambooApi.updateSettings({ startupPage })
    set({ startupPage })
    scheduleSync()
  },

  setShowBookmarksBar: async (showBookmarksBar) => {
    const bookmarksBarVisibility = showBookmarksBar ? 'always' : 'never'
    await (window as any).bambooApi.updateSettings({ showBookmarksBar, bookmarksBarVisibility })
    set({ showBookmarksBar, bookmarksBarVisibility })
    scheduleSync()
  },

  setBookmarksBarVisibility: async (bookmarksBarVisibility) => {
    const showBookmarksBar = bookmarksBarVisibility !== 'never'
    await (window as any).bambooApi.updateSettings({ bookmarksBarVisibility, showBookmarksBar })
    set({ bookmarksBarVisibility, showBookmarksBar })
    scheduleSync()
  },

  setShowOtherBookmarks: async (showOtherBookmarks) => {
    await (window as any).bambooApi.updateSettings({ showOtherBookmarks })
    set({ showOtherBookmarks })
    scheduleSync()
  },

  setCompactTabs: async (compactTabs) => {
    await (window as any).bambooApi.updateSettings({ compactTabs })
    set({ compactTabs })
    scheduleSync()
  },

  setAskDownloadFolder: async (askDownloadFolder) => {
    await (window as any).bambooApi.updateSettings({ askDownloadFolder })
    set({ askDownloadFolder })
    scheduleSync()
  },

  setTrackingProtection: async (trackingProtection) => {
    await (window as any).bambooApi.updateSettings({ trackingProtection })
    set({ trackingProtection })
    scheduleSync()
  },

  resetSettings: async () => {
    const defaults: any = {
      language: 'en',
      theme: 'dark',
      searchEngine: 'https://www.google.com/search?q=',
      searchEngineName: 'Google',
      homePage: 'bamboo://newtab',
      startupPage: 'newtab',
      showBookmarksBar: true,
      bookmarksBarVisibility: 'always',
      showOtherBookmarks: true,
      compactTabs: false,
      askDownloadFolder: false,
      downloadFolder: '',
      wallpaper: null,
      trackingProtection: 'standard'
    }
    await (window as any).bambooApi.updateSettings(defaults)
    set({ ...defaults })
    scheduleSync()
  },

  updateSettings: (settings) => {
    set(settings)
  },

  t: (key: string) => {
    const { language } = get()
    const keys = key.split('.')
    let result = translations[language]
    for (const k of keys) {
      result = result?.[k]
      if (!result) return key
    }
    return result
  }
}))
