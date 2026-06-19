import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import crypto from 'crypto'
import https from 'https'
import AdmZip from 'adm-zip'

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8')
    content.split('\n').forEach(line => {
      const match = line.trim().match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim().replace(/^['"]|['"]$/g, '')
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
    })
  }
}
loadEnv()

let versionArg = null
let semverType = null

const args = process.argv.slice(2)
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--version' || args[i] === '-v') {
    versionArg = args[i + 1]
    i++
  } else if (args[i] === '--patch') {
    semverType = 'patch'
  } else if (args[i] === '--minor') {
    semverType = 'minor'
  } else if (args[i] === '--major') {
    semverType = 'major'
  }
}

const pkgPath = path.join(process.cwd(), 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const currentVersion = pkg.version

let nextVersion = versionArg
if (!nextVersion) {
  const parts = currentVersion.split('.').map(x => parseInt(x, 10) || 0)
  if (semverType === 'major') {
    parts[0]++
    parts[1] = 0
    parts[2] = 0
  } else if (semverType === 'minor') {
    parts[1]++
    parts[2] = 0
  } else {
    parts[2]++
  }
  nextVersion = parts.join('.')
}

console.log(`Bumping version: ${currentVersion} -> ${nextVersion}`)

function githubRequest(method, urlPath, body, contentType = 'application/json') {
  return new Promise((resolvePromise, rejectPromise) => {
    const token = process.env.GITHUB_TOKEN
    const owner = process.env.GITHUB_OWNER
    const repo = process.env.GITHUB_REPO

    if (!token || !owner || !repo) {
      rejectPromise(new Error('GITHUB_TOKEN, GITHUB_OWNER, or GITHUB_REPO is missing from env.'))
      return
    }

    let url
    if (urlPath.startsWith('http')) {
      url = new URL(urlPath)
    } else {
      url = new URL(`https://api.github.com${urlPath}`)
    }

    const headers = {
      'Authorization': `token ${token}`,
      'User-Agent': 'BambooBrowser-Release-Script',
      'Accept': 'application/vnd.github+json'
    }

    if (body) {
      headers['Content-Type'] = contentType
      headers['Content-Length'] = Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body)
    }

    const options = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers
    }

    const req = https.request(options, (res) => {
      let data = []
      res.on('data', (chunk) => data.push(chunk))
      res.on('end', () => {
        const buffer = Buffer.concat(data)
        const text = buffer.toString('utf8')
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolvePromise(JSON.parse(text))
          } catch (e) {
            resolvePromise(text)
          }
        } else {
          rejectPromise(new Error(`GitHub API returned ${res.statusCode}: ${text}`))
        }
      })
    })

    req.on('error', rejectPromise)
    if (body) {
      req.write(body)
    }
    req.end()
  })
}

async function run() {
  const token = process.env.GITHUB_TOKEN
  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  const branch = process.env.GITHUB_RELEASE_BRANCH || 'main'

  if (!token) {
    console.error('Error: GITHUB_TOKEN is missing from environment/env. Cannot perform release.')
    process.exit(1)
  }
  if (!owner || !repo) {
    console.error('Error: GITHUB_OWNER or GITHUB_REPO is missing from environment/env.')
    process.exit(1)
  }

  console.log('Updating package.json version...')
  pkg.version = nextVersion
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')

  console.log('Checking package-lock.json...')
  const lockPath = path.join(process.cwd(), 'package-lock.json')
  let lockfileNeedsUpdate = false
  if (fs.existsSync(lockPath)) {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'))
    if (lock.version !== nextVersion || (lock.packages && lock.packages[''] && lock.packages[''].version !== nextVersion)) {
      console.log('Updating package-lock.json version...')
      lock.version = nextVersion
      if (lock.packages && lock.packages['']) {
        lock.packages[''].version = nextVersion
      }
      fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8')
      lockfileNeedsUpdate = true
    }
  }

  if (lockfileNeedsUpdate) {
    console.log('Running npm install to ensure lockfile is fully updated...')
    execSync('npm install', { stdio: 'inherit' })
  }

  console.log('Running build...')
  execSync('npm run build', { stdio: 'inherit' })

  const unpackedDir = path.join(process.cwd(), 'dist', 'win-unpacked')
  if (!fs.existsSync(unpackedDir)) {
    console.error(`Error: Unpacked app folder not found at ${unpackedDir}`)
    process.exit(1)
  }

  const zipName = `BambooBrowser-${nextVersion}-win-x64.zip`
  console.log(`Packaging portable zip: ${zipName}...`)
  const zip = new AdmZip()
  zip.addLocalFolder(unpackedDir, '')

  const updateJson = JSON.stringify({
    version: nextVersion,
    platform: 'windows',
    arch: 'x64',
    createdAt: new Date().toISOString()
  }, null, 2)
  zip.addFile('update.json', Buffer.from(updateJson, 'utf8'))

  zip.writeZip(zipName)
  console.log('Zip file created successfully.')

  const zipBuffer = fs.readFileSync(zipName)
  const sha256 = crypto.createHash('sha256').update(zipBuffer).digest('hex')
  const size = zipBuffer.length

  console.log('Writing latest.json...')
  const manifest = {
    version: nextVersion,
    required: false,
    platform: 'windows',
    arch: 'x64',
    packageName: zipName,
    packageUrl: `https://github.com/${owner}/${repo}/releases/download/v${nextVersion}/${zipName}`,
    sha256: sha256,
    size: size,
    releaseNotes: [
      "Fixed tabs",
      "Improved sync",
      "Updated UI"
    ],
    publishedAt: new Date().toISOString()
  }
  fs.writeFileSync('latest.json', JSON.stringify(manifest, null, 2), 'utf8')

  console.log('Pushing to Git repository...')
  try {
    execSync('git add package.json', { stdio: 'inherit' })
    if (fs.existsSync(lockPath)) {
      execSync('git add package-lock.json', { stdio: 'inherit' })
    }
    execSync(`git commit -m "Release Bamboo Browser v${nextVersion}"`, { stdio: 'inherit' })
    execSync(`git tag v${nextVersion}`, { stdio: 'inherit' })
    execSync(`git push origin ${branch}`, { stdio: 'inherit' })
    execSync(`git push origin v${nextVersion}`, { stdio: 'inherit' })
  } catch (err) {
    console.warn('Warning: Git push failed, proceeding with release creation...', err.message)
  }

  console.log('Creating GitHub Release...')
  const releaseData = await githubRequest('POST', `/repos/${owner}/${repo}/releases`, JSON.stringify({
    tag_name: `v${nextVersion}`,
    target_commitish: branch,
    name: `v${nextVersion}`,
    body: `Bamboo Browser v${nextVersion} Release`,
    draft: false,
    prerelease: false
  }))

  console.log(`Release created successfully (ID: ${releaseData.id}).`)

  console.log('Uploading latest.json...')
  const uploadBaseUrl = releaseData.upload_url.replace(/\{.*?\}$/, '')
  
  const latestBuffer = fs.readFileSync('latest.json')
  await githubRequest(
    'POST', 
    `${uploadBaseUrl}?name=latest.json`, 
    latestBuffer, 
    'application/octet-stream'
  )
  console.log('latest.json uploaded successfully.')

  console.log(`Uploading ${zipName}...`)
  await githubRequest(
    'POST', 
    `${uploadBaseUrl}?name=${encodeURIComponent(zipName)}`, 
    zipBuffer, 
    'application/octet-stream'
  )
  console.log(`${zipName} uploaded successfully.`)

  console.log('Release process completed successfully.')
}

run().catch(err => {
  console.error('Release failed:', err)
  process.exit(1)
})
