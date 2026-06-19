import React, { useState } from 'react'
import { Search, Globe, Plus, X } from 'lucide-react'
import { useTabStore } from '../store/useTabStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useBrowserStore } from '../store/useBrowserStore'
import BambooLogo from '../components/BambooLogo'
import styles from './HomePage.module.scss'

const HomePage: React.FC = () => {
  const { updateTab, activeTabId } = useTabStore()
  const { searchEngine, t } = useSettingsStore()
  const { shortcuts, addShortcut, removeShortcut } = useBrowserStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [error, setError] = useState('')

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const query = formData.get('q') as string
    if (query && activeTabId) {
      let url = query.trim()
      if (!url.includes('.') && !url.includes('://')) {
        url = `${searchEngine}${encodeURIComponent(url)}`
      } else if (!url.startsWith('http')) {
        url = 'https://' + url
      }
      updateTab(activeTabId, { url })
    }
  }

  const handleAddShortcut = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newUrl.trim()) {
      setError('Both fields are required.')
      return
    }

    let url = newUrl.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    try {
      new URL(url)
    } catch (err) {
      setError('Invalid URL format.')
      return
    }

    addShortcut({
      title: newTitle.trim(),
      url
    })

    setNewTitle('')
    setNewUrl('')
    setError('')
    setIsModalOpen(false)
  }

  return (
    <div className={styles.homePage}>
      <div className={styles.container}>
        <div className={styles.hero}>
          <div className={styles.logo}>
            <BambooLogo size={80} />
          </div>

          <form className={styles.searchForm} onSubmit={handleSearch}>
            <div className={styles.searchInputWrapper}>
              <Search size={22} className={styles.searchIcon} />
              <input 
                type="text" 
                name="q" 
                placeholder={t('home.search_the_web')} 
                autoFocus 
                autoComplete="off"
              />
            </div>
          </form>
        </div>

        <div className={styles.grid}>
          {shortcuts.map((shortcut) => {
            let hostname = ''
            try {
              hostname = new URL(shortcut.url).hostname
            } catch (e) {}

            return (
              <div 
                key={shortcut.id} 
                className={styles.shortcut}
                onClick={() => activeTabId && updateTab(activeTabId, { url: shortcut.url })}
              >
                <button 
                  className={styles.deleteBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    removeShortcut(shortcut.id)
                  }}
                  title="Remove shortcut"
                >
                  <X size={14} />
                </button>
                <div className={styles.iconBox}>
                  {hostname ? (
                    <img 
                      src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`} 
                      alt="" 
                      className={styles.favicon}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          const fallback = document.createElement('div')
                          fallback.className = styles.fallbackFavicon
                          fallback.innerText = (shortcut.title || 'S').charAt(0).toUpperCase()
                          parent.appendChild(fallback)
                        }
                      }}
                    />
                  ) : (
                    <Globe size={32} />
                  )}
                </div>
                <span className={styles.shortcutTitle}>{shortcut.title}</span>
              </div>
            )
          })}

          <div 
            className={`${styles.shortcut} ${styles.addShortcutBtn}`}
            onClick={() => setIsModalOpen(true)}
          >
            <div className={styles.iconBox}>
              <Plus size={32} />
            </div>
            <span className={styles.shortcutTitle}>Add Shortcut</span>
          </div>
        </div>

        {isModalOpen && (
          <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Add New Shortcut</h3>
                <button className={styles.closeModalBtn} onClick={() => setIsModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleAddShortcut} className={styles.modalForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="shortcut-title">Name</label>
                  <input 
                    id="shortcut-title"
                    type="text" 
                    value={newTitle}
                    onChange={(e) => {
                      setNewTitle(e.target.value)
                      setError('')
                    }}
                    placeholder="e.g. Google"
                    autoFocus
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="shortcut-url">URL</label>
                  <input 
                    id="shortcut-url"
                    type="text" 
                    value={newUrl}
                    onChange={(e) => {
                      setNewUrl(e.target.value)
                      setError('')
                    }}
                    placeholder="e.g. google.com"
                  />
                </div>
                {error && <span className={styles.modalError}>{error}</span>}
                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitBtn}>
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HomePage
