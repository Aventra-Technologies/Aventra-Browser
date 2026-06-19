import React, { useState } from 'react'
import { History, Bookmark, X, Search, Trash2 } from 'lucide-react'
import { useBrowserStore } from '../../store/useBrowserStore'
import { useTabStore } from '../../store/useTabStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import styles from './Sidebar.module.scss'

const Sidebar: React.FC = () => {
  const { isSidebarOpen, setSidebarOpen, history, bookmarks, clearHistory, removeBookmark } = useBrowserStore()
  const { activeTabId, updateTab } = useTabStore()
  const { t } = useSettingsStore()
  
  const [activeView, setActiveView] = useState<'history' | 'bookmarks'>('history')
  const [searchQuery, setSearchQuery] = useState('')

  if (!isSidebarOpen) return null

  const handleItemClick = (url: string) => {
    if (activeTabId) {
      updateTab(activeTabId, { url })
    }
  }

  const filteredHistory = history.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.url.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredBookmarks = bookmarks.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.url.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${activeView === 'history' ? styles.active : ''}`}
            onClick={() => setActiveView('history')}
          >
            <History size={16} />
            <span>{t('common.history')}</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeView === 'bookmarks' ? styles.active : ''}`}
            onClick={() => setActiveView('bookmarks')}
          >
            <Bookmark size={16} />
            <span>{t('common.bookmarks')}</span>
          </button>
        </div>
        <button className={styles.closeBtn} onClick={() => setSidebarOpen(false)}>
          <X size={18} />
        </button>
      </div>

      <div className={styles.searchBar}>
        <Search size={14} className={styles.searchIcon} />
        <input 
          type="text" 
          placeholder="Search..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.content}>
        {activeView === 'history' && (
          <div className={styles.list}>
            <div className={styles.actions}>
              <button className={styles.clearBtn} onClick={clearHistory}>Clear History</button>
            </div>
            {filteredHistory.map((entry) => (
              <div key={entry.id} className={styles.item} onClick={() => handleItemClick(entry.url)}>
                <span className={styles.itemTitle}>{entry.title}</span>
                <span className={styles.itemUrl}>{entry.url}</span>
              </div>
            ))}
          </div>
        )}

        {activeView === 'bookmarks' && (
          <div className={styles.list}>
            {filteredBookmarks.map((bookmark) => (
              <div key={bookmark.id} className={styles.item} onClick={() => handleItemClick(bookmark.url)}>
                <div className={styles.itemRow}>
                  <span className={styles.itemTitle}>{bookmark.title}</span>
                  <button 
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      removeBookmark(bookmark.id)
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <span className={styles.itemUrl}>{bookmark.url}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Sidebar
