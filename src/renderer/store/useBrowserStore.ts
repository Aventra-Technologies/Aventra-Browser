import { create } from 'zustand'
import { scheduleSync } from '../services/syncService'

export interface Bookmark {
  id: string
  title: string
  url: string
  favicon?: string
  addedAt: number
  folderId?: string
  isFolder?: boolean
  isSeparator?: boolean
}

export interface BookmarkFolder {
  id: string
  title: string
  parentId?: string
}

export interface Shortcut {
  id: string
  title: string
  url: string
}

interface HistoryEntry {
  id: string
  title: string
  url: string
  favicon?: string
  visitedAt: number
}

interface BrowserState {
  bookmarks: Bookmark[]
  bookmarkFolders: BookmarkFolder[]
  history: HistoryEntry[]
  shortcuts: Shortcut[]
  isSidebarOpen: boolean
  clipboard: { item: any, mode: 'cut' | 'copy' } | null
  setSidebarOpen: (open: boolean) => void
  setClipboard: (clipboard: { item: any, mode: 'cut' | 'copy' } | null) => void
  fetchBookmarks: () => Promise<void>
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'addedAt'>) => Promise<void>
  updateBookmark: (id: string, updates: Partial<Bookmark>) => Promise<void>
  removeBookmark: (id: string) => Promise<void>
  fetchHistory: () => Promise<void>
  addHistory: (entry: Omit<HistoryEntry, 'id' | 'visitedAt'>) => Promise<void>
  clearHistory: () => Promise<void>
  fetchShortcuts: () => Promise<void>
  addShortcut: (shortcut: Omit<Shortcut, 'id'>) => Promise<void>
  removeShortcut: (id: string) => Promise<void>
}

export const useBrowserStore = create<BrowserState>((set, get) => ({
  bookmarks: [],
  bookmarkFolders: [],
  history: [],
  shortcuts: [],
  isSidebarOpen: false,
  clipboard: null,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setClipboard: (clipboard) => set({ clipboard }),

  fetchBookmarks: async () => {
    const bookmarks = await (window as any).bambooApi.getBookmarks()
    set({ bookmarks })
  },
  addBookmark: async (bookmark) => {
    const { bookmarks } = get()
    
    // Only check for duplicate URLs for actual bookmarks
    if (bookmark.url && !bookmark.isFolder && !bookmark.isSeparator) {
      if (bookmarks.some(b => b.url === bookmark.url && !b.isFolder && !b.isSeparator)) {
        return
      }
    }

    const newBookmark = {
      ...bookmark,
      id: Math.random().toString(36).substring(7),
      addedAt: Date.now(),
    }
    await (window as any).bambooApi.addBookmark(newBookmark)
    await get().fetchBookmarks()
    scheduleSync()
  },
  updateBookmark: async (id, updates) => {
    await (window as any).bambooApi.updateBookmark(id, updates)
    await get().fetchBookmarks()
    scheduleSync()
  },
  removeBookmark: async (id) => {
    await (window as any).bambooApi.removeBookmark(id)
    // If we delete a folder, we should also delete all bookmarks inside it recursively
    const { bookmarks } = get()
    const folderItems = bookmarks.filter(b => b.folderId === id)
    for (const item of folderItems) {
      await (window as any).bambooApi.removeBookmark(item.id)
    }
    await get().fetchBookmarks()
    scheduleSync()
  },

  fetchHistory: async () => {
    const history = await (window as any).bambooApi.getHistory()
    set({ history })
  },
  addHistory: async (entry) => {
    const newEntry = {
      ...entry,
      id: Math.random().toString(36).substring(7),
      visitedAt: Date.now(),
    }
    await (window as any).bambooApi.addHistory(newEntry)
    await get().fetchHistory()
  },
  clearHistory: async () => {
    await (window as any).bambooApi.clearHistory()
    set({ history: [] })
  },
  fetchShortcuts: async () => {
    const shortcuts = await (window as any).bambooApi.getShortcuts()
    set({ shortcuts })
  },
  addShortcut: async (shortcut) => {
    const newShortcut = {
      ...shortcut,
      id: Math.random().toString(36).substring(7),
    }
    await (window as any).bambooApi.addShortcut(newShortcut)
    await get().fetchShortcuts()
  },
  removeShortcut: async (id) => {
    await (window as any).bambooApi.removeShortcut(id)
    await get().fetchShortcuts()
  },
}))