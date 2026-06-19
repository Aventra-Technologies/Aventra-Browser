import { safeStorage } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

const getStoragePath = () => path.join(app.getPath('userData'), 'secure-tokens.json')

export const setSecureToken = (key: string, value: string) => {
  try {
    const filePath = getStoragePath()
    let data: Record<string, string> = {}
    if (fs.existsSync(filePath)) {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    }
    
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(value)
      data[key] = encrypted.toString('base64')
    } else {
      // Fallback
      data[key] = value
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8')
    return true
  } catch (e) {
    console.error('Error saving secure token', e)
    return false
  }
}

export const getSecureToken = (key: string): string | null => {
  try {
    const filePath = getStoragePath()
    if (!fs.existsSync(filePath)) return null
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    if (!data[key]) return null
    
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(data[key], 'base64'))
    } else {
      return data[key]
    }
  } catch (e) {
    console.error('Error reading secure token', e)
    return null
  }
}

export const removeSecureToken = (key: string) => {
  try {
    const filePath = getStoragePath()
    if (!fs.existsSync(filePath)) return false
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    delete data[key]
    
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8')
    return true
  } catch (e) {
    console.error('Error removing secure token', e)
    return false
  }
}
