import React, { useState, useEffect } from 'react'
import { useSettingsStore, Language, Theme, StartupPage } from '../store/useSettingsStore'
import { useBrowserStore } from '../store/useBrowserStore'
import { useAuthStore } from '../store/useAuthStore'
import { useTabStore } from '../store/useTabStore'
import { Monitor, Smartphone, Globe, Download, Shield, Languages, Cpu, RotateCcw, Trash2, User } from 'lucide-react'
import styles from './SettingsPage.module.scss'
import AccountPage from './AccountPage/AccountPage'
import { useUpdateStore } from '../store/useUpdateStore'

const getStatusLabel = (state: string, lang: string) => {
  if (lang === 'ru') {
    switch (state) {
      case 'idle': return 'Обновления не проверялись'
      case 'checking': return 'Проверка обновлений...'
      case 'latest': return 'Установлена актуальная версия'
      case 'update_available': return 'Доступно обновление'
      case 'downloading': return 'Загрузка обновления...'
      case 'downloaded': return 'Обновление готово к установке'
      case 'applying': return 'Применение обновления...'
      case 'error': return 'Ошибка обновления'
      default: return state
    }
  } else if (lang === 'uk') {
    switch (state) {
      case 'idle': return 'Оновлення не перевірялися'
      case 'checking': return 'Перевірка оновлень...'
      case 'latest': return 'Встановлено найновішу версію'
      case 'update_available': return 'Доступне оновлення'
      case 'downloading': return 'Завантаження оновлення...'
      case 'downloaded': return 'Оновлення готове до встановлення'
      case 'applying': return 'Застосування оновлення...'
      case 'error': return 'Помилка оновлення'
      default: return state
    }
  } else {
    switch (state) {
      case 'idle': return 'Updates not checked'
      case 'checking': return 'Checking for updates...'
      case 'latest': return 'Your browser is up to date'
      case 'update_available': return 'Update available'
      case 'downloading': return 'Downloading update...'
      case 'downloaded': return 'Update downloaded and ready to install'
      case 'applying': return 'Applying update...'
      case 'error': return 'Error updating'
      default: return state
    }
  }
}

