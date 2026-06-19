import React from 'react'
import { Plus, X, Globe } from 'lucide-react'
import { useTabStore } from '../../store/useTabStore'
import styles from './TabStrip.module.scss'
import BambooLogo from '../BambooLogo'
import { useSettingsStore } from '../../store/useSettingsStore'

const TabStrip: React.FC = () => {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab, togglePinTab, duplicateTab, moveTab } = useTabStore()
  const { compactTabs } = useSettingsStore()
  const [contextMenu, setContextMenu] = React.useState<{ x: number, y: number, tabId: string } | null>(null)
  const [draggedTabId, setDraggedTabId] = React.useState<string | null>(null)

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.pageX, y: e.pageY, tabId })
  }

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    e.dataTransfer.setData('text/plain', tabId)
    setDraggedTabId(tabId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault()
    const sourceTabId = e.dataTransfer.getData('text/plain')
    if (sourceTabId && sourceTabId !== targetTabId) {
      const sourceIndex = tabs.findIndex(t => t.id === sourceTabId)
      const targetIndex = tabs.findIndex(t => t.id === targetTabId)
      if (sourceIndex !== -1 && targetIndex !== -1) {
        moveTab(sourceIndex, targetIndex)
      }
    }
    setDraggedTabId(null)
  }

  const handleBambooViewClick = () => {
    setActiveTab('bamboo-view')
  }

  const getTabDisplayInfo = (tab: any) => {
    let title = tab.title
    let favicon = tab.favicon

    if (tab.url === 'bamboo://newtab') {
      title = 'Новая вкладка'
    } else if (tab.url === 'bamboo://settings') {
      title = 'Настройки'
    } else if (tab.url === 'bamboo://account') {
      title = 'Bamboo Account'
    } else if (tab.url === 'bamboo://view') {
      title = 'Bamboo View'
    }

    const isInternal = tab.url.startsWith('bamboo://')
    const useLogo = isInternal || !favicon

    return { title, favicon, useLogo }
  }

  const pinnedTabs = tabs.filter(t => t.pinned)
  const normalTabs = tabs.filter(t => !t.pinned)

  const isViewActive = activeTabId === 'bamboo-view'

  return (
    <div className={`${styles.tabStrip} ${compactTabs ? styles.compact : ''}`} onClick={() => setContextMenu(null)}>
      <div className={styles.tabsList}>
        {/* Permanent Bamboo View Button */}
        <button
          className={`${styles.tab} ${styles.bambooViewBtn} ${isViewActive ? styles.active : ''}`}
          onClick={handleBambooViewClick}
          title="Bamboo View"
          type="button"
        >
          <div className={styles.tabBackground}></div>
          <div className={styles.tabContent} style={{ padding: '0', justifyContent: 'center' }}>
            <BambooLogo size={18} />
          </div>
        </button>

        {/* Pinned Tabs */}
        {pinnedTabs.map((tab) => {
          const { title, favicon, useLogo } = getTabDisplayInfo(tab)
          return (
            <div
              key={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, tab.id)}
              onDragEnd={() => setDraggedTabId(null)}
              className={`${styles.tab} ${styles.pinned} ${tab.id === activeTabId ? styles.active : ''}`}
              onClick={() => setActiveTab(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              title={title}
            >
              <div className={styles.tabBackground}></div>
              <div className={styles.tabContent}>
                {useLogo ? (
                  <BambooLogo size={14} className={styles.favicon} />
                ) : (
                  <img src={favicon} className={styles.favicon} alt="" onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }} />
                )}
              </div>
            </div>
          )
        })}

        {pinnedTabs.length > 0 && <div className={styles.separator} />}

        {/* Normal Tabs */}
        {normalTabs.map((tab) => {
          const { title, favicon, useLogo } = getTabDisplayInfo(tab)
          return (
            <div
              key={tab.id}
              draggable
              onDragStart={(e) => handleDragStart(e, tab.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, tab.id)}
              onDragEnd={() => setDraggedTabId(null)}
              className={`${styles.tab} ${tab.id === activeTabId ? styles.active : ''} ${draggedTabId === tab.id ? styles.dragging : ''}`}
              onClick={() => setActiveTab(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
              title={title}
            >
              <div className={styles.tabBackground}></div>
              <div className={styles.tabContent}>
                {useLogo ? (
                  <BambooLogo size={14} className={styles.favicon} />
                ) : (
                  <img src={favicon} className={styles.favicon} alt="" onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }} />
                )}
                <span className={styles.title}>{title}</span>
                <button
                  className={styles.closeBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    removeTab(tab.id)
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <button className={styles.addTabBtn} onClick={() => addTab()}>
        <Plus size={18} />
      </button>

      <div className={styles.dragSpacer} />

      {contextMenu && (
        <TabContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          tabId={contextMenu.tabId} 
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}

interface TabContextMenuProps {
  x: number
  y: number
  tabId: string
  onClose: () => void
}

const TabContextMenu: React.FC<TabContextMenuProps> = ({ x, y, tabId, onClose }) => {
  const { tabs, removeTab, togglePinTab, duplicateTab, moveTab } = useTabStore()
  const tab = tabs.find(t => t.id === tabId)

  React.useEffect(() => {
    const handleGlobalClick = () => {
      onClose()
    }
    window.addEventListener('click', handleGlobalClick)
    window.addEventListener('contextmenu', handleGlobalClick)
    return () => {
      window.removeEventListener('click', handleGlobalClick)
      window.removeEventListener('contextmenu', handleGlobalClick)
    }
  }, [onClose])

  if (!tab) return null

  const tabIndex = tabs.findIndex(t => t.id === tabId)

  return (
    <div className={styles.contextMenu} style={{ top: y, left: x }} onClick={(e) => e.stopPropagation()}>
      <button onClick={() => { duplicateTab(tabId); onClose(); }}>Duplicate Tab</button>
      <button onClick={() => { togglePinTab(tabId); onClose(); }}>{tab.pinned ? 'Unpin Tab' : 'Pin Tab'}</button>
      <button disabled onClick={() => { /* Mute logic */ onClose(); }}>Mute Tab</button>
      <div className={styles.divider} />
      <button 
        disabled={tabIndex === 0} 
        onClick={() => { moveTab(tabIndex, tabIndex - 1); onClose(); }}
      >
        Move Tab Left
      </button>
      <button 
        disabled={tabIndex === tabs.length - 1} 
        onClick={() => { moveTab(tabIndex, tabIndex + 1); onClose(); }}
      >
        Move Tab Right
      </button>
      <div className={styles.divider} />
      <button onClick={() => { removeTab(tabId); onClose(); }}>Close Tab</button>
    </div>
  )
}

export default TabStrip
