import React, { useEffect, useRef, useState } from 'react'
import { useTabStore } from '../../store/useTabStore'
import { useAuthStore } from '../../store/useAuthStore'
import { useContextMenuStore } from '../../store/useContextMenuStore'
import { authService } from '../../services/authService'
import HomePage from '../../pages/HomePage'
import SettingsPage from '../../pages/SettingsPage'
import HistoryPage from '../../pages/HistoryPage'
import DownloadsPage from '../../pages/DownloadsPage'
import AccountPage from '../../pages/AccountPage/AccountPage'
import BambooViewPage from '../../pages/BambooViewPage'
import styles from './WebViewContainer.module.scss'

const WebViewContainer: React.FC = () => {
  const { tabs, activeTabId, updateTab } = useTabStore()

  return (
    <div className={styles.container}>
      {activeTabId === 'bamboo-view' && (
        <div className={styles.tabContent} style={{ display: 'block' }}>
          <BambooViewPage />
        </div>
      )}

      {tabs.map((tab) => {
        const isNewTab = tab.url === 'bamboo://newtab'
        const isSettings = tab.url === 'bamboo://settings'
        const isHistory = tab.url === 'bamboo://history'
        const isDownloads = tab.url === 'bamboo://downloads'
        const isAccount = tab.url === 'bamboo://account'
        const isView = tab.url === 'bamboo://view'
        
        return (
          <div
            key={tab.id}
            className={`${styles.tabContent} ${tab.id === activeTabId ? styles.active : ''}`}
            style={{ display: tab.id === activeTabId ? 'block' : 'none' }}
          >
            {isNewTab ? (
              <HomePage />
            ) : isSettings ? (
              <SettingsPage />
            ) : isHistory ? (
              <HistoryPage />
            ) : isDownloads ? (
              <DownloadsPage />
            ) : isAccount ? (
              <AccountPage />
            ) : isView ? (
              <BambooViewPage />
            ) : (
              <WebViewItem
                tabId={tab.id}
                url={tab.url}
                isActive={tab.id === activeTabId}
                zoom={tab.zoom}
                onUpdate={(updates) => updateTab(tab.id, updates)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

interface WebViewItemProps {
  tabId: string
  url: string
  isActive: boolean
  zoom?: number
  onUpdate: (updates: any) => void
}

const WebViewItem: React.FC<WebViewItemProps> = ({ tabId, url, zoom = 1, onUpdate }) => {
  const webviewRef = useRef<any>(null)
  const [initialUrl] = useState(url)
  const isInitialLoad = useRef(true)

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    if (isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }

    try {
      const currentUrl = webview.getURL()
      if (currentUrl !== url) {
        webview.loadURL(url)
      }
    } catch (e) {
      try {
        webview.loadURL(url)
      } catch (err) {}
    }
  }, [url])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    const handleDomReady = () => {
      try {
        webview.setZoomFactor(zoom)
      } catch (e) {}
    }

    webview.addEventListener('dom-ready', handleDomReady)
    try {
      webview.setZoomFactor(zoom)
    } catch (e) {}

    return () => {
      if (webview) webview.removeEventListener('dom-ready', handleDomReady)
    }
  }, [zoom])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    const checkAuthCallback = async (targetUrl: string) => {
      const CALLBACK_URL = 'https://api.bamboo-ecosystem.tech/api/auth/google/callback'
      if (targetUrl && targetUrl.startsWith(CALLBACK_URL)) {
        try {
          const parsed = new URL(targetUrl)
          const accessToken = parsed.searchParams.get('accessToken')
          const refreshToken = parsed.searchParams.get('refreshToken')
          
          if (accessToken && refreshToken) {
            // Save tokens securely
            await window.bambooApi.authSetToken('accessToken', accessToken)
            await window.bambooApi.authSetToken('refreshToken', refreshToken)
            
            // Update auth store
            const authStore = useAuthStore.getState()
            authStore.setAccessToken(accessToken)
            
            await authService.fetchMe()
            await authService.registerDevice()
            authStore.setError(null)
          }
        } catch (err) {
          console.error('Failed to handle Google OAuth callback in tab:', err)
        } finally {
          // Close the tab
          useTabStore.getState().removeTab(tabId)
        }
      }
    }

    const handlePageTitleUpdated = (e: any) => {
      onUpdate({ title: e.title })
    }

    const handleFaviconUpdated = (e: any) => {
      if (e.favicons && e.favicons.length > 0) {
        onUpdate({ favicon: e.favicons[0] })
      }
    }

    const handleDidStartLoading = () => {
      onUpdate({ loading: true })
    }

    const handleDidStopLoading = () => {
      if (!webview) return
      const currentUrl = webview.getURL()
      onUpdate({
        loading: false,
        canGoBack: webview.canGoBack(),
        canGoForward: webview.canGoForward(),
        url: currentUrl,
      })
      checkAuthCallback(currentUrl)
    }

    const handleDidNavigate = (e: any) => {
      onUpdate({ url: e.url })
      checkAuthCallback(e.url)
    }

    const handleContextMenu = (e: any) => {
      e.preventDefault()
      const rect = webview.getBoundingClientRect()
      const x = rect.left + e.params.x
      const y = rect.top + e.params.y

      // Determine the type of right click
      let type: 'link' | 'image' | 'text' | 'page' = 'page'
      if (e.params.linkURL) {
        type = 'link'
      } else if (e.params.mediaType === 'image' && e.params.srcURL) {
        type = 'image'
      } else if (e.params.selectionText && e.params.selectionText.trim().length > 0) {
        type = 'text'
      }

      useContextMenuStore.getState().openMenu(x, y, type, {
        x: e.params.x,
        y: e.params.y,
        linkURL: e.params.linkURL,
        srcURL: e.params.srcURL,
        selectionText: e.params.selectionText,
        mediaType: e.params.mediaType,
        isEditable: e.params.isEditable,
        webviewRef: webview,
        tabId
      })
    }

    const handleWillNavigate = (e: any) => {
      if (e.url && e.url.startsWith('bamboo://')) {
        e.preventDefault()
        onUpdate({ url: e.url })
      }
    }

    const handleNewWindow = (e: any) => {
      if (e.url && e.url.startsWith('bamboo://')) {
        e.preventDefault()
        useTabStore.getState().addTab(e.url)
      }
    }

    webview.addEventListener('page-title-updated', handlePageTitleUpdated)
    webview.addEventListener('page-favicon-updated', handleFaviconUpdated)
    webview.addEventListener('did-start-loading', handleDidStartLoading)
    webview.addEventListener('did-stop-loading', handleDidStopLoading)
    webview.addEventListener('did-navigate', handleDidNavigate)
    webview.addEventListener('did-navigate-in-page', handleDidNavigate)
    webview.addEventListener('context-menu', handleContextMenu)
    webview.addEventListener('will-navigate', handleWillNavigate)
    webview.addEventListener('new-window', handleNewWindow)

    return () => {
      if (webview) {
        webview.removeEventListener('page-title-updated', handlePageTitleUpdated)
        webview.removeEventListener('page-favicon-updated', handleFaviconUpdated)
        webview.removeEventListener('did-start-loading', handleDidStartLoading)
        webview.removeEventListener('did-stop-loading', handleDidStopLoading)
        webview.removeEventListener('did-navigate', handleDidNavigate)
        webview.removeEventListener('did-navigate-in-page', handleDidNavigate)
        webview.removeEventListener('context-menu', handleContextMenu)
        webview.removeEventListener('will-navigate', handleWillNavigate)
        webview.removeEventListener('new-window', handleNewWindow)
      }
    }
  }, [])

  return (
    <webview
      ref={webviewRef}
      src={initialUrl}
      className={styles.webview}
      data-tab-id={tabId}
    />
  )
}

export default WebViewContainer
