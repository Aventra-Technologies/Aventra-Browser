import React, { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, RotateCw, X as StopIcon, Home, Search, Shield, ShieldCheck, Menu as MenuIcon, Star, Camera, LayoutGrid } from 'lucide-react'
import { useTabStore } from '../../store/useTabStore'
import { useBrowserStore } from '../../store/useBrowserStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import styles from './AddressBar.module.scss'

import Menu from '../Menu/Menu'
import AddressBarSuggestions from './AddressBarSuggestions'
import GoogleServicesDropdown from './GoogleServicesDropdown'

const AddressBar: React.FC = () => {
  const { tabs, activeTabId, updateTab, addTab } = useTabStore()
  const { addBookmark } = useBrowserStore()
  const { searchEngine, t } = useSettingsStore()
  
  const activeTab = tabs.find((t) => t.id === activeTabId)
  const activeUrl = activeTab ? activeTab.url : (activeTabId === 'bamboo-view' ? 'bamboo://view' : '')
  const [inputValue, setInputValue] = useState('')
  const [isMenuOpen, setMenuOpen] = useState(false)
  const [isGoogleServicesOpen, setGoogleServicesOpen] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const toggleGoogleServices = () => {
    setGoogleServicesOpen(!isGoogleServicesOpen)
    setMenuOpen(false)
  }

  const toggleMenu = () => {
    setMenuOpen(!isMenuOpen)
    setGoogleServicesOpen(false)
  }

  useEffect(() => {
    if (activeTab) {
      setInputValue(activeTab.url === 'bamboo://newtab' ? '' : activeTab.url)
    } else if (activeTabId === 'bamboo-view') {
      setInputValue('bamboo://view')
    }
  }, [activeTabId, activeTab?.url])

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    let url = inputValue.trim()
    if (!url) return
    
    if (!url.includes('.') && !url.includes('://')) {
      url = `${searchEngine}${encodeURIComponent(url)}`
    } else if (!url.startsWith('http') && !url.startsWith('bamboo://')) {
      url = 'https://' + url
    }

    if (activeTabId) {
      if (activeTabId === 'bamboo-view') {
        addTab(url)
      } else {
        updateTab(activeTabId, { url })
      }
    }
    setShowSuggestions(false)
  }

  const handleSuggestionSelect = (url: string) => {
    if (activeTabId) {
      if (activeTabId === 'bamboo-view') {
        addTab(url)
      } else {
        updateTab(activeTabId, { url })
      }
    }
    setShowSuggestions(false)
  }

  const navigate = (action: 'back' | 'forward' | 'reload' | 'stop') => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any
    if (!webview) return

    if (action === 'back' && webview.canGoBack()) webview.goBack()
    else if (action === 'forward' && webview.canGoForward()) webview.goForward()
    else if (action === 'reload') webview.reload()
    else if (action === 'stop') webview.stop()
  }

  const handleScreenshot = async () => {
    const webview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`) as any
    if (!webview) return
    
    try {
      const webContentsId = await webview.getWebContentsId()
      const filePath = await (window as any).bambooApi.captureWebContents(webContentsId)
      alert(`Screenshot saved to downloads:\n${filePath}`)
    } catch (e: any) {
      alert(`Failed to take screenshot: ${e.message}`)
    }
  }

  return (
    <div className={styles.addressBar}>
      <div className={styles.navButtons}>
        <button 
          className={styles.navBtn} 
          onClick={() => navigate('back')}
          disabled={!activeTab?.canGoBack}
        >
          <ArrowLeft size={20} />
        </button>
        <button 
          className={styles.navBtn} 
          onClick={() => navigate('forward')}
          disabled={!activeTab?.canGoForward}
        >
          <ArrowRight size={20} />
        </button>
        {activeTab?.loading ? (
          <button className={styles.navBtn} onClick={() => navigate('stop')}>
            <StopIcon size={20} />
          </button>
        ) : (
          <button className={styles.navBtn} onClick={() => navigate('reload')}>
            <RotateCw size={18} />
          </button>
        )}
        <button 
          className={styles.navBtn} 
          onClick={() => {
            if (activeTabId === 'bamboo-view') {
              addTab('bamboo://newtab')
            } else if (activeTabId) {
              updateTab(activeTabId, { url: 'bamboo://newtab' })
            }
          }}
        >
          <Home size={18} />
        </button>
      </div>

      <form className={styles.urlInputContainer} onSubmit={handleSubmit}>
        <div className={`${styles.securityIndicator} ${activeUrl.startsWith('https') || activeUrl.startsWith('bamboo://') ? styles.secure : ''}`}>
          {activeUrl.startsWith('https') || activeUrl.startsWith('bamboo://') ? <ShieldCheck size={16} /> : <Shield size={16} />}
        </div>
        <input
          type="text"
          className={`${styles.urlInput} address-bar-input`}
          value={inputValue}
          placeholder={t('common.search_placeholder')}
          onChange={(e) => {
            setInputValue(e.target.value)
            setShowSuggestions(true)
          }}
          onFocus={(e) => {
            e.target.select()
            setShowSuggestions(true)
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        {activeTab && activeTab.zoom && Math.round(activeTab.zoom * 100) !== 100 && (
          <button
            type="button"
            className={styles.zoomIndicator}
            onClick={() => activeTabId && updateTab(activeTabId, { zoom: 1 })}
            title="Reset Zoom"
          >
            {Math.round(activeTab.zoom * 100)}%
          </button>
        )}
        <button
          type="button"
          className={styles.actionBtn}
          onClick={handleScreenshot}
          title="Take Page Screenshot"
        >
          <Camera size={18} />
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => activeTab && addBookmark({ title: activeTab.title, url: activeTab.url, favicon: activeTab.favicon })}
        >
          <Star size={18} />
        </button>

        {showSuggestions && (
          <AddressBarSuggestions query={inputValue} onSelect={handleSuggestionSelect} />
        )}
      </form>

      <button 
        className={styles.menuBtn} 
        onClick={toggleGoogleServices} 
        title="Google Services"
      >
        <LayoutGrid size={20} />
      </button>
      <GoogleServicesDropdown 
        isOpen={isGoogleServicesOpen} 
        onClose={() => setGoogleServicesOpen(false)} 
      />

      <button className={styles.menuBtn} onClick={toggleMenu}>
        <MenuIcon size={20} />
      </button>

      {isMenuOpen && <Menu onClose={() => setMenuOpen(false)} />}
    </div>
  )
}

export default AddressBar
