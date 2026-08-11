import fs from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import serverModule from '../src/server.cjs'

const {
  APP_ID,
  HEALTH_PATH,
  LOOPBACK_HOST,
  closeServer,
  createStaticServer,
  resolveInsideRoot,
  startOrReuseServer,
} = serverModule

const VERSION = '1.7.0'

let rootDir
let openServers

beforeEach(async () => {
  rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'markdown-docx-server-'))
  openServers = []

  await fs.mkdir(path.join(rootDir, 'assets'))
  await fs.writeFile(path.join(rootDir, 'index.html'), '<!doctype html><title>MD to DOCX</title>')
  await fs.writeFile(path.join(rootDir, 'assets', 'app.js'), 'globalThis.markdownDocx = true')
  await fs.writeFile(path.join(rootDir, 'icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')
})

afterEach(async () => {
  await Promise.all(openServers.map(closeServer))
  await fs.rm(rootDir, { force: true, recursive: true })
})

async function listen(server, port = 0) {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, LOOPBACK_HOST, resolve)
  })
  openServers.push(server)
  return server.address().port
}

async function findFreePort() {
  const server = http.createServer()
  const port = await listen(server)
  await closeServer(server)
  openServers = openServers.filter((item) => item !== server)
  return port
}

function rawRequest(port, requestPath, method = 'GET') {
  return new Promise((resolve, reject) => {
    const request = http.request(
      { host: LOOPBACK_HOST, method, path: requestPath, port },
      (response) => {
        const chunks = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => {
          resolve({
            body: Buffer.concat(chunks).toString('utf8'),
            headers: response.headers,
            status: response.statusCode,
          })
        })
      },
    )
    request.on('error', reject)
    request.end()
  })
}

describe('secure static server', () => {
  it('serves the SPA with security headers and supports HEAD', async () => {
    const server = createStaticServer({ rootDir, version: VERSION })
    const port = await listen(server)

    const indexResponse = await fetch(`http://${LOOPBACK_HOST}:${port}/`)
    expect(indexResponse.status).toBe(200)
    expect(await indexResponse.text()).toContain('MD to DOCX')
    expect(indexResponse.headers.get('content-security-policy')).toContain("default-src 'self'")
    expect(indexResponse.headers.get('x-content-type-options')).toBe('nosniff')
    expect(indexResponse.headers.get('x-frame-options')).toBe('DENY')
    expect(indexResponse.headers.get('cache-control')).toBe('no-cache')

    const headResponse = await fetch(`http://${LOOPBACK_HOST}:${port}/assets/app.js`, {
      method: 'HEAD',
    })
    expect(headResponse.status).toBe(200)
    expect(headResponse.headers.get('content-type')).toContain('text/javascript')
    expect(headResponse.headers.get('cache-control')).toContain('immutable')
    expect(await headResponse.text()).toBe('')
  })

  it('serves known assets, uses the SPA fallback, and does not expose missing files', async () => {
    const server = createStaticServer({ rootDir, version: VERSION })
    const port = await listen(server)

    const svgResponse = await fetch(`http://${LOOPBACK_HOST}:${port}/icon.svg`)
    expect(svgResponse.status).toBe(200)
    expect(svgResponse.headers.get('content-type')).toContain('image/svg+xml')

    const routeResponse = await fetch(`http://${LOOPBACK_HOST}:${port}/settings/themes`)
    expect(routeResponse.status).toBe(200)
    expect(await routeResponse.text()).toContain('MD to DOCX')

    const missingAsset = await fetch(`http://${LOOPBACK_HOST}:${port}/missing.js`)
    expect(missingAsset.status).toBe(404)
  })

  it('reports health and rejects unsupported methods', async () => {
    const server = createStaticServer({ rootDir, version: VERSION })
    const port = await listen(server)

    const healthResponse = await fetch(`http://${LOOPBACK_HOST}:${port}${HEALTH_PATH}`)
    expect(await healthResponse.json()).toEqual({ appId: APP_ID, version: VERSION })
    expect(healthResponse.headers.get('cache-control')).toBe('no-store')

    const postResponse = await fetch(`http://${LOOPBACK_HOST}:${port}/`, { method: 'POST' })
    expect(postResponse.status).toBe(405)
    expect(postResponse.headers.get('allow')).toBe('GET, HEAD')
  })

  it('blocks malformed and traversal paths', async () => {
    const server = createStaticServer({ rootDir, version: VERSION })
    const port = await listen(server)

    expect(resolveInsideRoot(rootDir, '/%2e%2e%5csecret.txt')).toBeNull()

    const rawTraversal = await rawRequest(port, '/../secret.txt')
    expect(rawTraversal.status).toBe(400)

    const traversal = await rawRequest(port, '/%2e%2e%5csecret.txt')
    expect(traversal.status).toBe(400)
    expect(traversal.body).not.toContain('secret')

    const malformed = await rawRequest(port, '/%E0%A4%A')
    expect(malformed.status).toBe(400)
  })
})

describe('port selection', () => {
  it('reuses a matching MD to DOCX server', async () => {
    const existing = createStaticServer({ rootDir, version: VERSION })
    const port = await listen(existing)

    const result = await startOrReuseServer({ rootDir, version: VERSION, ports: [port] })

    expect(result.reused).toBe(true)
    expect(result.server).toBeNull()
    expect(result.url).toBe(`http://${LOOPBACK_HOST}:${port}/`)
  })

  it('skips an unrelated occupied port and listens only on loopback', async () => {
    const foreignServer = http.createServer((_request, response) => {
      response.statusCode = 404
      response.end('other app')
    })
    const foreignPort = await listen(foreignServer)
    const availablePort = await findFreePort()

    const result = await startOrReuseServer({
      rootDir,
      version: VERSION,
      ports: [foreignPort, availablePort],
    })
    openServers.push(result.server)

    expect(result.reused).toBe(false)
    expect(result.port).toBe(availablePort)
    expect(result.server.address().address).toBe(LOOPBACK_HOST)
  })

  it('fails clearly when every configured port is occupied', async () => {
    const first = http.createServer((_request, response) => response.end('first'))
    const second = http.createServer((_request, response) => response.end('second'))
    const firstPort = await listen(first)
    const secondPort = await listen(second)

    await expect(
      startOrReuseServer({ rootDir, version: VERSION, ports: [firstPort, secondPort] }),
    ).rejects.toMatchObject({ code: 'NO_AVAILABLE_PORTS' })
  })
})
