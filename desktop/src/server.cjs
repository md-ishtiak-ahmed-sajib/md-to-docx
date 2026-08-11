const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')

const APP_ID = 'Sajib-Civil-Engineer-BD.md-to-docx'
const LOOPBACK_HOST = '127.0.0.1'
const HEALTH_PATH = '/.well-known/markdown-docx-health'
const DEFAULT_PORTS = Object.freeze(Array.from({ length: 10 }, (_, index) => 48173 + index))

const MIME_TYPES = Object.freeze({
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
})

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'none'",
  "connect-src 'self' http: https:",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: http: https:",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
].join('; ')

class NoAvailablePortError extends Error {
  constructor(ports) {
    super(`MD to DOCX could not start because ports ${ports.join(', ')} are unavailable.`)
    this.name = 'NoAvailablePortError'
    this.code = 'NO_AVAILABLE_PORTS'
    this.ports = [...ports]
  }
}

function applySecurityHeaders(response) {
  response.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY)
  response.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()')
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
}

function sendStatus(response, statusCode, message, method = 'GET') {
  const body = Buffer.from(message, 'utf8')
  response.statusCode = statusCode
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', 'text/plain; charset=utf-8')
  response.setHeader('Content-Length', body.length)
  response.end(method === 'HEAD' ? undefined : body)
}

function resolveInsideRoot(rootDir, pathname) {
  let decodedPath

  try {
    decodedPath = decodeURIComponent(pathname)
  } catch {
    return null
  }

  if (decodedPath.includes('\0')) return null

  const portablePath = decodedPath.replaceAll('\\', '/')
  const segments = portablePath.split('/')

  if (segments.some((segment) => segment === '..')) return null

  const relativePath = portablePath.replace(/^\/+/, '')
  const resolvedRoot = path.resolve(rootDir)
  const resolvedPath = path.resolve(resolvedRoot, relativePath || 'index.html')

  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    return null
  }

  return resolvedPath
}

async function statFile(filePath) {
  try {
    return await fs.promises.stat(filePath)
  } catch (error) {
    if (error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) return null
    throw error
  }
}

async function selectStaticFile(rootDir, pathname) {
  const candidate = resolveInsideRoot(rootDir, pathname)
  if (!candidate) return { kind: 'invalid' }

  const candidateStat = await statFile(candidate)

  if (candidateStat?.isFile()) return { kind: 'file', filePath: candidate, stat: candidateStat }

  if (candidateStat?.isDirectory()) {
    const indexPath = path.join(candidate, 'index.html')
    const indexStat = await statFile(indexPath)
    if (indexStat?.isFile()) return { kind: 'file', filePath: indexPath, stat: indexStat }
  }

  if (path.extname(pathname) === '') {
    const fallbackPath = path.join(path.resolve(rootDir), 'index.html')
    const fallbackStat = await statFile(fallbackPath)
    if (fallbackStat?.isFile()) return { kind: 'file', filePath: fallbackPath, stat: fallbackStat }
  }

  return { kind: 'missing' }
}

function cacheControlFor(filePath) {
  if (path.basename(filePath) === 'index.html') return 'no-cache'
  if (filePath.split(path.sep).includes('assets')) return 'public, max-age=31536000, immutable'
  return 'public, max-age=3600'
}

function requestPathname(requestUrl) {
  const queryIndex = requestUrl.indexOf('?')
  const pathname = queryIndex === -1 ? requestUrl : requestUrl.slice(0, queryIndex)

  return pathname.startsWith('/') ? pathname : null
}

