import React, { useEffect, useRef, useState } from 'react'
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Plus, 
  Copy, 
  Camera, 
  Save, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Code, 
  Scissors, 
  Clipboard, 
  Search, 
  Globe, 
  Square 
} from 'lucide-react'
import { useContextMenuStore } from '../../store/useContextMenuStore'
import { useTabStore } from '../../store/useTabStore'
import styles from './ContextMenu.module.scss'

const ContextMenu: React.FC = () => {
  const { isOpen, type, x, y, params, closeMenu } = useContextMenuStore()
  const { addTab, duplicateTab, activeTabId, tabs } = useTabStore()
  const menuRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ x, y })
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      const rect = menuRef.current?.getBoundingClientRect()
      const menuWidth = rect?.width || 240
      const menuHeight = rect?.height || 300

      let nextX = x
      let nextY = y

      // Adjust X if off screen
      if (x + menuWidth > window.innerWidth) {
        nextX = window.innerWidth - menuWidth - 10
      }
      if (nextX < 10) nextX = 10

      // Adjust Y if off screen
      if (y + menuHeight > window.innerHeight) {
        nextY = window.innerHeight - menuHeight - 10
      }
      if (nextY < 10) nextY = 10

      setCoords({ x: nextX, y: nextY })
    }
  }, [isOpen, x, y, type])

  // Handle closing with animation
  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      closeMenu()
    }, 80) // matches duration of closing animation
  }

  // Click outside listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }
    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen])

  // Scroll and resize listener
  useEffect(() => {
    const handleScrollResize = () => {
      if (isOpen) {
        handleClose()
      }
    }
    window.addEventListener('scroll', handleScrollResize)
    window.addEventListener('resize', handleScrollResize)
    return () => {
      window.removeEventListener('scroll', handleScrollResize)
      window.removeEventListener('resize', handleScrollResize)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Link actions
  const openLinkInNewTab = () => {
    if (params?.linkURL) addTab(params.linkURL)
    handleClose()
  }

  const openLinkInNewWindow = () => {
    if (params?.linkURL) {
      (window as any).bambooApi.newWindow(false, params.linkURL)
    }
    handleClose()
  }

  const openLinkInPrivateWindow = () => {
    if (params?.linkURL) {
      (window as any).bambooApi.newWindow(true, params.linkURL)
    }
    handleClose()
  }

  const copyLink = () => {
    if (params?.linkURL) {
      navigator.clipboard.writeText(params.linkURL)
    }
    handleClose()
  }

  const saveLinkAs = () => {
    if (params?.linkURL) {
      (window as any).bambooApi.downloadUrl(params.linkURL)
    }
    handleClose()
  }

  const inspectElement = () => {
    if (params?.webviewRef && params.x !== undefined && params.y !== undefined) {
      params.webviewRef.inspectElement(params.x, params.y)
    } else if (params?.x !== undefined && params?.y !== undefined) {
      // If we don't have webview, inspect main window element
      // (This will open DevTools on main window)
    }
    handleClose()
  }

  // Image actions
  const openImageInNewTab = () => {
    if (params?.srcURL) addTab(params.srcURL)
    handleClose()
  }

  const saveImageAs = () => {
    if (params?.srcURL) {
      (window as any).bambooApi.downloadUrl(params.srcURL)
    }
    handleClose()
  }

  const copyImageLink = () => {
    if (params?.srcURL) {
      navigator.clipboard.writeText(params.srcURL)
    }
    handleClose()
  }

  const copyImage = async () => {
    if (params?.srcURL) {
      try {
        const response = await fetch(params.srcURL)
        const blob = await response.blob()
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ])
      } catch (err) {
        console.error('Failed to copy image:', err)
      }
    }
    handleClose()
  }

  const takeScreenshot = async () => {
    let targetWebview = params?.webviewRef
    if (!targetWebview && activeTabId) {
      // Find active webview element
      targetWebview = document.querySelector(`webview[data-tab-id="${activeTabId}"]`)
    }

    if (targetWebview) {
      try {
        const wcId = targetWebview.getWebContentsId()
        const filePath = await (window as any).bambooApi.captureWebContents(wcId)
        alert(`Скриншот сохранен: ${filePath}`)
      } catch (err) {
        console.error('Failed to take screenshot:', err)
      }
    }
    handleClose()
  }

  // Text actions
  const handleCopy = () => {
    if (params?.webviewRef) {
      params.webviewRef.copy()
    } else {
      document.execCommand('copy')
    }
    handleClose()
  }

  const handleCut = () => {
    if (params?.webviewRef) {
      params.webviewRef.cut()
    } else {
      document.execCommand('cut')
    }
    handleClose()
  }

  const handlePaste = () => {
    if (params?.webviewRef) {
      params.webviewRef.paste()
    } else {
      document.execCommand('paste')
    }
    handleClose()
  }

  const handleSelectAll = () => {
    if (params?.webviewRef) {
      params.webviewRef.selectAll()
    } else {
      document.execCommand('selectAll')
    }
    handleClose()
  }

  const searchInBamboo = () => {
    if (params?.selectionText) {
      addTab(`https://search.bamboo-ecosystem.tech/search?q=${encodeURIComponent(params.selectionText)}`)
    }
    handleClose()
  }

  const searchInGoogle = () => {
    if (params?.selectionText) {
      addTab(`https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`)
    }
    handleClose()
  }

  // Page navigation actions
  const handleBack = () => {
    if (params?.webviewRef) {
      params.webviewRef.goBack()
    }
    handleClose()
  }

  const handleForward = () => {
    if (params?.webviewRef) {
      params.webviewRef.goForward()
    }
    handleClose()
  }

  const handleReload = () => {
    if (params?.webviewRef) {
      params.webviewRef.reload()
    }
    handleClose()
  }

  const handleNewTab = () => {
    addTab()
    handleClose()
  }

  const handleDuplicateTab = () => {
    if (params?.tabId) {
      duplicateTab(params.tabId)
    } else if (activeTabId) {
      duplicateTab(activeTabId)
    }
    handleClose()
  }

  const savePageAs = () => {
    const activeTab = tabs.find(t => t.id === activeTabId)
    if (activeTab) {
      (window as any).bambooApi.downloadUrl(activeTab.url)
    }
    handleClose()
  }

  const viewPageSource = () => {
    const activeTab = tabs.find(t => t.id === activeTabId)
    if (activeTab) {
      addTab(`view-source:${activeTab.url}`)
    }
    handleClose()
  }

  return (
    <div 
      ref={menuRef}
      className={`${styles.contextMenu} ${isClosing ? styles.closing : styles.opening}`}
      style={{
        left: `${coords.x}px`,
        top: `${coords.y}px`
      }}
    >
      {type === 'link' && (
        <>
          <button className={styles.menuItem} onClick={openLinkInNewTab}>
            <Plus size={16} className={styles.icon} />
            <span>Открыть в новой вкладке</span>
          </button>
          <button className={styles.menuItem} onClick={openLinkInNewWindow}>
            <Plus size={16} className={styles.icon} />
            <span>Открыть в новом окне</span>
          </button>
          <button className={styles.menuItem} onClick={openLinkInPrivateWindow}>
            <Plus size={16} className={styles.icon} />
            <span>Открыть в приватном окне</span>
          </button>
          
          <div className={styles.separator} />
          
          <button className={styles.menuItem} onClick={copyLink}>
            <LinkIcon size={16} className={styles.icon} />
            <span>Копировать ссылку</span>
          </button>
          <button className={styles.menuItem} onClick={saveLinkAs}>
            <Save size={16} className={styles.icon} />
            <span>Сохранить ссылку как...</span>
          </button>
          
          <div className={styles.separator} />
          
          <button className={styles.menuItem} onClick={inspectElement}>
            <Code size={16} className={styles.icon} />
            <span>Исследовать элемент</span>
          </button>
        </>
      )}

      {type === 'image' && (
        <>
          <button className={styles.menuItem} onClick={openImageInNewTab}>
            <ImageIcon size={16} className={styles.icon} />
            <span>Открыть изображение в новой вкладке</span>
          </button>
          <button className={styles.menuItem} onClick={saveImageAs}>
            <Save size={16} className={styles.icon} />
            <span>Сохранить изображение как...</span>
          </button>
          <button className={styles.menuItem} onClick={copyImageLink}>
            <LinkIcon size={16} className={styles.icon} />
            <span>Копировать ссылку изображения</span>
          </button>
          <button className={styles.menuItem} onClick={copyImage}>
            <ImageIcon size={16} className={styles.icon} />
            <span>Копировать изображение</span>
          </button>
          
          <div className={styles.separator} />
          
          <button className={styles.menuItem} onClick={takeScreenshot}>
            <Camera size={16} className={styles.icon} />
            <span>Сделать снимок экрана</span>
          </button>
          
          <div className={styles.separator} />
          
          <button className={styles.menuItem} onClick={inspectElement}>
            <Code size={16} className={styles.icon} />
            <span>Исследовать элемент</span>
          </button>
        </>
      )}

      {type === 'text' && (
        <>
          <button className={styles.menuItem} onClick={handleCopy}>
            <Copy size={16} className={styles.icon} />
            <span>Копировать</span>
          </button>
          <button className={styles.menuItem} onClick={handleCut}>
            <Scissors size={16} className={styles.icon} />
            <span>Вырезать</span>
          </button>
          <button className={styles.menuItem} onClick={handlePaste}>
            <Clipboard size={16} className={styles.icon} />
            <span>Вставить</span>
          </button>
          
          <div className={styles.separator} />
          
          <button className={styles.menuItem} onClick={searchInBamboo}>
            <Search size={16} className={styles.icon} />
            <span>Найти в Bamboo Search</span>
          </button>
          <button className={styles.menuItem} onClick={searchInGoogle}>
            <Globe size={16} className={styles.icon} />
            <span>Поиск в Google</span>
          </button>
          
          <div className={styles.separator} />
          
          <button className={styles.menuItem} onClick={handleSelectAll}>
            <Square size={16} className={styles.icon} />
            <span>Выделить всё</span>
          </button>
        </>
      )}

      {type === 'page' && (
        <>
          <div className={styles.navigationRow}>
            <button 
              className={styles.navBtn} 
              onClick={handleBack} 
              disabled={params?.webviewRef ? !params.webviewRef.canGoBack() : true}
              title="Назад"
            >
              <ArrowLeft size={16} />
            </button>
            <button 
              className={styles.navBtn} 
              onClick={handleForward} 
              disabled={params?.webviewRef ? !params.webviewRef.canGoForward() : true}
              title="Вперёд"
            >
              <ArrowRight size={16} />
            </button>
            <button className={styles.navBtn} onClick={handleReload} title="Перезагрузить">
              <RotateCw size={15} />
            </button>
          </div>

          <div className={styles.separator} />

          <button className={styles.menuItem} onClick={handleNewTab}>
            <Plus size={16} className={styles.icon} />
            <span>Новая вкладка</span>
          </button>
          <button className={styles.menuItem} onClick={handleDuplicateTab}>
            <Copy size={16} className={styles.icon} />
            <span>Дублировать вкладку</span>
          </button>
          
          <div className={styles.separator} />
          
          <button className={styles.menuItem} onClick={savePageAs}>
            <Save size={16} className={styles.icon} />
            <span>Сохранить страницу как...</span>
          </button>
          <button className={styles.menuItem} onClick={takeScreenshot}>
            <Camera size={16} className={styles.icon} />
            <span>Сделать снимок экрана</span>
          </button>
          
          <div className={styles.separator} />
          
          <button className={styles.menuItem} onClick={viewPageSource}>
            <Code size={16} className={styles.icon} />
            <span>Исходный код страницы</span>
          </button>
          <button className={styles.menuItem} onClick={inspectElement}>
            <Code size={16} className={styles.icon} />
            <span>Исследовать элемент</span>
          </button>
        </>
      )}
    </div>
  )
}

export default ContextMenu
