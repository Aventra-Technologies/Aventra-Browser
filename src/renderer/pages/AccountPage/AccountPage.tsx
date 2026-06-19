import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/useAuthStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useUpdateStore } from '../../store/useUpdateStore'
import { authService } from '../../services/authService'
import { syncService } from '../../services/syncService'
import { apiClient } from '../../services/apiClient'
import { useBrowserStore } from '../../store/useBrowserStore'
import { useTabStore } from '../../store/useTabStore'
import BambooLogo from '../../components/BambooLogo'
import { 
  Lock, Mail, AlertTriangle, User as UserIcon, RefreshCw, ShieldCheck, Laptop, LogOut, Loader2, CheckCircle2, Sparkles, Smartphone, Download
} from 'lucide-react'
import './AccountPage.css'

const translations = {
  ru: {
    title: "Аккаунт Bamboo",
    subtitle: "Облачная синхронизация браузера",
    description: "Войдите, чтобы синхронизировать настройки, закладки и открытые вкладки.",
    emailLabel: "Электронная почта",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Пароль",
    passwordPlaceholder: "Введите пароль",
    displayNameLabel: "Имя пользователя",
    displayNamePlaceholder: "Введите имя",
    confirmPasswordLabel: "Подтвердите пароль",
    confirmPasswordPlaceholder: "Повторите пароль",
    btnSignIn: "Войти",
    btnSignUp: "Создать аккаунт",
    btnGoogle: "Продолжить с Google",
    forgotPassword: "Забыли пароль? (Скоро появится)",
    noAccount: "У вас нет аккаунта? ",
    haveAccount: "Уже зарегистрированы? ",
    linkSignUp: "Создать аккаунт",
    linkSignIn: "Войти",
    
    // Dashboard
    statusLabel: "Статус",
    statusConnected: "Подключено",
    devicesCount: "Количество устройств",
    bookmarksCount: "Количество закладок",
    tabsCount: "Количество вкладок",
    lastSyncLabel: "Последняя синхронизация",
    btnSyncNow: "Синхронизировать сейчас",
    btnSyncing: "Синхронизация...",
    btnSignOut: "Выйти",
    loading: "Загрузка параметров аккаунта...",
    syncSuccess: "Данные успешно синхронизированы",
    syncError: "Ошибка синхронизации",
    never: "Никогда",
    emptyState: "Нет данных",

    // Updates Panel
    updatesTitle: "Обновления браузера",
    currentVersion: "Текущая версия",
    latestVersion: "Последняя версия",
    updateStatusLabel: "Состояние",
    updateStatusIdle: "Обновления не проверялись",
    updateStatusChecking: "Проверка обновлений...",
    updateStatusAvailable: "Доступно обновление!",
    updateStatusDownloading: "Загрузка обновления...",
    updateStatusDownloaded: "Обновление готово к установке",
    updateStatusApplying: "Установка и перезапуск...",
    updateStatusLatest: "Браузер обновлен",
    updateStatusError: "Ошибка обновления:",
    btnCheckUpdates: "Проверить обновления",
    btnDownloadUpdate: "Скачать обновление",
    btnApplyRestart: "Установить и перезагрузить",
    btnCheckingUpdates: "Проверка..."
  },
  en: {
    title: "Bamboo Account",
    subtitle: "Browser Cloud Sync",
    description: "Sign in to synchronize settings, bookmarks, and open tabs.",
    emailLabel: "Email Address",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter password",
    displayNameLabel: "Display Name",
    displayNamePlaceholder: "Enter display name",
    confirmPasswordLabel: "Confirm Password",
    confirmPasswordPlaceholder: "Repeat password",
    btnSignIn: "Sign In",
    btnSignUp: "Create Account",
    btnGoogle: "Continue with Google",
    forgotPassword: "Forgot Password? (Coming soon)",
    noAccount: "Don't have an account? ",
    haveAccount: "Already registered? ",
    linkSignUp: "Create Account",
    linkSignIn: "Sign In",
    
    // Dashboard
    statusLabel: "Status",
    statusConnected: "Connected",
    devicesCount: "Device count",
    bookmarksCount: "Bookmarks count",
    tabsCount: "Tabs count",
    lastSyncLabel: "Last sync",
    btnSyncNow: "Sync Now",
    btnSyncing: "Syncing...",
    btnSignOut: "Sign Out",
    loading: "Loading account settings...",
    syncSuccess: "Data synchronized successfully",
    syncError: "Sync error",
    never: "Never",
    emptyState: "No data",

    // Updates Panel
    updatesTitle: "Browser Updates",
    currentVersion: "Current version",
    latestVersion: "Latest version",
    updateStatusLabel: "Status",
    updateStatusIdle: "Updates not checked",
    updateStatusChecking: "Checking for updates...",
    updateStatusAvailable: "New update available!",
    updateStatusDownloading: "Downloading update...",
    updateStatusDownloaded: "Update ready to apply",
    updateStatusApplying: "Applying and restarting...",
    updateStatusLatest: "Browser is up to date",
    updateStatusError: "Update error:",
    btnCheckUpdates: "Check for Updates",
    btnDownloadUpdate: "Download Update",
    btnApplyRestart: "Apply & Restart",
    btnCheckingUpdates: "Checking..."
  }
}

