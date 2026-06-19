import { app, ipcMain, BrowserWindow } from 'electron'
import { join, resolve, dirname, relative, isAbsolute } from 'path'
import * as fs from 'fs'
import * as https from 'https'
import * as crypto from 'crypto'
import { spawn } from 'child_process'
import AdmZip from 'adm-zip'
import { UPDATE_MANIFEST_URL } from './updateConfig'
import { fileURLToPath } from 'url'

let state: 'idle' | 'checking' | 'update_available' | 'downloading' | 'downloaded' | 'applying' | 'latest' | 'error' = 'idle'
let progress = 0
let error: string | null = null
let updateInfo: any = null

function broadcastStatus() {
  const status = { state, progress, error, updateInfo, currentVersion: app.getVersion() }
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('updater-status-change', status)
    }
  }
}

function parseSemver(v: string) {
  const m = v.trim().replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/)
  if (!m) {
    return { major: 0, minor: 0, patch: 0, prerelease: null }
  }
  return {
    major: parseInt(m[1], 10),
    minor: parseInt(m[2], 10),
    patch: parseInt(m[3], 10),
    prerelease: m[4] || null
  }
}

function compareVersions(v1: string, v2: string): number {
  const s1 = parseSemver(v1)
  const s2 = parseSemver(v2)

  if (s1.major !== s2.major) return s1.major > s2.major ? 1 : -1
  if (s1.minor !== s2.minor) return s1.minor > s2.minor ? 1 : -1
  if (s1.patch !== s2.patch) return s1.patch > s2.patch ? 1 : -1

  if (s1.prerelease === s2.prerelease) return 0
  if (s1.prerelease === null) return 1
  if (s2.prerelease === null) return -1

  const p1 = s1.prerelease.split('.')
  const p2 = s2.prerelease.split('.')
  const len = Math.max(p1.length, p2.length)
  for (let i = 0; i < len; i++) {
    const part1 = p1[i]
    const part2 = p2[i]
    if (part1 === undefined) return -1
    if (part2 === undefined) return 1

    const isNum1 = /^\d+$/.test(part1)
    const isNum2 = /^\d+$/.test(part2)

    if (isNum1 && isNum2) {
      const n1 = parseInt(part1, 10)
      const n2 = parseInt(part2, 10)
      if (n1 !== n2) return n1 > n2 ? 1 : -1
    } else if (isNum1) {
      return -1
    } else if (isNum2) {
      return 1
    } else {
      if (part1 !== part2) return part1 > part2 ? 1 : -1
    }
  }
  return 0
}

function validateManifest(manifest: any): boolean {
  if (!manifest) return false
  if (typeof manifest.version !== 'string' || !manifest.version) return false
  if (typeof manifest.packageName !== 'string' || !manifest.packageName) return false
  if (typeof manifest.packageUrl !== 'string' || !manifest.packageUrl) return false
  if (typeof manifest.sha256 !== 'string' || !manifest.sha256) return false
  return true
}

function getExpectedReleasePrefix(manifestUrl: string): string {
  try {
    const url = new URL(manifestUrl)
    if (url.hostname === 'github.com' || url.hostname.endsWith('.github.com')) {
      const parts = url.pathname.split('/').filter(Boolean)
      if (parts.length >= 2) {
        const owner = parts[0]
        const repo = parts[1]
        return `https://github.com/${owner}/${repo}/releases/download/`
      }
    }
  } catch (e) {}
  return ''
}

export function cleanupOldFiles() {
  try {
    const appDir = dirname(process.execPath)
    const files = fs.readdirSync(appDir)
    for (const file of files) {
      if (file.endsWith('.old')) {
        const filePath = join(appDir, file)
        try {
          fs.unlinkSync(filePath)
          console.log(`Cleaned up old update file: ${filePath}`)
        } catch (e) {}
      }
    }
  } catch (e) {}
}

function fetchJson(url: string): Promise<any> {
  return new Promise((resolvePromise, rejectPromise) => {
    https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchJson(res.headers.location).then(resolvePromise).catch(rejectPromise)
        return
      }
      if (res.statusCode !== 200) {
        rejectPromise(new Error(`Update metadata server returned status: ${res.statusCode}`))
        return
      }
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          resolvePromise(JSON.parse(data))
        } catch (e) {
          rejectPromise(e)
        }
      })
    }).on('error', (err) => {
      rejectPromise(err)
    })
  })
}

