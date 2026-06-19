import React, { useEffect, useRef, useState } from 'react'
import { useTabStore } from '../../store/useTabStore'
import styles from './AddressBar.module.scss'

interface GoogleServicesDropdownProps {
  isOpen: boolean
  onClose: () => void
}

const SERVICES = [
  { title: 'Google Search', url: 'https://www.google.com' },
  { title: 'Gmail', url: 'https://mail.google.com' },
  { title: 'Google Drive', url: 'https://drive.google.com' },
  { title: 'Google Docs', url: 'https://docs.google.com' },
  { title: 'Google Maps', url: 'https://maps.google.com' },
  { title: 'YouTube', url: 'https://youtube.com' },
  { title: 'Google Translate', url: 'https://translate.google.com' },
  { title: 'GitHub', url: 'https://github.com' }
]

const GoogleServicesDropdown: React.FC<GoogleServicesDropdownProps> = ({ isOpen, onClose }) => {
  const { addTab, updateTab, activeTabId, tabs } = useTabStore()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)

  useEffect(() => {
    if (!isOpen) return

    // Focus the dropdown container to listen for key events
    dropdownRef.current?.focus()
    setFocusedIndex(0)
  }, [isOpen])

  // Handle clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const activeTab = tabs.find(t => t.id === activeTabId)

  const handleNavigate = (url: string, forceNewTab = false) => {
    const isNewTab = activeTab?.url === 'bamboo://newtab' || !activeTab?.url
    if (forceNewTab || !isNewTab) {
      addTab(url)
    } else if (activeTabId) {
      updateTab(activeTabId, { url })
    }
    onClose()
  }

  const handleItemClick = (e: React.MouseEvent, url: string) => {
    const forceNewTab = e.ctrlKey || e.metaKey || e.button === 1
    handleNavigate(url, forceNewTab)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const service = SERVICES[focusedIndex]
      if (service) {
        handleNavigate(service.url, e.ctrlKey || e.metaKey)
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev + 1) % SERVICES.length)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev - 1 + SERVICES.length) % SERVICES.length)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev + 3) % SERVICES.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev - 3 + SERVICES.length) % SERVICES.length)
    }
  }

  return (
    <div 
      ref={dropdownRef}
      className={styles.googleServicesDropdown}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.googleServicesHeader}>
        Google Services
      </div>
      <div className={styles.googleServicesGrid}>
        {SERVICES.map((service, index) => {
          const hostname = new URL(service.url).hostname
          const isFocused = index === focusedIndex

          return (
            <button
              key={service.url}
              className={`${styles.googleServicesItem} ${isFocused ? styles.focused : ''}`}
              onClick={(e) => handleItemClick(e, service.url)}
              onMouseMove={() => setFocusedIndex(index)}
              title={service.title}
            >
              <div className={styles.googleServicesIconWrapper}>
                <img 
                  src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`} 
                  alt="" 
                  className={styles.googleServicesFavicon}
                />
              </div>
              <span className={styles.googleServicesTitle}>
                {service.title.replace('Google ', '')}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default GoogleServicesDropdown
