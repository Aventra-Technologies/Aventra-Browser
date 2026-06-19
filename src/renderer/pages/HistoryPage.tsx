import React, { useState } from 'react'
import { useBrowserStore } from '../store/useBrowserStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useTabStore } from '../store/useTabStore'
import { Search, Clock, Trash2, Globe, ExternalLink } from 'lucide-react'
import styles from './HistoryPage.module.scss'

const HistoryPage: React.FC = () => {
  const { history, clearHistory } = useBrowserStore()
  const { activeTabId, updateTab } = useTabStore()
  const { t } = useSettingsStore()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredHistory = history.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.url.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpen = (url: string) => {
    if (activeTabId) updateTab(activeTabId, { url })
  }

  return (
    <div className={styles.historyPage}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>{t('common.history')}</h1>
          <div className={styles.actions}>
            <div className={styles.searchWrapper}>
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search history..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className={styles.clearBtn} onClick={clearHistory}>
              <Trash2 size={16} />
              Clear History
            </button>
          </div>
        </div>

        <div className={styles.list}>
          {filteredHistory.map((entry) => (
            <div key={entry.id} className={styles.item} onClick={() => handleOpen(entry.url)}>
              <div className={styles.itemInfo}>
                {entry.favicon ? (
                  <img src={entry.favicon} className={styles.favicon} alt="" />
                ) : (
                  <Globe size={16} className={styles.favicon} />
                )}
                <div className={styles.text}>
                  <div className={styles.title}>{entry.title}</div>
                  <div className={styles.url}>{entry.url}</div>
                </div>
              </div>
              <div className={styles.time}>
                {new Date(entry.visitedAt).toLocaleString()}
              </div>
              <button className={styles.openBtn}>
                <ExternalLink size={16} />
              </button>
            </div>
          ))}
          {filteredHistory.length === 0 && (
            <div className={styles.empty}>No history found.</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HistoryPage