function downloadFile(url: string, destPath: string, onProgress: (received: number, total: number) => void): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const file = fs.createWriteStream(destPath)
    https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close()
        fs.unlink(destPath, () => {})
        downloadFile(res.headers.location, destPath, onProgress).then(resolvePromise).catch(rejectPromise)
        return
      }
      if (res.statusCode !== 200) {
        file.close()
        fs.unlink(destPath, () => {})
        rejectPromise(new Error(`Server returned status code ${res.statusCode} for package download.`))
        return
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10)
      let receivedBytes = 0

      res.on('data', (chunk) => {
        receivedBytes += chunk.length
        onProgress(receivedBytes, totalBytes)
      })

      res.pipe(file)

      file.on('finish', () => {
        file.close()
        resolvePromise()
      })
    }).on('error', (err) => {
      file.close()
      fs.unlink(destPath, () => {})
      rejectPromise(err)
    })
  })
}

function calculateFileSha256(filePath: string): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (data) => hash.update(data))
    stream.on('end', () => resolvePromise(hash.digest('hex')))
    stream.on('error', (err) => rejectPromise(err))
  })
}

function extractZipSecure(zipPath: string, destDir: string): void {
  const zip = new AdmZip(zipPath)
  const entries = zip.getEntries()

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }

  const resolvedDestDir = resolve(destDir)

  for (const entry of entries) {
    if (entry.isDirectory) continue

    // Security: path traversal check
    const targetPath = join(resolvedDestDir, entry.entryName)
    const resolvedTargetPath = resolve(targetPath)

    const relativePath = relative(resolvedDestDir, resolvedTargetPath)
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new Error(`Security Exception: Path traversal detected in zip entry: ${entry.entryName}`)
    }

    const targetDir = dirname(resolvedTargetPath)
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    const content = entry.getData()
    fs.writeFileSync(resolvedTargetPath, content)
  }
}

// Ensure path module is available/imported if not already. Wait, let's verify if 'path' is imported at the top of the file:
// line 2 has: import { join, resolve, dirname } from 'path'
// We also need 'path' as default or import * as path from 'path' for path.relative and path.isAbsolute.
// Let's use relative and resolve directly as they are already imported, or just import path or use native functions.
// Wait, 'resolve' and 'dirname' and 'join' are imported from 'path'. Let's import path default or add:
// const path = { relative: require('path').relative, isAbsolute: require('path').isAbsolute }
// But since this is ES modules, we can just use import * as path from 'path' or check how imports look:
// line 2: import { join, resolve, dirname } from 'path'
// Let's see: we can import 'relative' and 'isAbsolute' from 'path' or modify line 2!
// Wait! Let's check imports in updateManager.ts first.
// Line 2: import { join, resolve, dirname } from 'path'
// So we can import 'relative' and 'isAbsolute' from 'path' as well!
// Let's modify the code to use imported 'relative' and 'isAbsolute' or import 'path' dynamically/fully.
// Let's check if path is fully imported: no, it's destructuring join, resolve, dirname.
// So we can just use join, resolve, dirname. Let's add relative and isAbsolute to the import, or import * as path from 'path'.
// Let's see: import { join, resolve, dirname, relative, isAbsolute } from 'path' is perfect! Let's verify line 2.
// Yes, we will modify line 2 as well, but wait! We can do it inside this replacement or edit line 2.
// Actually, let's just use:
// import * as path from 'path' at the top of the file, or add relative and isAbsolute to destructuring.
// Let's check what is cleaner. Let's just use `path.relative` by importing it. We will use path.relative / path.isAbsolute. To do that, we can change the import.
// Let's look at the top imports:
// line 2: import { join, resolve, dirname } from 'path'
// We can change it to:
// import * as path from 'path'
// And then use path.join, path.resolve, path.dirname, path.relative, path.isAbsolute, or just keep destructuring and add relative, isAbsolute.
// Let's keep destructuring and add: import { join, resolve, dirname, relative, isAbsolute } from 'path'.
// Then we use 'relative' and 'isAbsolute' directly!

function extractZipSecureDirect(zipPath: string, destDir: string): void {
  const zip = new AdmZip(zipPath)
  const entries = zip.getEntries()

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }

  const resolvedDestDir = resolve(destDir)

  for (const entry of entries) {
    if (entry.isDirectory) continue

    const targetPath = join(resolvedDestDir, entry.entryName)
    const resolvedTargetPath = resolve(targetPath)

    // Security: path traversal check using imported relative and isAbsolute
    const rel = relative(resolvedDestDir, resolvedTargetPath)
    if (rel.startsWith('..') || isAbsolute(rel)) {
      throw new Error(`Security Exception: Path traversal detected in zip entry: ${entry.entryName}`)
    }

    const targetDir = dirname(resolvedTargetPath)
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    const content = entry.getData()
    fs.writeFileSync(resolvedTargetPath, content)
  }
}

