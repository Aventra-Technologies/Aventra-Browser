import React from 'react'
import { Plus, Layout as WindowIcon, Shield, Bookmark, History, Download, Puzzle, Settings, HelpCircle, LogOut, User } from 'lucide-react'
import { useTabStore } from '../../store/useTabStore'
import { useBrowserStore } from '../../store/useBrowserStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import styles from './Menu.module.scss'

interface MenuProps {
  onClose: () => void
}

const Menu: React.FC<MenuProps> = ({ onClose }) => {
  const { addTab, updateTab, activeTabId } = useTabStore()
  const { setSidebarOpen } = useBrowserStore()
  const { t } = useSettingsStore()

  const handleAction = (action: string) => {
    switch (action) {
      case 'new-tab':
        addTab()
        break
      case 'new-window':
        ;(window as any).bambooApi.newWindow(false)
        break
      case 'private-window':
        ;(window as any).bambooApi.newWindow(true)
        break
      case 'bookmarks':
        setSidebarOpen(true)
        break
      case 'history':
        if (activeTabId) updateTab(activeTabId, { url: 'bamboo://history' })
        break
      case 'downloads':
        if (activeTabId) updateTab(activeTabId, { url: 'bamboo://downloads' })
        break
      case 'settings':
        if (activeTabId) updateTab(activeTabId, { url: 'bamboo://settings' })
        break
      case 'account':
        addTab('bamboo://account')
        break
      case 'exit':
        ;(window as any).bambooApi.exitApp()
        break
    }
    onClose()
  }

  return (
    <div className={styles.menuOverlay} onClick={onClose}>
      <div className={styles.menu} onClick={(e) => e.stopPropagation()}>
        <div className={styles.section}>
          <button className={styles.menuItem} onClick={() => handleAction('new-tab')}>
            <Plus size={16} />
            <span>{t('common.new_tab')}</span>
            <span className={styles.shortcut}>Ctrl+T</span>
          </button>
          <button className={styles.menuItem} onClick={() => handleAction('new-window')}>
            <WindowIcon size={16} />
            <span>{t('menu.new_window')}</span>
            <span className={styles.shortcut}>Ctrl+N</span>
          </button>
          <button className={styles.menuItem} onClick={() => handleAction('private-window')}>
            <Shield size={16} />
            <span>{t('menu.private_window')}</span>
            <span className={styles.shortcut}>Ctrl+Shift+P</span>
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.section}>
          <button className={styles.menuItem} onClick={() => handleAction('bookmarks')}>
            <Bookmark size={16} />
            <span>{t('common.bookmarks')}</span>
          </button>
          <button className={styles.menuItem} onClick={() => handleAction('history')}>
            <History size={16} />
            <span>{t('common.history')}</span>
            <span className={styles.shortcut}>Ctrl+H</span>
          </button>
          <button className={styles.menuItem} onClick={() => handleAction('downloads')}>
            <Download size={16} />
            <span>{t('common.downloads')}</span>
            <span className={styles.shortcut}>Ctrl+J</span>
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.section}>
          <button className={styles.menuItem} onClick={() => handleAction('account')}>
            <User size={16} />
            <span>{t('bambooAccount')}</span>
          </button>
          <button className={styles.menuItem} onClick={() => handleAction('settings')}>
            <Settings size={16} />
            <span>{t('common.settings')}</span>
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.section}>
          <button className={styles.menuItem} disabled>
            <HelpCircle size={16} />
            <span>{t('common.help')}</span>
          </button>
          <button className={styles.menuItem} onClick={() => handleAction('exit')}>
            <LogOut size={16} />
            <span>{t('common.exit')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Menu
