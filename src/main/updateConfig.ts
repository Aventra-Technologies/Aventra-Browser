import * as fs from 'fs'
import { join, dirname } from 'path'
import { app } from 'electron'

function getEnv(key: string, defaultValue: string): string {
  if (process.env[key]) {
    return process.env[key]!
  }

  try {
    const envPaths = [
      join(process.cwd(), '.env'),
      join(app.getAppPath(), '.env'),
      join(dirname(process.execPath), '.env')
    ]
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf8').split('\n')
        for (const line of lines) {
          const match = line.trim().match(/^([^=]+)=(.*)$/)
          if (match && match[1].trim() === key) {
            return match[2].trim().replace(/^['"]|['"]$/g, '')
          }
        }
      }
    }
  } catch (e) {}

  return defaultValue
}

export const UPDATE_MANIFEST_URL = getEnv(
  'UPDATE_MANIFEST_URL',
  'https://github.com/Straniksss/bamboo-browser/releases/latest/download/latest.json'
)