export function setupUpdateManager() {
  // Clean up old files on startup
  cleanupOldFiles()

  ipcMain.handle('updater-get-status', () => ({
    state,
    progress,
    error,
    updateInfo,
    currentVersion: app.getVersion()
  }))

  ipcMain.handle('updater-check', async () => {
    state = 'checking'
    progress = 0
    error = null
    broadcastStatus()

    try {
      const parsedManifestUrl = new URL(UPDATE_MANIFEST_URL)
      if (parsedManifestUrl.hostname !== 'github.com' && !parsedManifestUrl.hostname.endsWith('.github.com')) {
        throw new Error('Security Error: Update manifest URL must be from github.com')
      }

      const res = await fetchJson(UPDATE_MANIFEST_URL)

      if (!validateManifest(res)) {
        throw new Error('Security Error: Invalid manifest file received from update server.')
      }

      const expectedPrefix = getExpectedReleasePrefix(UPDATE_MANIFEST_URL)
      if (!expectedPrefix || !res.packageUrl.startsWith(expectedPrefix)) {
        throw new Error('Security Error: Unauthorized update package URL source.')
      }
      
      const currentVersion = app.getVersion()
      
      if (res && res.version && compareVersions(currentVersion, res.version) < 0) {
        state = 'update_available'
        updateInfo = res
      } else {
        state = 'latest'
        updateInfo = res || null
      }
    } catch (e: any) {
      state = 'error'
      error = e.message || 'Failed to check for updates'
    }

    broadcastStatus()
    return { state, error, updateInfo, currentVersion: app.getVersion() }
  })

  ipcMain.handle('updater-download', async () => {
    if (state !== 'update_available' || !updateInfo || !updateInfo.packageUrl) {
      state = 'error'
      error = 'No update available to download.'
      broadcastStatus()
      return
    }

    state = 'downloading'
    progress = 0
    error = null
    broadcastStatus()

    try {
      const packageUrl = updateInfo.packageUrl
      
      if (!validateManifest(updateInfo)) {
        throw new Error('Security Error: Manifest is invalid.')
      }

      const expectedPrefix = getExpectedReleasePrefix(UPDATE_MANIFEST_URL)
      if (!expectedPrefix || !packageUrl.startsWith(expectedPrefix)) {
        throw new Error('Security Error: Unauthorized update package URL source.')
      }

      const updatesDir = join(app.getPath('userData'), 'updates')
      if (!fs.existsSync(updatesDir)) {
        fs.mkdirSync(updatesDir, { recursive: true })
      }

      const tempZipPath = join(updatesDir, 'update.zip')
      
      await downloadFile(packageUrl, tempZipPath, (received, total) => {
        if (total > 0) {
          progress = Math.round((received / total) * 100)
          broadcastStatus()
        }
      })

      if (updateInfo.sha256) {
        const calculatedSha = await calculateFileSha256(tempZipPath)
        if (calculatedSha.toLowerCase() !== updateInfo.sha256.toLowerCase()) {
          fs.unlinkSync(tempZipPath)
          throw new Error(`Security Error: SHA256 checksum mismatch (calculated: ${calculatedSha}, expected: ${updateInfo.sha256}).`)
        }
      } else {
        fs.unlinkSync(tempZipPath)
        throw new Error('Security Error: Manifest is missing sha256 checksum.')
      }

      const stagingDir = join(updatesDir, 'staging')
      
      if (fs.existsSync(stagingDir)) {
        fs.rmSync(stagingDir, { recursive: true, force: true })
      }
      
      extractZipSecureDirect(tempZipPath, stagingDir)
      fs.unlinkSync(tempZipPath)

      const appDir = dirname(process.execPath)
      const pendingUpdatePath = join(updatesDir, 'pending-update.json')
      
      const manifest = {
        mainPid: process.pid,
        stagingDir: stagingDir,
        appDir: appDir,
        execPath: process.execPath
      }

      fs.writeFileSync(pendingUpdatePath, JSON.stringify(manifest, null, 2))
      
      state = 'downloaded'
      progress = 100
    } catch (e: any) {
      state = 'error'
      error = e.message || 'Failed to download update'
    }

    broadcastStatus()
  })

  ipcMain.handle('updater-apply', async () => {
    if (state !== 'downloaded') {
      state = 'error'
      error = 'No downloaded update available to apply.'
      broadcastStatus()
      return
    }

    state = 'applying'
    broadcastStatus()

    try {
      const updatesDir = join(app.getPath('userData'), 'updates')
      const pendingUpdatePath = join(updatesDir, 'pending-update.json')
      
      const helperSource = join(dirname(fileURLToPath(import.meta.url)), 'updaterHelper.js')
      const helperDest = join(updatesDir, 'updaterHelper.js')
      
      if (fs.existsSync(helperSource)) {
        fs.copyFileSync(helperSource, helperDest)
      } else {
        throw new Error(`Updater helper source not found at ${helperSource}`)
      }

      const child = spawn(process.execPath, [helperDest, pendingUpdatePath], {
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1'
        }
      })

      child.unref()
      app.quit()
    } catch (e: any) {
      state = 'error'
      error = e.message || 'Failed to start updater helper'
      broadcastStatus()
    }
  })
}