// Reusable Updates component
const UpdatesPanel: React.FC<{ t: any; isRu: boolean }> = ({ t, isRu }) => {
  const {
    state: updateState,
    progress: updateProgress,
    error: updateError,
    updateInfo,
    currentVersion,
    checkForUpdates,
    downloadUpdate,
    applyUpdateAndRestart
  } = useUpdateStore()

  const getStatusText = () => {
    switch (updateState) {
      case 'idle': return t.updateStatusIdle
      case 'checking': return t.updateStatusChecking
      case 'update_available': return t.updateStatusAvailable
      case 'downloading': return t.updateStatusDownloading
      case 'downloaded': return t.updateStatusDownloaded
      case 'applying': return t.updateStatusApplying
      case 'latest': return t.updateStatusLatest
      case 'error': return `${t.updateStatusError} ${updateError || ''}`
      default: return ''
    }
  }

  return (
    <div className="bamboo-feature-card" style={{ flexDirection: 'column', gap: '12px', width: '100%' }}>
      <div className="flex items-center gap-2 border-b border-white/5 pb-2 w-full">
        <Sparkles size={16} className="text-[#7cffc4]" />
        <span className="font-bold text-xs text-white uppercase tracking-wider">{t.updatesTitle}</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-xs font-mono">
        <div>
          <span className="text-gray-500 block">{t.currentVersion}:</span>
          <span className="text-white font-semibold">{currentVersion || '1.0.0'}</span>
        </div>
        
        <div>
          <span className="text-gray-500 block">{t.latestVersion}:</span>
          <span className="text-white font-semibold">
            {updateInfo?.latestVersion || currentVersion || '1.0.0'}
          </span>
        </div>
        
        <div className="sm:col-span-1">
          <span className="text-gray-500 block">{t.updateStatusLabel}:</span>
          <span className={`${updateState === 'error' ? 'text-red-400' : 'text-[#7cffc4]'} font-semibold`}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Progress Bar for Downloading state */}
      {updateState === 'downloading' && (
        <div className="w-full mt-2">
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-[#7cffc4] h-full transition-all duration-300"
              style={{ width: `${updateProgress}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-gray-500 font-mono mt-1 block text-right">{updateProgress}%</span>
        </div>
      )}

      {/* Release Notes */}
      {updateInfo?.releaseNotes && updateInfo.releaseNotes.length > 0 && (
        <div className="w-full mt-2 pt-2 border-t border-white/5 text-left">
          <span className="text-[11px] text-gray-500 font-semibold block uppercase tracking-wider mb-2">
            {isRu ? "Что нового:" : "Release Notes:"}
          </span>
          <ul className="list-disc list-inside space-y-1 text-xs text-gray-400">
            {updateInfo.releaseNotes.map((note: string, idx: number) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="w-full text-right pt-1 flex justify-end">
        {/* Buttons based on states */}
        {(updateState === 'idle' || updateState === 'latest' || updateState === 'error') && (
          <button
            type="button"
            onClick={checkForUpdates}
            className="bamboo-switch-btn font-bold"
            style={{ fontSize: '13px' }}
          >
            {t.btnCheckUpdates}
          </button>
        )}

        {updateState === 'checking' && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
            <Loader2 size={12} className="animate-spin text-[#7cffc4]" />
            <span>{t.updateStatusChecking}</span>
          </div>
        )}

        {updateState === 'update_available' && (
          <button
            type="button"
            onClick={downloadUpdate}
            className="bamboo-switch-btn font-bold"
            style={{ fontSize: '13px', color: '#38bdf8' }}
          >
            {t.btnDownloadUpdate}
          </button>
        )}

        {updateState === 'downloading' && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
            <Loader2 size={12} className="animate-spin text-[#7cffc4]" />
            <span>{t.updateStatusDownloading}</span>
          </div>
        )}

        {updateState === 'downloaded' && (
          <button
            type="button"
            onClick={applyUpdateAndRestart}
            className="bamboo-switch-btn font-bold"
            style={{ fontSize: '13px', color: '#4ade80' }}
          >
            {t.btnApplyRestart}
          </button>
        )}

        {updateState === 'applying' && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
            <Loader2 size={12} className="animate-spin text-[#4ade80]" />
            <span>{t.updateStatusApplying}</span>
          </div>
        )}
      </div>
    </div>
  )
}

const parseArray = (res: any, key: string): any[] => {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (typeof res === 'object') {
    if (Array.isArray(res[key])) return res[key]
    if (res.data) {
      if (Array.isArray(res.data)) return res.data
      if (typeof res.data === 'object' && Array.isArray(res.data[key])) {
        return res.data[key]
      }
    }
    // Search top-level keys for any array
    for (const k of Object.keys(res)) {
      if (Array.isArray(res[k])) return res[k]
    }
    if (res.data && typeof res.data === 'object') {
      for (const k of Object.keys(res.data)) {
        if (Array.isArray(res.data[k])) return res.data[k]
      }
    }
  }
  return []
}

const collectTimestamps = (obj: any): string[] => {
  const dates: string[] = []
  const search = (val: any) => {
    if (!val) return
    if (Array.isArray(val)) {
      for (const item of val) {
        search(item)
      }
    } else if (typeof val === 'object') {
      for (const key of Object.keys(val)) {
        if (['updatedAt', 'updated_at', 'createdAt', 'created_at', 'lastActive', 'last_active'].includes(key)) {
          if (typeof val[key] === 'string' && val[key]) {
            dates.push(val[key])
          }
        }
        search(val[key])
      }
    }
  }
  search(obj)
  return dates
}

interface AccountPageProps {
  embedded?: boolean
}

const AccountPage: React.FC<AccountPageProps> = ({ embedded = false }) => {
  const authStore = useAuthStore()
  const { language } = useSettingsStore()
  const [guestView, setGuestView] = useState<'login' | 'register'>('login')
  
  // Resolve localized text helper
  const isRu = language === 'ru' || language === 'uk'
  const t = isRu ? translations.ru : translations.en

  // Form State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Dashboard Metrics State
  const [deviceCount, setDeviceCount] = useState<number | null>(null)
  const [bookmarksCount, setBookmarksCount] = useState<number | null>(null)
  const [tabsCount, setTabsCount] = useState<number | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<string>("")
  const [syncLoading, setSyncLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Stats fetching state
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)

  // Redesign state variables
  const [devicesList, setDevicesList] = useState<any[]>([])
  const [localDeviceInfo, setLocalDeviceInfo] = useState<any>(null)
  const [isEditingDeviceName, setIsEditingDeviceName] = useState(false)
  const [editDeviceNameValue, setEditDeviceNameValue] = useState("")

  // Sync checkboxes settings
  const [syncBookmarks, setSyncBookmarks] = useState(true)
  const [syncTabs, setSyncTabs] = useState(true)
  const [syncHistory, setSyncHistory] = useState(true)
  const [syncPasswords, setSyncPasswords] = useState(true)
  const [syncSettingsState, setSyncSettingsState] = useState(true)
  const [syncExtensions, setSyncExtensions] = useState(true)

  const fetchAllStats = async () => {
    if (!authStore.isAuthenticated || !authStore.accessToken) return
    setStatsLoading(true)
    setStatsError(null)
    try {
      const [devicesRes, bookmarksRes, tabsRes, settingsRes] = await Promise.all([
        apiClient('/api/browser/devices'),
        apiClient('/api/browser/sync/bookmarks'),
        apiClient('/api/browser/sync/tabs'),
        apiClient('/api/browser/sync/settings')
      ])

      const devices = parseArray(devicesRes, 'devices')
      const bookmarks = parseArray(bookmarksRes, 'bookmarks')
      const tabs = parseArray(tabsRes, 'tabs')

      setDeviceCount(devices.length)
      setBookmarksCount(bookmarks.length)
      setTabsCount(tabs.length)
      setDevicesList(devices)

      // Sync settings checkbox states
      const settings = settingsRes.settings || settingsRes.data?.settings || settingsRes || {}
      setSyncBookmarks(settings.syncBookmarks !== undefined ? settings.syncBookmarks : true)
      setSyncTabs(settings.syncTabs !== undefined ? settings.syncTabs : true)
      setSyncHistory(settings.syncHistory !== undefined ? settings.syncHistory : true)
      setSyncPasswords(settings.syncPasswords !== undefined ? settings.syncPasswords : true)
      setSyncSettingsState(settings.syncSettings !== undefined ? settings.syncSettings : true)
      setSyncExtensions(settings.syncExtensions !== undefined ? settings.syncExtensions : true)

      const timestamps = [
        ...collectTimestamps(devicesRes),
        ...collectTimestamps(bookmarksRes),
        ...collectTimestamps(tabsRes),
        ...collectTimestamps(settingsRes)
      ]

      const validTimes = timestamps
        .map(t => new Date(t).getTime())
        .filter(time => !isNaN(time))

      if (validTimes.length > 0) {
        const maxTime = Math.max(...validTimes)
        setLastSyncTime(new Date(maxTime).toISOString())
      } else {
        setLastSyncTime("")
      }
    } catch (e) {
      console.error('Error fetching dashboard statistics:', e)
      setStatsError(isRu ? "Не удалось загрузить данные синхронизации" : "Failed to load synchronization data")
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    if (authStore.isAuthenticated) {
      fetchAllStats()
      const interval = setInterval(fetchAllStats, 10000)
      return () => clearInterval(interval)
    }
  }, [authStore.isAuthenticated, authStore.isDeviceRegistered])

  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (authStore.isAuthenticated && document.visibilityState === 'visible') {
        fetchAllStats()
      }
    }
    
    // Refresh immediately on mount if tab is already open and focused/visible
    if (authStore.isAuthenticated && document.visibilityState === 'visible') {
      fetchAllStats()
    }

    window.addEventListener('focus', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)
    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
    }
  }, [authStore.isAuthenticated, authStore.isDeviceRegistered])

  // Get local device info on load
  useEffect(() => {
    const getLocalInfo = async () => {
      try {
        const info = await window.bambooApi.authGetDeviceInfo()
        setLocalDeviceInfo(info)
        setEditDeviceNameValue(info.deviceName || "")
      } catch (err) {
        console.warn('Failed to load local device info', err)
      }
    }
    getLocalInfo()
  }, [authStore.isAuthenticated, authStore.isDeviceRegistered])

  const handleUpdateDeviceName = async () => {
    if (!editDeviceNameValue.trim()) return
    try {
      const info = await window.bambooApi.authGetDeviceInfo()
      const updatedInfo = {
        ...info,
        deviceName: editDeviceNameValue
      }
      
      await apiClient('/api/browser/devices', {
        method: 'PUT',
        body: JSON.stringify(updatedInfo)
      })
      
      await window.bambooApi.authSetDeviceName(editDeviceNameValue)
      setLocalDeviceInfo((prev: any) => prev ? { ...prev, deviceName: editDeviceNameValue } : prev)
      setIsEditingDeviceName(false)
      fetchAllStats()
    } catch (err) {
      console.error('Failed to update device name', err)
      setError(isRu ? "Не удалось обновить имя устройства" : "Failed to update device name")
    }
  }

  const handleToggleSyncCheckbox = async (key: string, currentValue: boolean) => {
    const newValue = !currentValue
    
    if (key === 'syncBookmarks') setSyncBookmarks(newValue)
    if (key === 'syncTabs') setSyncTabs(newValue)
    if (key === 'syncHistory') setSyncHistory(newValue)
    if (key === 'syncPasswords') setSyncPasswords(newValue)
    if (key === 'syncSettings') setSyncSettingsState(newValue)
    if (key === 'syncExtensions') setSyncExtensions(newValue)

    try {
      const settingsRes = await apiClient('/api/browser/sync/settings')
      const remoteSettings = settingsRes.settings || settingsRes.data?.settings || settingsRes || {}
      
      const updatedSettings = {
        ...remoteSettings,
        syncBookmarks: key === 'syncBookmarks' ? newValue : (remoteSettings.syncBookmarks !== undefined ? remoteSettings.syncBookmarks : true),
        syncTabs: key === 'syncTabs' ? newValue : (remoteSettings.syncTabs !== undefined ? remoteSettings.syncTabs : true),
        syncHistory: key === 'syncHistory' ? newValue : (remoteSettings.syncHistory !== undefined ? remoteSettings.syncHistory : true),
        syncPasswords: key === 'syncPasswords' ? newValue : (remoteSettings.syncPasswords !== undefined ? remoteSettings.syncPasswords : true),
        syncSettings: key === 'syncSettings' ? newValue : (remoteSettings.syncSettings !== undefined ? remoteSettings.syncSettings : true),
        syncExtensions: key === 'syncExtensions' ? newValue : (remoteSettings.syncExtensions !== undefined ? remoteSettings.syncExtensions : true),
      }

      await apiClient('/api/browser/sync/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings: updatedSettings })
      })
    } catch (e) {
      console.error('Failed to update sync settings:', e)
      setError(isRu ? "Не удалось сохранить настройки синхронизации" : "Failed to save sync settings")
    }
  }

  const handleManageAccount = () => {
    useTabStore.getState().addTab('https://account.bamboo-ecosystem.tech')
  }

  const handleDisconnectDevice = async (deviceId: string) => {
    if (!confirm(isRu ? "Вы уверены, что хотите отключить это устройство?" : "Are you sure you want to disconnect this device?")) {
      return
    }
    try {
      await apiClient(`/api/browser/devices/${deviceId}`, {
        method: 'DELETE'
      })
      fetchAllStats()
    } catch (err) {
      console.error('Failed to disconnect device', err)
      setError(isRu ? "Не удалось отключить устройство" : "Failed to disconnect device")
    }
  }

  const handleSubmitGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    try {
      if (guestView === 'register') {
        if (password !== confirmPassword) {
          setError(isRu ? "Пароли не совпадают." : "Passwords do not match.")
          setLoading(false)
          return
        }
        await authService.register({ email, password, displayName })
      } else {
        await authService.login({ email, password })
      }
      setError(null)
    } catch (err: any) {
      setError(err.message || (isRu ? "Неверные учетные данные или ошибка связи." : "Authentication failed. Please verify credentials."))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError(null)
    try {
      await authService.googleLogin()
    } catch (err: any) {
      setError(err.message || "Google OAuth failed")
    }
  }

  const handleLogout = async () => {
    setError(null)
    setFeedback(null)
    setLoading(true)
    try {
      await authService.logout()
    } catch (err) {
      console.warn("Logout failed, logging out locally", err)
    } finally {
      setLoading(false)
    }
  }

  const handleForceSync = async () => {
    setSyncLoading(true)
    setFeedback(null)
    setError(null)
    try {
      await apiClient("/api/browser/sync/pull", { method: 'POST' })
      await syncService.syncNow()
      await fetchAllStats()
      setFeedback(t.syncSuccess)
    } catch (err) {
      setError(t.syncError)
    } finally {
      setSyncLoading(false)
    }
  }

  const formatTime = (isoString?: string) => {
    if (!isoString) return t.never
    const d = new Date(isoString)
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) + " (" + d.toLocaleDateString() + ")"
  }

  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return isRu ? "Неизвестно" : "Unknown"
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return isRu ? "Неизвестно" : "Unknown"
    return date.toLocaleString()
  }

  const benefitsList = isRu ? [
    {
      tag: "Синхронизация",
      title: "Синхронизация между устройствами",
      desc: "Синхронизируйте свои настройки, закладки и открытые вкладки на всех устройствах.",
      icon: RefreshCw
    },
    {
      tag: "Безопасность",
      title: "Безопасное хранение данных",
      desc: "Ваши пароли и данные надежно шифруются и защищаются в облаке.",
      icon: ShieldCheck
    },
    {
      tag: "Устройства",
      title: "Управление подключёнными устройствами",
      desc: "Отслеживайте активные сессии и отключайте другие устройства в один клик.",
      icon: Laptop
    }
  ] : [
    {
      tag: "Synchronization",
      title: "Cross-Device Sync",
      desc: "Synchronize your settings, bookmarks, and open tabs across all devices.",
      icon: RefreshCw
    },
    {
      tag: "Security",
      title: "Secure Data Storage",
      desc: "Your passwords and data are securely encrypted and protected in the cloud.",
      icon: ShieldCheck
    },
    {
      tag: "Devices",
      title: "Manage Connected Devices",
      desc: "Monitor active sessions and disconnect other devices in a single click.",
      icon: Laptop
    }
  ]

  // RENDER LOADING STATE
  if (authStore.loading || loading) {
    return (
      <div className={embedded ? "bamboo-account-embedded-loading" : "bamboo-account-container"}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#7cffc4] animate-spin" />
          <p className="text-gray-500 font-mono text-xs">{t.loading}</p>
        </div>
      </div>
    )
  }

  // RENDER AUTHENTICATED STATE (DASHBOARD)
  if (authStore.isAuthenticated) {
    const displayDevices = deviceCount !== null ? `${deviceCount}` : "0"
    const displayBookmarks = bookmarksCount !== null ? `${bookmarksCount}` : "0"
    const displayTabs = tabsCount !== null ? `${tabsCount}` : "0"
    const displayLastSync = lastSyncTime ? formatTime(lastSyncTime) : t.never

    return (
      <div className={embedded ? "bamboo-account-embedded-dashboard" : "bamboo-account-container"}>
        {/* Radial glow background details */}
        {!embedded && (
          <>
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#7cffc4]/5 blur-[150px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#00f2fe]/5 blur-[150px] pointer-events-none"></div>
          </>
        )}

        <div className="bamboo-account-redesign-layout">
          {/* Header row */}
          <div className="bamboo-redesign-header">
            <h1 className="bamboo-redesign-title">
              {isRu ? "Аккаунт и синхронизация" : "Account & Sync"}
            </h1>
            <p className="bamboo-redesign-subtitle">
              {isRu ? "Управление учётной записью Bamboo и облачной синхронизацией" : "Manage your Bamboo account and cloud synchronization"}
            </p>
          </div>

          {/* Feedback & loaders */}
          {error && (
            <div className="bamboo-error-card">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {feedback && (
            <div className="bamboo-error-card" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', color: '#a7f3d0' }}>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{feedback}</span>
            </div>
          )}
          {statsLoading && (
            <div className="bamboo-error-card" style={{ background: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#9ca3af' }}>
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin shrink-0 mt-0.5" />
              <span>{isRu ? "Загрузка данных..." : "Loading data..."}</span>
            </div>
          )}
          {!statsLoading && statsError && (
            <div className="bamboo-error-card">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{statsError}</span>
            </div>
          )}

          {/* Main Grid */}
          <div className="bamboo-redesign-grid">
            
            {/* COLUMN 1 */}
            <div className="bamboo-grid-col">
              
              {/* Block 1: Account */}
              <div className="bamboo-cyber-card">
                <div className="bamboo-card-header">
                  <UserIcon className="bamboo-card-icon" />
                  <h3>{isRu ? "Аккаунт" : "Account"}</h3>
                </div>
                <div className="bamboo-card-content bamboo-account-info-block">
                  <div className="bamboo-avatar-wrapper">
                    {authStore.user?.avatar ? (
                      <img src={authStore.user.avatar} className="bamboo-avatar-img" alt="Avatar" />
                    ) : (
                      <div className="bamboo-avatar-placeholder">
                        {authStore.user?.displayName?.[0]?.toUpperCase() || authStore.user?.email?.[0]?.toUpperCase() || "B"}
                      </div>
                    )}
                  </div>
                  <div className="bamboo-account-details">
                    <h4 className="bamboo-display-name">{authStore.user?.displayName || (isRu ? "Пользователь Bamboo" : "Bamboo User")}</h4>
                    <p className="bamboo-email-text">{authStore.user?.email}</p>
                    <div className="bamboo-connection-badge">
                      <span className="bamboo-pulse-dot"></span>
                      <span>{isRu ? "Подключено к Bamboo Account" : "Connected to Bamboo Account"}</span>
                    </div>
                  </div>
                </div>
                <div className="bamboo-card-actions">
                  <button type="button" onClick={handleManageAccount} className="bamboo-btn-cyber">
                    {isRu ? "Управление аккаунтом" : "Manage Account"}
                  </button>
                  <button type="button" onClick={handleLogout} className="bamboo-btn-cyber danger">
                    <LogOut size={14} />
                    {isRu ? "Выйти" : "Sign Out"}
                  </button>
                </div>
              </div>

              {/* Block 3: Device */}
              <div className="bamboo-cyber-card">
                <div className="bamboo-card-header">
                  <Laptop className="bamboo-card-icon" />
                  <h3>{isRu ? "Устройство" : "Device"}</h3>
                </div>
                <div className="bamboo-card-content space-y-4">
                  <div className="bamboo-info-row">
                    <span className="bamboo-info-label">{isRu ? "Имя устройства" : "Device Name"}:</span>
                    {isEditingDeviceName ? (
                      <div className="flex gap-2 w-full mt-1" style={{ display: 'flex', gap: '8px', marginTop: '4px', width: '100%' }}>
                        <input
                          type="text"
                          value={editDeviceNameValue}
                          onChange={(e) => setEditDeviceNameValue(e.target.value)}
                          className="bamboo-input-cyber-small"
                        />
                        <button type="button" onClick={handleUpdateDeviceName} className="bamboo-btn-cyber-icon-save">
                          Save
                        </button>
                        <button type="button" onClick={() => { setIsEditingDeviceName(false); setEditDeviceNameValue(localDeviceInfo?.deviceName || ""); }} className="bamboo-btn-cyber-icon-cancel">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="bamboo-device-name-display">
                        <span className="bamboo-info-value">{localDeviceInfo?.deviceName || "Bamboo Browser on Windows"}</span>
                        <button type="button" onClick={() => setIsEditingDeviceName(true)} className="bamboo-link-action ml-2" style={{ marginLeft: '8px' }}>
                          {isRu ? "Изменить" : "Change"}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="bamboo-info-row font-mono text-xs">
                    <div style={{ marginTop: '10px' }}>
                      <span className="bamboo-info-label">{isRu ? "Версия браузера" : "Browser Version"}:</span>{" "}
                      <span className="bamboo-info-value">{localDeviceInfo?.appVersion || "1.0.0"}</span>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <span className="bamboo-info-label">{isRu ? "Платформа" : "Platform"}:</span>{" "}
                      <span className="bamboo-info-value">{localDeviceInfo?.platform || "windows"}</span>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <span className="bamboo-info-label">{isRu ? "Device ID" : "Device ID"}:</span>{" "}
                      <span className="bamboo-info-value text-gray-500">{localDeviceInfo?.deviceId || "loading..."}</span>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <span className="bamboo-info-label">{isRu ? "Последняя активность" : "Last Activity"}:</span>{" "}
                      <span className="bamboo-info-value">{formatTimeAgo(localDeviceInfo?.updatedAt || localDeviceInfo?.updated_at || new Date().toISOString())}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Block 4: Connected Devices */}
              <div className="bamboo-cyber-card">
                <div className="bamboo-card-header">
                  <Smartphone className="bamboo-card-icon" />
                  <h3>{isRu ? "Подключённые устройства" : "Connected Devices"}</h3>
                </div>
                <div className="bamboo-card-content">
                  <div className="bamboo-devices-list">
                    {devicesList.length === 0 ? (
                      <div className="text-gray-500 font-mono text-xs p-2">
                        {isRu ? "Загрузка списка устройств..." : "Loading devices list..."}
                      </div>
                    ) : (
                      devicesList.map((dev: any) => {
                        const isThisComp = dev.deviceId === localDeviceInfo?.deviceId
                        return (
                          <div key={dev.deviceId || dev.id} className="bamboo-device-item">
                            <div className="bamboo-device-item-left">
                              <span className="bamboo-device-item-name">{dev.deviceName || "Unnamed Device"}</span>
                              {isThisComp && (
                                <span className="bamboo-this-comp-badge">
                                  {isRu ? "Этот компьютер" : "This computer"}
                                </span>
                              )}
                              <span className="bamboo-device-item-meta" style={{ marginTop: '4px', display: 'block' }}>
                                {dev.platform} • {isRu ? "Активность" : "Active"}: {formatTimeAgo(dev.updatedAt || dev.updated_at || dev.lastActive)}
                              </span>
                            </div>
                            {!isThisComp && (
                              <button
                                type="button"
                                onClick={() => handleDisconnectDevice(dev.deviceId || dev.id)}
                                className="bamboo-btn-cyber-small-danger"
                              >
                                {isRu ? "Отключить" : "Disconnect"}
                              </button>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* COLUMN 2 */}
            <div className="bamboo-grid-col">

              {/* Block 2: Sync */}
              <div className="bamboo-cyber-card">
                <div className="bamboo-card-header">
                  <RefreshCw className="bamboo-card-icon" />
                  <h3>{isRu ? "Синхронизация" : "Synchronization"}</h3>
                </div>
                <div className="bamboo-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="flex items-center justify-between border-b border-white/5 pb-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                      <span className="bamboo-info-label block">{isRu ? "Статус" : "Status"}:</span>
                      <span className={`font-semibold ${authStore.isSyncEnabled ? 'text-[#7cffc4]' : 'text-gray-400'}`}>
                        {authStore.isSyncEnabled 
                          ? (isRu ? "Синхронизация включена" : "Sync enabled") 
                          : (isRu ? "Синхронизация отключена" : "Sync disabled")}
                      </span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleForceSync}
                      disabled={syncLoading}
                      className="bamboo-btn-cyber-sync"
                    >
                      {syncLoading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>{t.btnSyncing}</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={14} />
                          <span>{isRu ? "Синхронизировать сейчас" : "Sync Now"}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="bamboo-sync-checkboxes-block">
                    <h4 className="bamboo-sync-section-title">{isRu ? "Что синхронизируется" : "What is synchronized"}</h4>
                    
                    {/* General Sync Enabled Toggle */}
                    <label className="bamboo-checkbox-cyber-main">
                      <input 
                        type="checkbox" 
                        checked={authStore.isSyncEnabled} 
                        onChange={(e) => authStore.setSyncEnabled(e.target.checked)}
                      />
                      <span className="bamboo-checkbox-text-bold">{isRu ? "Включить общую синхронизацию" : "Enable Synchronization"}</span>
                    </label>

                    <div className="bamboo-sync-subcheckboxes-grid">
                      <label className="bamboo-checkbox-cyber">
                        <input 
                          type="checkbox" 
                          checked={syncBookmarks}
                          disabled={!authStore.isSyncEnabled}
                          onChange={() => handleToggleSyncCheckbox('syncBookmarks', syncBookmarks)}
                        />
                        <span>{isRu ? "Закладки" : "Bookmarks"}</span>
                      </label>

                      <label className="bamboo-checkbox-cyber">
                        <input 
                          type="checkbox" 
                          checked={syncTabs}
                          disabled={!authStore.isSyncEnabled}
                          onChange={() => handleToggleSyncCheckbox('syncTabs', syncTabs)}
                        />
                        <span>{isRu ? "Открытые вкладки" : "Open Tabs"}</span>
                      </label>

                      <label className="bamboo-checkbox-cyber">
                        <input 
                          type="checkbox" 
                          checked={syncHistory}
                          disabled={!authStore.isSyncEnabled}
                          onChange={() => handleToggleSyncCheckbox('syncHistory', syncHistory)}
                        />
                        <span>{isRu ? "История" : "History"}</span>
                      </label>

                      <label className="bamboo-checkbox-cyber">
                        <input 
                          type="checkbox" 
                          checked={syncPasswords}
                          disabled={!authStore.isSyncEnabled}
                          onChange={() => handleToggleSyncCheckbox('syncPasswords', syncPasswords)}
                        />
                        <span>{isRu ? "Пароли" : "Passwords"}</span>
                      </label>

                      <label className="bamboo-checkbox-cyber">
                        <input 
                          type="checkbox" 
                          checked={syncSettingsState}
                          disabled={!authStore.isSyncEnabled}
                          onChange={() => handleToggleSyncCheckbox('syncSettings', syncSettingsState)}
                        />
                        <span>{isRu ? "Настройки" : "Settings"}</span>
                      </label>

                      <label className="bamboo-checkbox-cyber">
                        <input 
                          type="checkbox" 
                          checked={syncExtensions}
                          disabled={!authStore.isSyncEnabled}
                          onChange={() => handleToggleSyncCheckbox('syncExtensions', syncExtensions)}
                        />
                        <span>{isRu ? "Расширения" : "Extensions"}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Block 7: Stats (Metrics) */}
              <div className="bamboo-cyber-card">
                <div className="bamboo-card-header">
                  <Sparkles className="bamboo-card-icon" />
                  <h3>{isRu ? "Статистика синхронизации" : "Sync Statistics"}</h3>
                </div>
                <div className="bamboo-card-content">
                  <div className="bamboo-dashboard-stats-grid" style={{ padding: 0 }}>
                    <div className="bamboo-dashboard-stat-card">
                      <span className="bamboo-dashboard-stat-label">{t.devicesCount}</span>
                      <span className="bamboo-dashboard-stat-value">{displayDevices}</span>
                    </div>
                    
                    <div className="bamboo-dashboard-stat-card">
                      <span className="bamboo-dashboard-stat-label">{t.bookmarksCount}</span>
                      <span className="bamboo-dashboard-stat-value">{displayBookmarks}</span>
                    </div>
                    
                    <div className="bamboo-dashboard-stat-card">
                      <span className="bamboo-dashboard-stat-label">{t.tabsCount}</span>
                      <span className="bamboo-dashboard-stat-value">{displayTabs}</span>
                    </div>
                    
                    <div className="bamboo-dashboard-stat-card">
                      <span className="bamboo-dashboard-stat-label">{t.lastSyncLabel}</span>
                      <span className="bamboo-dashboard-stat-value text-xs font-mono">{displayLastSync}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Block 8: OTA Updates */}
              <UpdatesPanel t={t} isRu={isRu} />

              {/* Block 6: Backup */}
              <div className="bamboo-cyber-card">
                <div className="bamboo-card-header">
                  <ShieldCheck className="bamboo-card-icon" />
                  <h3>{isRu ? "Резервное копирование" : "Backup & Restore"}</h3>
                </div>
                <div className="bamboo-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="flex flex-col gap-1">
                    <span className="bamboo-info-label">{isRu ? "Статус резервного копирования" : "Backup Status"}:</span>
                    <span className="text-gray-500 font-semibold">{isRu ? "Отключено (Coming Soon)" : "Disabled (Coming Soon)"}</span>
                  </div>
                  <div className="flex gap-2" style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" disabled className="bamboo-btn-cyber disabled">
                      {isRu ? "Создать резервную копию" : "Create Backup"}
                    </button>
                    <button type="button" disabled className="bamboo-btn-cyber disabled">
                      {isRu ? "Восстановить данные" : "Restore Data"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Block 5: Import Data */}
              <div className="bamboo-cyber-card">
                <div className="bamboo-card-header">
                  <Download className="bamboo-card-icon" />
                  <h3>{isRu ? "Импорт данных браузера" : "Import Browser Data"}</h3>
                </div>
                <div className="bamboo-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p className="text-xs text-gray-500 mb-2">
                    {isRu ? "Перенесите свои закладки, пароли и историю из других браузеров" : "Transfer bookmarks, passwords, and history from other browsers"}
                  </p>
                  <div className="grid grid-cols-2 gap-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button type="button" disabled className="bamboo-btn-cyber-small-import disabled">
                      Firefox (+ Coming Soon)
                    </button>
                    <button type="button" disabled className="bamboo-btn-cyber-small-import disabled">
                      Chrome (+ Coming Soon)
                    </button>
                    <button type="button" disabled className="bamboo-btn-cyber-small-import disabled">
                      Edge (+ Coming Soon)
                    </button>
                    <button type="button" disabled className="bamboo-btn-cyber-small-import disabled">
                      Opera (+ Coming Soon)
                    </button>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    )
  }

  // RENDER GUEST INTERFACE (LOGGED OUT)
  return (
    <div className={embedded ? "bamboo-account-embedded-dashboard" : "bamboo-account-container"}>
      {/* Radial glow background details */}
      {!embedded && (
        <>
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#7cffc4]/5 blur-[150px] pointer-events-none"></div>
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#00f2fe]/5 blur-[150px] pointer-events-none"></div>
        </>
      )}

      <div className={embedded ? "bamboo-account-embedded-wrapper" : "bamboo-account-wrapper"}>
        
        {/* Left Column: Login/Register Card (420px wide) */}
        <div className="bamboo-left-column">
          <div className="bamboo-card">
            
            {/* Logo Area */}
            <div className="flex flex-col items-center gap-2 mb-6">
              <BambooLogo size="md" className="mb-1" />
              <h2 className="text-xl font-bold font-display text-white tracking-tight leading-none">
                {guestView === 'register' ? t.btnSignUp : t.btnSignIn}
              </h2>
            </div>

            <form onSubmit={handleSubmitGuest} className="space-y-4">
              {error && (
                <div className="bamboo-error-card">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Display Name Input (Only on Register) */}
              {guestView === 'register' && (
                <div className="bamboo-form-group">
                  <label className="bamboo-label">{t.displayNameLabel}</label>
                  <div className="bamboo-input-wrapper">
                    <UserIcon className="bamboo-input-icon" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t.displayNamePlaceholder}
                      className="bamboo-input"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div className="bamboo-form-group">
                <label className="bamboo-label">{t.emailLabel}</label>
                <div className="bamboo-input-wrapper">
                  <Mail className="bamboo-input-icon" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    className="bamboo-input"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="bamboo-form-group">
                <label className="bamboo-label">{t.passwordLabel}</label>
                <div className="bamboo-input-wrapper">
                  <Lock className="bamboo-input-icon" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    className="bamboo-input"
                    required
                  />
                </div>
                {guestView === 'login' && (
                  <div>
                    <button type="button" className="bamboo-forgot-link cursor-not-allowed">
                      {t.forgotPassword}
                    </button>
                  </div>
                )}
              </div>

              {/* Confirm Password Input (Only on Register) */}
              {guestView === 'register' && (
                <div className="bamboo-form-group">
                  <label className="bamboo-label">{t.confirmPasswordLabel}</label>
                  <div className="bamboo-input-wrapper">
                    <Lock className="bamboo-input-icon" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t.confirmPasswordPlaceholder}
                      className="bamboo-input"
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="bamboo-btn-primary"
              >
                {guestView === 'register' ? t.btnSignUp : t.btnSignIn}
              </button>
            </form>

            <div className="bamboo-divider">
              <span className="bamboo-divider-text">OR</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="bamboo-btn-google"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{t.btnGoogle}</span>
            </button>

            <div className="bamboo-switch-text">
              <span>
                {guestView === 'register' ? t.haveAccount : t.noAccount}
              </span>
              <button
                type="button"
                onClick={() => { setGuestView(guestView === 'register' ? 'login' : 'register'); setError(null); }}
                className="bamboo-switch-btn"
              >
                {guestView === 'register' ? t.linkSignIn : t.linkSignUp}
              </button>
            </div>

          </div>
        </div>

        {/* Right Column: Benefits & Cards (460px wide) */}
        <div className="bamboo-right-column">
          <div className="flex flex-col gap-1 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <BambooLogo size="lg" />
              <h1 className="bamboo-benefits-title">{isRu ? "Аккаунт Bamboo" : "Bamboo Account"}</h1>
            </div>
            <p className="text-[#7cffc4] font-mono text-xs uppercase tracking-wider mt-2">
              // {isRu ? "Облачная синхронизация браузера" : "Browser Cloud Sync"}
            </p>
            <p className="bamboo-benefits-subtitle mt-2">
              {isRu ? "Войдите, чтобы синхронизировать настройки, закладки и открытые вкладки." : "Sign in to synchronize settings, bookmarks, and open tabs."}
            </p>
          </div>

          {/* 3 аккуратные feature-карточки */}
          {benefitsList.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <div key={index} className="bamboo-feature-card">
                <div className="bamboo-feature-icon">
                  <Icon size={20} />
                </div>
                <div className="bamboo-feature-content">
                  <span className="bamboo-feature-tag">{benefit.tag}</span>
                  <h4 className="bamboo-feature-title">{benefit.title}</h4>
                  <p className="bamboo-feature-desc">{benefit.desc}</p>
                </div>
              </div>
            )
          })}

          {/* Reusable Updates Panel for Guests */}
          <UpdatesPanel t={t} isRu={isRu} />
        </div>

      </div>
    </div>
  )
}

export default AccountPage