const SettingsPage: React.FC = () => {
  const { 
    language, setLanguage, 
    theme, setTheme, 
    searchEngineName, setSearchEngine,
    homePage, setHomePage,
    startupPage, setStartupPage,
    showBookmarksBar, setShowBookmarksBar,
    compactTabs, setCompactTabs,
    askDownloadFolder, setAskDownloadFolder,
    trackingProtection, setTrackingProtection,
    resetSettings, t 
  } = useSettingsStore()

  const {
    state: updateState,
    progress: updateProgress,
    error: updateError,
    updateInfo,
    currentVersion,
    checkForUpdates,
    downloadUpdate,
    applyUpdateAndRestart,
    initUpdater
  } = useUpdateStore()

  useEffect(() => {
    initUpdater()
  }, [])

  const { clearHistory } = useBrowserStore()
  const authStore = useAuthStore()
  const { tabs, activeTabId, updateTab } = useTabStore()
  const activeTab = tabs.find(t => t.id === activeTabId)
  const [activeSection, setActiveView] = useState('account')

  const sections = [
    { id: 'account', icon: <User size={18} />, label: t('bambooAccount') },
    { id: 'general', icon: <Globe size={18} />, label: t('settings.general') },
    { id: 'appearance', icon: <Monitor size={18} />, label: t('settings.appearance') },
    { id: 'search', icon: <Shield size={18} />, label: t('settings.search') },
    { id: 'downloads', icon: <Download size={18} />, label: t('common.downloads') },
    { id: 'privacy', icon: <Shield size={18} />, label: t('settings.privacy') },
    { id: 'languages', icon: <Languages size={18} />, label: t('settings.languages') },
    { id: 'advanced', icon: <Cpu size={18} />, label: t('settings.advanced') },
    { id: 'updates', icon: <RotateCcw size={18} />, label: t('settings.updates') },
  ]

  useEffect(() => {
    if (activeTab?.url) {
      if (activeTab.url === 'bamboo://settings/account' || activeTab.url === 'bamboo://account') {
        setActiveView('account')
      } else if (activeTab.url.startsWith('bamboo://settings/')) {
        const section = activeTab.url.replace('bamboo://settings/', '')
        const isValidSection = sections.some(s => s.id === section)
        if (isValidSection) {
          setActiveView(section)
        }
      }
    }
  }, [activeTab?.url])

  const handleClearCache = async () => {
    if (confirm('Clear all cache and cookies?')) {
      await (window as any).bambooApi.clearCache()
      alert('Cache cleared')
    }
  }

  const openAccountPage = () => {
    useTabStore.getState().addTab('bamboo://account')
  }

  return (
    <div className={styles.settingsPage}>
      <div className={styles.sidebar}>
        <h2 className={styles.title}>{t('common.settings')}</h2>
        <nav className={styles.nav}>
          {sections.map(s => (
            <button 
              key={s.id}
              className={`${styles.navItem} ${activeSection === s.id ? styles.active : ''}`}
              onClick={() => {
                setActiveView(s.id)
                if (activeTabId) {
                  updateTab(activeTabId, { url: `bamboo://settings/${s.id}` })
                }
              }}
            >
              {s.icon}
              <span>{s.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className={styles.content}>
        {activeSection === 'account' && (
          <AccountPage embedded={true} />
        )}

        {activeSection === 'general' && (
          <div className={styles.section}>
            <h3>{t('settings.general')}</h3>
            <div className={styles.settingGroup}>
              <label>Startup Behavior</label>
              <select value={startupPage} onChange={(e) => setStartupPage(e.target.value as StartupPage)}>
                <option value="newtab">Open New Tab page</option>
                <option value="previous">Restore previous session</option>
              </select>
            </div>
            <div className={styles.settingGroup}>
              <label>Home Page URL</label>
              <input 
                type="text" 
                value={homePage} 
                onChange={(e) => setHomePage(e.target.value)} 
                placeholder="https://..."
              />
            </div>
          </div>
        )}

        {activeSection === 'updates' && (
          <div className={styles.section}>
            <h3>{t('settings.updates')}</h3>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              background: 'rgba(255, 255, 255, 0.02)',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              backdropFilter: 'blur(10px)',
              maxWidth: '600px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {language === 'ru' ? 'Статус:' : language === 'uk' ? 'Статус:' : 'Status:'}
                </span>
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: updateState === 'error' ? '#ef4444' : updateState === 'latest' ? '#10b981' : 'var(--accent-color)'
                }}>
                  {getStatusLabel(updateState, language)}
                </span>
              </div>

              {updateError && (
                <div style={{ color: '#ef4444', fontSize: '13px', background: 'rgba(239, 68, 68, 0.08)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  {updateError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {language === 'ru' ? 'Текущая версия:' : language === 'uk' ? 'Поточна версія:' : 'Current version:'}
                </span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{currentVersion}</span>
              </div>

              {updateInfo && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {language === 'ru' ? 'Последняя версия:' : language === 'uk' ? 'Остання версія:' : 'Latest version:'}
                  </span>
                  <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{updateInfo.version}</span>
                </div>
              )}

              {updateState === 'downloading' && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span>
                      {language === 'ru' ? 'Загрузка...' : language === 'uk' ? 'Завантаження...' : 'Downloading...'}
                    </span>
                    <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{updateProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${updateProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-color), #51cf66)', transition: 'width 0.2s ease-out' }} />
                  </div>
                </div>
              )}

              {updateInfo?.releaseNotes && updateInfo.releaseNotes.length > 0 && (
                <div style={{ marginTop: '10px', background: 'rgba(0, 0, 0, 0.15)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', color: 'var(--accent-color)' }}>
                    {language === 'ru' ? 'Список изменений:' : language === 'uk' ? 'Список змін:' : 'Release Notes:'}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'disc', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                    {updateInfo.releaseNotes.map((note: string, idx: number) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                {(updateState === 'idle' || updateState === 'latest' || updateState === 'error' || updateState === 'update_available') && (
                  <button 
                    type="button"
                    className={styles.resetBtn}
                    style={{ margin: 0, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onClick={checkForUpdates}
                  >
                    <RotateCcw size={16} />
                    {language === 'ru' ? 'Проверить обновления' : language === 'uk' ? 'Перевірити оновлення' : 'Check for updates'}
                  </button>
                )}

                {updateState === 'update_available' && (
                  <button 
                    type="button"
                    className={styles.resetBtn}
                    style={{ margin: 0, padding: '10px 20px', backgroundColor: 'var(--accent-color)', color: '#070a0f', border: 'none', fontWeight: '600' }}
                    onClick={downloadUpdate}
                  >
                    {language === 'ru' ? 'Скачать обновление' : language === 'uk' ? 'Завантажити оновлення' : 'Download update'}
                  </button>
                )}

                {updateState === 'downloaded' && (
                  <button 
                    type="button"
                    className={styles.resetBtn}
                    style={{ margin: 0, padding: '10px 20px', backgroundColor: 'var(--accent-color)', color: '#070a0f', border: 'none', fontWeight: '600' }}
                    onClick={applyUpdateAndRestart}
                  >
                    {language === 'ru' ? 'Применить и перезапустить' : language === 'uk' ? 'Застосувати та перезапустити' : 'Restart and apply update'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'appearance' && (
          <div className={styles.section}>
            <h3>{t('settings.appearance')}</h3>
            <div className={styles.settingGroup}>
              <label>Theme</label>
              <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
                <option value="dark">Dark (Bamboo)</option>
                <option value="light">Light</option>
                <option value="system">Use System Setting</option>
              </select>
            </div>
            <div className={styles.settingGroup}>
              <label className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  checked={showBookmarksBar} 
                  onChange={(e) => setShowBookmarksBar(e.target.checked)} 
                />
                Show Bookmarks Bar
              </label>
            </div>
            <div className={styles.settingGroup}>
              <label className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  checked={compactTabs} 
                  onChange={(e) => setCompactTabs(e.target.checked)} 
                />
                Use Compact Tabs
              </label>
            </div>
          </div>
        )}

        {activeSection === 'search' && (
          <div className={styles.section}>
            <h3>{t('settings.search')}</h3>
            <div className={styles.settingGroup}>
              <label>Default Search Engine</label>
              <select 
                value={searchEngineName} 
                onChange={(e) => {
                  const name = e.target.value
                  let url = 'https://www.google.com/search?q='
                  if (name === 'DuckDuckGo') url = 'https://duckduckgo.com/?q='
                  if (name === 'Bing') url = 'https://www.bing.com/search?q='
                  if (name === 'Brave') url = 'https://search.brave.com/search?q='
                  setSearchEngine(name, url)
                }}
              >
                <option value="Google">Google</option>
                <option value="DuckDuckGo">DuckDuckGo</option>
                <option value="Bing">Bing</option>
                <option value="Brave">Brave</option>
              </select>
            </div>
          </div>
        )}

        {activeSection === 'downloads' && (
          <div className={styles.section}>
            <h3>{t('common.downloads')}</h3>
            <div className={styles.settingGroup}>
              <label className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  checked={askDownloadFolder} 
                  onChange={(e) => setAskDownloadFolder(e.target.checked)} 
                />
                Always ask where to save files
              </label>
            </div>
          </div>
        )}

        {activeSection === 'privacy' && (
          <div className={styles.section}>
            <h3>{t('settings.privacy')}</h3>

            <div className={styles.settingGroup} style={{ marginBottom: '2rem' }}>
              <label style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px', display: 'block', color: 'var(--text-primary)' }}>
                Enhanced Tracking Protection (Улучшенная защита от отслеживания)
              </label>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px', maxWidth: '600px', lineHeight: '1.4' }}>
                Bamboo Browser blocks tracking elements on websites to protect your privacy and load pages faster.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: 'white', cursor: 'default' }}>
                  <input
                    type="radio"
                    name="trackingProtection"
                    value="standard"
                    checked={trackingProtection === 'standard'}
                    onChange={() => setTrackingProtection('standard')}
                    style={{ accentColor: 'var(--accent-color)', width: '16px', height: '16px', marginTop: '2px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '14px' }}>Standard (Стандартная)</strong>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Blocks social media trackers, cross-site tracking cookies, and advertising scripts.
                    </div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: 'white', cursor: 'default' }}>
                  <input
                    type="radio"
                    name="trackingProtection"
                    value="strict"
                    checked={trackingProtection === 'strict'}
                    onChange={() => setTrackingProtection('strict')}
                    style={{ accentColor: 'var(--accent-color)', width: '16px', height: '16px', marginTop: '2px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '14px' }}>Strict (Строгая)</strong>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Blocks all known trackers, content scripts, and fingerprinting/cryptomining scripts. May break some sites.
                    </div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: 'white', cursor: 'default' }}>
                  <input
                    type="radio"
                    name="trackingProtection"
                    value="disabled"
                    checked={trackingProtection === 'disabled'}
                    onChange={() => setTrackingProtection('disabled')}
                    style={{ accentColor: 'var(--accent-color)', width: '16px', height: '16px', marginTop: '2px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '14px' }}>Disabled (Отключена)</strong>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Allows all scripts, cookies, and trackers. Not recommended.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className={styles.buttonGroup}>
              <button className={styles.dangerBtn} onClick={clearHistory}>
                <Trash2 size={16} />
                Clear History
              </button>
              <button className={styles.dangerBtn} onClick={handleClearCache}>
                <Trash2 size={16} />
                Clear Cache & Cookies
              </button>
            </div>
          </div>
        )}

        {activeSection === 'languages' && (
          <div className={styles.section}>
            <h3>{t('settings.languages')}</h3>
            <div className={styles.settingGroup}>
              <label>Select Language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
                <option value="en">English</option>
                <option value="ru">Русский</option>
                <option value="uk">Українська</option>
              </select>
            </div>
          </div>
        )}

        {activeSection === 'advanced' && (
          <div className={styles.section}>
            <h3>{t('settings.advanced')}</h3>
            <div className={styles.settingGroup}>
              <button className={styles.resetBtn} onClick={resetSettings}>
                <RotateCcw size={16} />
                Reset to Default Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsPage
