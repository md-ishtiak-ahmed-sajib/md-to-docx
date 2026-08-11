const fs = require('node:fs')
const path = require('node:path')
const { app, BrowserWindow, dialog, session, shell } = require('electron')
const { APP_ID, DEFAULT_PORTS, LOOPBACK_HOST, closeServer, startOrReuseServer } = require('./server.cjs')
const {
  isApprovedExternalUrl,
  isTrustedApplicationUrl,
  openApprovedExternalUrl,
} = require('./window-policy.cjs')

const APP_USER_MODEL_ID = 'Sajib-Civil-Engineer-BD.md-to-docx.MDToDOCX'

let activeServer = null
let activeUrl = null
let mainWindow = null
let quitting = false

app.setAppUserModelId(APP_USER_MODEL_ID)

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => showMainWindow())

  app.on('before-quit', () => {
    quitting = true
    void closeServer(activeServer)
  })

  app.on('window-all-closed', () => app.quit())

  app.on('activate', () => {
    if (mainWindow && !mainWindow.isDestroyed()) showMainWindow()
    else if (activeUrl) void createMainWindow(activeUrl)
  })

  void app.whenReady().then(startLauncher).catch(showStartupError)
}

function webRoot() {
  if (app.isPackaged) return path.join(process.resourcesPath, 'web')
  return path.resolve(__dirname, '../../web/dist')
}

function applicationIcon() {
  if (app.isPackaged) return process.execPath
  return path.resolve(__dirname, '../../web/public/icon.svg')
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed() || quitting) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function denyUnusedPermissions() {
  const appSession = session.defaultSession
  appSession.setPermissionCheckHandler(() => false)
  appSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
}

async function createMainWindow(url) {
  const trustedOrigin = new URL(url).origin

  const window = new BrowserWindow({
    backgroundColor: '#f8fafc',
    center: true,
    height: 900,
    icon: applicationIcon(),
    minHeight: 640,
    minWidth: 960,
    show: false,
    title: `MD to DOCX ${app.getVersion()}`,
    width: 1440,
    webPreferences: {
      allowRunningInsecureContent: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })

  mainWindow = window
  window.removeMenu()

  window.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (isApprovedExternalUrl(targetUrl)) void openApprovedExternalUrl(shell, targetUrl)
    return { action: 'deny' }
  })

  window.webContents.on('will-attach-webview', (event) => event.preventDefault())
  window.webContents.on('will-navigate', (event, targetUrl) => {
    if (!isTrustedApplicationUrl(targetUrl, trustedOrigin)) event.preventDefault()
  })

  window.webContents.on('render-process-gone', (_event, details) => {
    if (quitting || details.reason === 'clean-exit') return
    dialog.showErrorBox(
      'MD to DOCX stopped responding',
      'The application renderer stopped unexpectedly. Close and reopen MD to DOCX to continue.',
    )
  })

  window.once('ready-to-show', () => showMainWindow())
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })

  await window.loadURL(url)
  return window
}

async function startLauncher() {
  const rootDir = webRoot()
  const indexPath = path.join(rootDir, 'index.html')

  if (!fs.existsSync(indexPath)) {
    throw new Error(`The packaged web application is missing: ${indexPath}`)
  }

  denyUnusedPermissions()

  const result = await startOrReuseServer({
    appId: APP_ID,
    host: LOOPBACK_HOST,
    ports: DEFAULT_PORTS,
    rootDir,
    version: app.getVersion(),
  })

  activeServer = result.server
  activeUrl = result.url
  await createMainWindow(activeUrl)
}

function showStartupError(error) {
  const detail = error instanceof Error ? error.message : String(error)

  dialog.showErrorBox(
    'MD to DOCX could not start',
    `${detail}\n\nClose any existing MD to DOCX process or restart Windows, then try again.`,
  )
  app.quit()
}
