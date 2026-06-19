import React, { useEffect, useState } from 'react'
import { useTabStore } from '../store/useTabStore'
import { useBrowserStore } from '../store/useBrowserStore'
import { useAuthStore } from '../store/useAuthStore'
import { apiClient } from '../services/apiClient'
import { 
  History, 
  Layers, 
  FolderMinus, 
  Laptop, 
  Activity, 
  ChevronRight, 
  ExternalLink 
} from 'lucide-react'
import styles from './BambooViewPage.module.scss'
import BambooLogo from '../components/BambooLogo'

type ActiveSection = 'recent' | 'open' | 'closed' | 'devices' | 'history'

interface SyncedTab {
  id: string
  title: string
  url: string
  favicon?: string
  deviceName?: string
  updatedAt?: string
}

const BambooViewPage: React.FC = () => {
  const { tabs, closedTabs, activeTabId, setActiveTab, addTab } = useTabStore()
  const { history, fetchHistory } = useBrowserStore()
  const { isAuthenticated } = useAuthStore()
  
  const [activeSection, setActiveSection] = useState<ActiveSection>('recent')
  const [syncedTabs, setSyncedTabs] = useState<SyncedTab[]>([])
  const [isLoadingSynced, setIsLoadingSynced] = useState(false)
  const [syncedError, setSyncedError] = useState<string | null>(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  // Fetch synced tabs when device tabs section or recent section is selected
  useEffect(() => {
    if (!isAuthenticated) {
      setSyncedTabs([])
      return
    }

    const fetchSyncedTabs = async () => {
      setIsLoadingSynced(true)
      setSyncedError(null)
      try {
        const response = await apiClient('/api/browser/sync/tabs', { method: 'GET' })
        const remoteTabs = response?.tabs ?? response ?? []
        if (Array.isArray(remoteTabs)) {
          setSyncedTabs(remoteTabs)
        }
      } catch (err: any) {
        console.warn('Failed to fetch synced tabs for Bamboo View', err)
        setSyncedError(err.message || 'Ошибка синхронизации')
      } finally {
        setIsLoadingSynced(false)
      }
    }

    fetchSyncedTabs()
  }, [activeSection, isAuthenticated])

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId)
  }

  const handleUrlClick = (url: string) => {
    addTab(url)
  }

  const menuItems = [
    { id: 'recent', label: 'Недавний просмотр', icon: <Activity size={18} /> },
    { id: 'open', label: 'Открытые вкладки', icon: <Layers size={18} /> },
    { id: 'closed', label: 'Недавно закрытые вкладки', icon: <FolderMinus size={18} /> },
    { id: 'devices', label: 'Вкладки с других устройств', icon: <Laptop size={18} /> },
    { id: 'history', label: 'История', icon: <History size={18} /> },
  ]

  return (
    <div className={styles.bambooViewPage}>
      <div className={styles.sidebar}>
        <div className={styles.logoHeader}>
          <BambooLogo size={28} />
          <span className={styles.logoTitle}>Bamboo View</span>
        </div>
        <nav className={styles.nav}>
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`${styles.navItem} ${activeSection === item.id ? styles.active : ''}`}
              onClick={() => setActiveSection(item.id as ActiveSection)}
            >
              {item.icon}
              <span>{item.label}</span>
              <ChevronRight size={14} className={styles.chevron} />
            </button>
          ))}
        </nav>
      </div>

      <div className={styles.content}>
        <div className={styles.contentHeader}>
          <h2>{menuItems.find(item => item.id === activeSection)?.label}</h2>
        </div>

        <div className={styles.scrollContainer}>
          {activeSection === 'recent' && (
            <div className={styles.section}>
              <div className={styles.subSection}>
                <h3>Продолжить просмотр</h3>
                <div className={styles.list}>
                  {tabs.slice(-5).reverse().map(tab => (
                    <div key={tab.id} className={styles.listItem} onClick={() => handleTabClick(tab.id)}>
                      {tab.favicon ? (
                        <img src={tab.favicon} className={styles.itemFavicon} alt="" />
                      ) : (
                        <BambooLogo size={16} />
                      )}
                      <div className={styles.itemInfo}>
                        <span className={styles.itemTitle}>{tab.title}</span>
                        <span className={styles.itemUrl}>{tab.url}</span>
                      </div>
                      <ExternalLink size={14} className={styles.actionIcon} />
                    </div>
                  ))}
                  {tabs.length === 0 && <span className={styles.emptyText}>Нет открытых вкладок</span>}
                </div>
              </div>

              <div className={styles.subSection}>
                <h3>Недавно закрытые</h3>
                <div className={styles.list}>
                  {closedTabs.slice(0, 5).map((url, index) => (
                    <div key={index} className={styles.listItem} onClick={() => handleUrlClick(url)}>
                      <BambooLogo size={16} />
                      <div className={styles.itemInfo}>
                        <span className={styles.itemTitle}>{url}</span>
                      </div>
                      <ExternalLink size={14} className={styles.actionIcon} />
                    </div>
                  ))}
                  {closedTabs.length === 0 && <span className={styles.emptyText}>Нет недавно закрытых вкладок</span>}
                </div>
              </div>

              <div className={styles.subSection}>
                <h3>Недавняя история</h3>
                <div className={styles.list}>
                  {history.slice(0, 5).map(entry => (
                    <div key={entry.id} className={styles.listItem} onClick={() => handleUrlClick(entry.url)}>
                      {entry.favicon ? (
                        <img src={entry.favicon} className={styles.itemFavicon} alt="" />
                      ) : (
                        <BambooLogo size={16} />
                      )}
                      <div className={styles.itemInfo}>
                        <span className={styles.itemTitle}>{entry.title}</span>
                        <span className={styles.itemUrl}>{entry.url}</span>
                      </div>
                      <ExternalLink size={14} className={styles.actionIcon} />
                    </div>
                  ))}
                  {history.length === 0 && <span className={styles.emptyText}>История пуста</span>}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'open' && (
            <div className={styles.list}>
              {tabs.map(tab => (
                <div key={tab.id} className={styles.listItem} onClick={() => handleTabClick(tab.id)}>
                  {tab.favicon ? (
                    <img src={tab.favicon} className={styles.itemFavicon} alt="" />
                  ) : (
                    <BambooLogo size={16} />
                  )}
                  <div className={styles.itemInfo}>
                    <span className={styles.itemTitle}>{tab.title}</span>
                    <span className={styles.itemUrl}>{tab.url}</span>
                  </div>
                  {tab.id === activeTabId && <span className={styles.activeBadge}>Активная</span>}
                </div>
              ))}
            </div>
          )}

          {activeSection === 'closed' && (
            <div className={styles.list}>
              {closedTabs.map((url, index) => (
                <div key={index} className={styles.listItem} onClick={() => handleUrlClick(url)}>
                  <BambooLogo size={16} />
                  <div className={styles.itemInfo}>
                    <span className={styles.itemTitle}>{url}</span>
                  </div>
                  <ExternalLink size={14} className={styles.actionIcon} />
                </div>
              ))}
              {closedTabs.length === 0 && (
                <div className={styles.emptyState}>
                  <p>Нет недавно закрытых вкладок</p>
                </div>
              )}
            </div>
          )}

          {activeSection === 'devices' && (
            <div className={styles.section}>
              {!isAuthenticated ? (
                <div className={styles.emptyState}>
                  <p>Войдите в Bamboo Account, чтобы синхронизировать вкладки с других устройств.</p>
                </div>
              ) : isLoadingSynced ? (
                <div className={styles.emptyState}>
                  <p>Загрузка вкладок...</p>
                </div>
              ) : syncedError ? (
                <div className={styles.emptyState}>
                  <p className={styles.errorText}>Не удалось загрузить вкладки: {syncedError}</p>
                </div>
              ) : syncedTabs.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>Нет вкладок с других устройств</p>
                </div>
              ) : (
                <div className={styles.list}>
                  {syncedTabs.map((tab) => (
                    <div key={tab.id} className={styles.listItem} onClick={() => handleUrlClick(tab.url)}>
                      {tab.favicon ? (
                        <img src={tab.favicon} className={styles.itemFavicon} alt="" />
                      ) : (
                        <BambooLogo size={16} />
                      )}
                      <div className={styles.itemInfo}>
                        <span className={styles.itemTitle}>{tab.title}</span>
                        <span className={styles.itemUrl}>{tab.url}</span>
                        {tab.deviceName && (
                          <span className={styles.deviceName}>Устройство: {tab.deviceName}</span>
                        )}
                      </div>
                      <ExternalLink size={14} className={styles.actionIcon} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'history' && (
            <div className={styles.list}>
              {history.map(entry => (
                <div key={entry.id} className={styles.listItem} onClick={() => handleUrlClick(entry.url)}>
                  {entry.favicon ? (
                    <img src={entry.favicon} className={styles.itemFavicon} alt="" />
                  ) : (
                    <BambooLogo size={16} />
                  )}
                  <div className={styles.itemInfo}>
                    <span className={styles.itemTitle}>{entry.title}</span>
                    <span className={styles.itemUrl}>{entry.url}</span>
                  </div>
                  <span className={styles.timeLabel}>
                    {new Date(entry.visitedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {history.length === 0 && (
                <div className={styles.emptyState}>
                  <p>История пуста</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BambooViewPage
