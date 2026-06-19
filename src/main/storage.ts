import Store from 'electron-store'

export interface Bookmark {
  id: string
  title: string
  url: string
  favicon?: string
  addedAt: number
}

export interface HistoryEntry {
  id: string
  title: string
  url: string
  favicon?: string
  visitedAt: number
}

export interface BrowserSettings {
  language: 'en' | 'ru' | 'uk'
  theme: 'dark' | 'light' | 'system'
  searchEngine: string
  searchEngineName: string
  homePage: string
  startupPage: 'newtab' | 'previous' | 'custom'
  showBookmarksBar: boolean
  bookmarksBarVisibility?: 'always' | 'newtab' | 'never'
  showOtherBookmarks?: boolean
  compactTabs: boolean
  askDownloadFolder: boolean
  downloadFolder: string
  wallpaper: string | null
  trackingProtection: 'standard' | 'strict' | 'disabled'
}

interface SessionTab {
  url: string
  title: string
  favicon?: string
  pinned: boolean
}

export interface Shortcut {
  id: string
  title: string
  url: string
}

interface BrowserSchema {
  bookmarks: Bookmark[]
  history: HistoryEntry[]
  shortcuts: Shortcut[]
  settings: BrowserSettings
  session: {
    tabs: SessionTab[]
    activeTabId?: string
    windowState: {
      width: number
      height: number
      x?: number
      y?: number
      isMaximized: boolean
    }
  }
}

const store = new Store<BrowserSchema>({
  defaults: {
    bookmarks: [],
    history: [],
    shortcuts: [
      { id: '1', title: 'Google', url: 'https://google.com' },
      { id: '2', title: 'YouTube', url: 'https://youtube.com' },
      { id: '3', title: 'GitHub', url: 'https://github.com' }
    ],
    settings: {
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
    },
    session: {
      tabs: [],
      windowState: {
        width: 1280,
        height: 800,
        isMaximized: false
      }
    }
  }
})

export default store
