import * as fs from 'fs'
import { join, dirname, resolve } from 'path'
import { spawn } from 'child_process'

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function waitProcessExit(pid: number) {
  while (true) {
    try {
      process.kill(pid, 0)
    } catch (e) {
      break
    }
    await sleep(250)
  }
}

function copyFileSyncSafe(src: string, dest: string) {
  try {
    fs.copyFileSync(src, dest)
  } catch (err: any) {
    if (err.code === 'EPERM' || err.code === 'EBUSY') {
      const oldDest = dest + '.old'
      if (fs.existsSync(oldDest)) {
        try {
          fs.unlinkSync(oldDest)
        } catch (e) {}
      }
      try {
        fs.renameSync(dest, oldDest)
        fs.copyFileSync(src, dest)
        return
      } catch (renameErr: any) {
        throw new Error(`Failed to copy file after rename attempt: ${dest}. Error: ${renameErr.message}`)
      }
    }
    throw err
  }
}

function copyDirSync(src: string, dest: string) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      copyFileSyncSafe(srcPath, destPath)
    }
  }
}

async function main() {
  const pendingUpdatePath = process.argv[2]
  if (!pendingUpdatePath || !fs.existsSync(pendingUpdatePath)) {
    process.exit(1)
  }

  const updatesDir = dirname(pendingUpdatePath)
  const logFile = join(updatesDir, 'update.log')
  
  function log(msg: string) {
    const line = `[${new Date().toISOString()}] ${msg}\n`
    fs.appendFileSync(logFile, line)
  }

  log('Updater Helper process started.')

  let manifest: any
  try {
    manifest = JSON.parse(fs.readFileSync(pendingUpdatePath, 'utf8'))
  } catch (err: any) {
    log(`Failed to read pending update manifest: ${err.message}`)
    process.exit(1)
  }

  const { mainPid, stagingDir, appDir, execPath } = manifest

  log(`Waiting for browser process (PID: ${mainPid}) to terminate...`)
  await waitProcessExit(mainPid)
  
  // Wait an extra 1000ms for OS file handles to be fully released on Windows
  await sleep(1000)
  log('Browser process exited. Proceeding with file replacement.')

  const backupDir = appDir + '_backup'
  let backupCreated = false

  try {
    // 1. Create Backup
    log(`Creating backup of current app directory to: ${backupDir}`)
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true })
    }
    copyDirSync(appDir, backupDir)
    backupCreated = true
    log('Backup created successfully.')

    // 2. Determine Source Directory (Staged App files)
    const sourceDir = fs.existsSync(join(stagingDir, 'app')) ? join(stagingDir, 'app') : stagingDir
    log(`Applying update files from: ${sourceDir} over: ${appDir}`)

    // 3. Overwrite App files
    copyDirSync(sourceDir, appDir)
    log('App files overwritten successfully.')

    // 4. Cleanup backup and manifest
    try {
      fs.rmSync(backupDir, { recursive: true, force: true })
      log('Temporary backup directory cleaned up.')
    } catch (cleanupErr: any) {
      log(`Warning: Failed to clean backup directory: ${cleanupErr.message}`)
    }

    try {
      fs.unlinkSync(pendingUpdatePath)
      // Clean staging folder
      fs.rmSync(stagingDir, { recursive: true, force: true })
    } catch (e) {}

    log('Update applied successfully. Launching updated Bamboo Browser.')
    
    // 5. Launch new browser
    const child = spawn(execPath, [], {
      detached: true,
      stdio: 'ignore'
    })
    child.unref()

  } catch (err: any) {
    log(`ERROR encountered during file replacement: ${err.message}`)
    
    if (backupCreated) {
      log('Attempting rollback to restore backup...')
      try {
        // Simple rollback: copy backup back
        copyDirSync(backupDir, appDir)
        log('Rollback successful. Restored app files.')
        
        try {
          fs.rmSync(backupDir, { recursive: true, force: true })
        } catch (e) {}
      } catch (rollbackErr: any) {
        log(`CRITICAL: Rollback failed: ${rollbackErr.message}`)
      }
    }

    log('Launching old Bamboo Browser.')
    try {
      const child = spawn(execPath, [], {
        detached: true,
        stdio: 'ignore'
      })
      child.unref()
    } catch (launchErr: any) {
      log(`CRITICAL: Failed to launch old browser: ${launchErr.message}`)
    }
    
    process.exit(1)
  }

  log('Updater Helper process exiting successfully.')
  process.exit(0)
}

main()
