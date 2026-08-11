const APPROVED_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

function parseUrl(value) {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function isApprovedExternalUrl(value) {
  const url = parseUrl(value)
  return Boolean(url && APPROVED_EXTERNAL_PROTOCOLS.has(url.protocol))
}

function isTrustedApplicationUrl(value, trustedOrigin) {
  const url = parseUrl(value)
  if (!url || !trustedOrigin) return false
  return url.origin === trustedOrigin && (url.protocol === 'http:' || url.protocol === 'https:')
}

async function openApprovedExternalUrl(shell, value) {
  if (!shell || typeof shell.openExternal !== 'function' || !isApprovedExternalUrl(value)) {
    return false
  }

  await shell.openExternal(value, { logUsage: true })
  return true
}

module.exports = {
  APPROVED_EXTERNAL_PROTOCOLS,
  isApprovedExternalUrl,
  isTrustedApplicationUrl,
  openApprovedExternalUrl,
}