function createStaticServer({ rootDir, appId = APP_ID, version }) {
  if (!rootDir) throw new TypeError('rootDir is required')
  if (!version) throw new TypeError('version is required')

  const resolvedRoot = path.resolve(rootDir)

  return http.createServer(async (request, response) => {
    applySecurityHeaders(response)

    try {
      const method = request.method || 'GET'
      const pathname = requestPathname(request.url || '/')

      if (!pathname) {
        sendStatus(response, 400, 'Bad Request', method)
        return
      }

      if (pathname === HEALTH_PATH) {
        if (method !== 'GET' && method !== 'HEAD') {
          response.setHeader('Allow', 'GET, HEAD')
          sendStatus(response, 405, 'Method Not Allowed', method)
          return
        }

        const body = Buffer.from(JSON.stringify({ appId, version }), 'utf8')
        response.statusCode = 200
        response.setHeader('Cache-Control', 'no-store')
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.setHeader('Content-Length', body.length)
        response.end(method === 'HEAD' ? undefined : body)
        return
      }

      if (method !== 'GET' && method !== 'HEAD') {
        response.setHeader('Allow', 'GET, HEAD')
        sendStatus(response, 405, 'Method Not Allowed', method)
        return
      }

      const selected = await selectStaticFile(resolvedRoot, pathname)

      if (selected.kind === 'invalid') {
        sendStatus(response, 400, 'Bad Request', method)
        return
      }

      if (selected.kind !== 'file') {
        sendStatus(response, 404, 'Not Found', method)
        return
      }

      response.statusCode = 200
      response.setHeader('Cache-Control', cacheControlFor(selected.filePath))
      response.setHeader('Content-Length', selected.stat.size)
      response.setHeader(
        'Content-Type',
        MIME_TYPES[path.extname(selected.filePath).toLowerCase()] || 'application/octet-stream',
      )

      if (method === 'HEAD') {
        response.end()
        return
      }

      const stream = fs.createReadStream(selected.filePath)
      stream.on('error', () => {
        if (!response.headersSent) sendStatus(response, 500, 'Internal Server Error', method)
        else response.destroy()
      })
      stream.pipe(response)
    } catch {
      if (!response.headersSent) sendStatus(response, 500, 'Internal Server Error', request.method)
      else response.destroy()
    }
  })
}

function listen(server, host, port) {
  return new Promise((resolve, reject) => {
    const handleError = (error) => {
      server.off('listening', handleListening)
      reject(error)
    }
    const handleListening = () => {
      server.off('error', handleError)
      resolve()
    }

    server.once('error', handleError)
    server.once('listening', handleListening)
    server.listen(port, host)
  })
}

function probeHealth({ host, port, timeoutMs = 350 }) {
  return new Promise((resolve) => {
    const request = http.get(
      {
        agent: false,
        host,
        path: HEALTH_PATH,
        port,
        timeout: timeoutMs,
      },
      (response) => {
        const chunks = []

        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => {
          if (response.statusCode !== 200) {
            resolve(null)
            return
          }

          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
          } catch {
            resolve(null)
          }
        })
      },
    )

    request.on('timeout', () => request.destroy())
    request.on('error', () => resolve(null))
  })
}

async function startOrReuseServer({
  rootDir,
  version,
  appId = APP_ID,
  host = LOOPBACK_HOST,
  ports = DEFAULT_PORTS,
}) {
  for (const port of ports) {
    const existingHealth = await probeHealth({ host, port })

    if (existingHealth?.appId === appId && existingHealth?.version === version) {
      return { host, port, reused: true, server: null, url: `http://${host}:${port}/` }
    }

    const server = createStaticServer({ rootDir, appId, version })

    try {
      await listen(server, host, port)
      return { host, port, reused: false, server, url: `http://${host}:${port}/` }
    } catch (error) {
      server.close()
      if (error?.code !== 'EADDRINUSE' && error?.code !== 'EACCES') throw error
    }
  }

  throw new NoAvailablePortError(ports)
}

function closeServer(server) {
  if (!server?.listening) return Promise.resolve()
  return new Promise((resolve) => server.close(resolve))
}

module.exports = {
  APP_ID,
  CONTENT_SECURITY_POLICY,
  DEFAULT_PORTS,
  HEALTH_PATH,
  LOOPBACK_HOST,
  MIME_TYPES,
  NoAvailablePortError,
  closeServer,
  createStaticServer,
  probeHealth,
  resolveInsideRoot,
  startOrReuseServer,
}
