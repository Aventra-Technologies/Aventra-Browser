import React, { useEffect } from 'react'
import TitleBar from './components/TitleBar/TitleBar'
import TabStrip from './components/TabStrip/TabStrip'
import AddressBar from './components/AddressBar/AddressBar'
import BookmarksBar from './components/Bookmarks/BookmarksBar'
import Sidebar from './components/Sidebar/Sidebar'
import DownloadsOverlay from './components/Downloads/DownloadsOverlay'
import WebViewContainer from './components/WebView/WebViewContainer'
import ContextMenu from './components/ContextMenu/ContextMenu'
import { useContextMenuStore } from './store/useContextMenuStore'
import { useTabStore } from './store/useTabStore'
import { useBrowserStore } from './store/useBrowserStore'
import { useSettingsStore } from './store/useSettingsStore'
import { useDownloadStore } from './store/useDownloadStore'
import { authService } from './services/authService'
import { updateService } from './services/updateService'
import styles from './App.module.scss'

const App: React.FC = () => {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab, updateTab, restoreClosedTab, loadSession } = useTabStore()
  const { addHistory, fetchHistory, setSidebarOpen, addBookmark, fetchShortcuts } = useBrowserStore()
  const { fetchSettings, showBookmarksBar, theme } = useSettingsStore()
  const { addDownload, updateProgress, completeDownload, failDownload, interruptDownload } = useDownloadStore()

  useEffect(() => {
    // Theme sync
    const root = document.documentElement
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark')
      root.classList.remove('light')
      root.setAttribute('data-theme', 'dark')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
      root.setAttribute('data-theme', 'light')
    }
  }, [theme])

  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target && target.tagName.toLowerCase() === 'webview') {
        return
      }

      e.preventDefault()

      let type: 'link' | 'image' | 'text' | 'page' = 'page'
      let linkURL = ''
      let srcURL = ''
      const selectionText = window.getSelection()?.toString() || ''

      const linkEl = target.closest('a')
      if (linkEl) {
        type = 'link'
        linkURL = linkEl.href
      } else if (target.tagName.toLowerCase() === 'img') {
        type = 'image'
        srcURL = (target as HTMLImageElement).src
      } else if (selectionText.trim().length > 0) {
        type = 'text'
      }

      useContextMenuStore.getState().openMenu(e.clientX, e.clientY, type, {
        x: e.clientX,
        y: e.clientY,
        linkURL,
        srcURL,
        selectionText,
        tabId: activeTabId || undefined
      })
    }

    window.addEventListener('contextmenu', handleGlobalContextMenu)
    return () => {
      window.removeEventListener('contextmenu', handleGlobalContextMenu)
    }
  }, [activeTabId])

  useEffect(() => {
    loadSession()
    fetchHistory()
    fetchSettings()
    fetchShortcuts()
    authService.initAuth()
    updateService.init()

    // Set up download listeners
    window.bambooApi.onDownloadStarted((data) => addDownload(data))
    window.bambooApi.onDownloadProgress((data) => updateProgress(data.id, data.received))
    window.bambooApi.onDownloadCompleted((id) => completeDownload(id))
    window.bambooApi.onDownloadFailed((id) => failDownload(id))
    window.bambooApi.onDownloadInterrupted((id) => interruptDownload(id))

    // Handle global shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const { tabs, activeTabId } = useTabStore.getState()
      
      if (e.ctrlKey) {
        if (e.shiftKey) {
          switch (e.key.toLowerCase()) {
            case 't':
              e.preventDefault()
              restoreClosedTab()
              break
            case 'tab':
              e.preventDefault()
              // Previous tab
              if (tabs.length > 1) {
                const prevIdx = (tabs.findIndex(t => t.id === activeTabId) - 1 + tabs.length) % tabs.length
                setActiveTab(tabs[prevIdx].id)
              }
              break
          }
          return
        }

        switch (e.key.toLowerCase()) {
          case 't':
            e.preventDefault()
            addTab()
            break
          case 'w':
            e.preventDefault()
            if (activeTabId) removeTab(activeTabId)
            break
          case 'l':
            e.preventDefault()
            document.querySelector<HTMLInputElement>('.address-bar-input')?.focus()
            break
          case 'h':
            e.preventDefault()
            setSidebarOpen(!useBrowserStore.getState().isSidebarOpen)
            break
          case 'r':
            e.preventDefault()
            // Reload active tab
            const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any
            if (webview) webview.reload()
            break
          case 'd':
            e.preventDefault()
            const activeTab = tabs.find(t => t.id === activeTabId)
            if (activeTab) addBookmark({ title: activeTab.title, url: activeTab.url, favicon: activeTab.favicon })
            break
          case 'tab':
            e.preventDefault()
            // Next tab
            if (tabs.length > 1) {
              const nextIdx = (tabs.findIndex(t => t.id === activeTabId) + 1) % tabs.length
              setActiveTab(tabs[nextIdx].id)
            }
            break
          case '=':
          case '+':
            e.preventDefault()
            const tabToZoomIn = tabs.find(t => t.id === activeTabId)
            if (tabToZoomIn) {
              const newZoom = Math.min(3, (tabToZoomIn.zoom || 1) + 0.1)
              updateTab(tabToZoomIn.id, { zoom: newZoom })
            }
            break
          case '-':
            e.preventDefault()
            const tabToZoomOut = tabs.find(t => t.id === activeTabId)
            if (tabToZoomOut) {
              const newZoom = Math.max(0.5, (tabToZoomOut.zoom || 1) - 0.1)
              updateTab(tabToZoomOut.id, { zoom: newZoom })
            }
            break
          case '0':
            e.preventDefault()
            const tabToResetZoom = tabs.find(t => t.id === activeTabId)
            if (tabToResetZoom) {
              updateTab(tabToResetZoom.id, { zoom: 1 })
            }
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const activeTab = tabs.find(t => t.id === activeTabId)
    if (activeTab && !activeTab.loading && activeTab.url !== 'bamboo://newtab' && activeTab.title !== 'New Tab') {
      addHistory({ title: activeTab.title, url: activeTab.url, favicon: activeTab.favicon })
    }
  }, [activeTabId, tabs.find(t => t.id === activeTabId)?.loading])

  return (
    <div className={styles.appContainer}>
      <div className={styles.topBar}>
        <div className={styles.titleTabsRow}>
          <TabStrip />
          <TitleBar />
        </div>
        <AddressBar />
        {showBookmarksBar && <BookmarksBar />}
      </div>
      <main className={styles.mainContent}>
        <Sidebar />
        <DownloadsOverlay />
        <WebViewContainer />
      </main>
      <ContextMenu />
    </div>
  )
}

export default App
