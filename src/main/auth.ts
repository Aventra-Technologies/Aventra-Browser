import { ipcMain, app, BrowserWindow } from 'electron'
import { setSecureToken, getSecureToken, removeSecureToken } from './secureStorage'
import store from './storage'
import { randomUUID } from 'crypto'
import os from 'os'

export const setupAuthHandlers = () => {
  ipcMain.handle('auth-set-token', (_, key, value) => setSecureToken(key, value))
  ipcMain.handle('auth-get-token', (_, key) => getSecureToken(key))
  ipcMain.handle('auth-remove-token', (_, key) => removeSecureToken(key))
  
  ipcMain.handle('auth-get-device-info', () => {
    let deviceInfo = (store as any).get('deviceInfo')
    if (!deviceInfo || !deviceInfo.deviceId) {
      deviceInfo = {
        deviceId: randomUUID(),
        deviceName: process.platform === 'win32' ? 'Bamboo Browser on Windows' : `Bamboo Browser on ${process.platform}`,
        platform: process.platform,
        appVersion: app.getVersion()
      }
      ;(store as any).set('deviceInfo', deviceInfo)
    } else {
      // Ensure properties match, but preserve user-defined deviceName
      if (!deviceInfo.deviceName) {
        deviceInfo.deviceName = process.platform === 'win32' ? 'Bamboo Browser on Windows' : `Bamboo Browser on ${process.platform}`
      }
      deviceInfo.platform = process.platform
      deviceInfo.appVersion = app.getVersion()
      ;(store as any).set('deviceInfo', deviceInfo)
    }
    return deviceInfo
  })

  ipcMain.handle('auth-set-device-name', (_, newName) => {
    const deviceInfo = (store as any).get('deviceInfo') || {}
    deviceInfo.deviceName = newName
    ;(store as any).set('deviceInfo', deviceInfo)
    return deviceInfo
  })

  ipcMain.handle('auth-api-refresh', async () => {
    const refreshToken = getSecureToken('refreshToken')
    if (!refreshToken) throw new Error('No refresh token available')
    
    const response = await fetch('https://api.bamboo-ecosystem.tech/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshToken}`
      }
    })
    
    if (!response.ok) {
      removeSecureToken('refreshToken')
      removeSecureToken('accessToken')
      throw new Error('Refresh failed')
    }
    
    const data = await response.json()
    if (data.accessToken) {
      setSecureToken('accessToken', data.accessToken)
    }
    if (data.refreshToken) {
      setSecureToken('refreshToken', data.refreshToken)
    }
    return data.accessToken
  })

  ipcMain.handle('auth-google-login', async () => {
    return new Promise((resolve, reject) => {
      const authWindow = new BrowserWindow({
        width: 500,
        height: 600,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })
      
      const GOOGLE_AUTH_URL = 'https://api.bamboo-ecosystem.tech/api/auth/google/login'
      const CALLBACK_URL = 'https://api.bamboo-ecosystem.tech/api/auth/google/callback'

      authWindow.loadURL(GOOGLE_AUTH_URL)

      let resolved = false

      const handleCallback = (url: string) => {
        resolved = true
        authWindow.close()
        try {
          const parsed = new URL(url)
          const accessToken = parsed.searchParams.get('accessToken')
          const refreshToken = parsed.searchParams.get('refreshToken')
          if (accessToken && refreshToken) {
            resolve({ accessToken, refreshToken })
          } else {
            reject(new Error('Authentication tokens missing in callback URL'))
          }
        } catch (e: any) {
          reject(new Error('Failed to parse authentication callback URL'))
        }
      }

      authWindow.webContents.on('will-redirect', (event, url) => {
        if (url.startsWith(CALLBACK_URL)) {
          event.preventDefault()
          handleCallback(url)
        }
      })

      authWindow.webContents.on('will-navigate', (event, url) => {
        if (url.startsWith(CALLBACK_URL)) {
          event.preventDefault()
          handleCallback(url)
        }
      })

      authWindow.on('closed', () => {
        if (!resolved) {
          reject(new Error('Authentication was cancelled by the user.'))
        }
      })
    })
  })
}
