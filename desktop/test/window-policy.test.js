import { describe, expect, it, vi } from 'vitest'
import policy from '../src/window-policy.cjs'

const { isApprovedExternalUrl, isTrustedApplicationUrl, openApprovedExternalUrl } = policy

describe('desktop window policy', () => {
  it('permits only normal web and mail links to leave the app', () => {
    expect(isApprovedExternalUrl('https://example.com/path')).toBe(true)
    expect(isApprovedExternalUrl('http://example.com/path')).toBe(true)
    expect(isApprovedExternalUrl('mailto:support@example.com')).toBe(true)
    expect(isApprovedExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isApprovedExternalUrl('file:///C:/Windows/System32/calc.exe')).toBe(false)
    expect(isApprovedExternalUrl('data:text/html,hello')).toBe(false)
    expect(isApprovedExternalUrl('not a url')).toBe(false)
  })

  it('allows navigation only within the selected loopback origin', () => {
    const origin = 'http://127.0.0.1:48173'

    expect(isTrustedApplicationUrl(`${origin}/`, origin)).toBe(true)
    expect(isTrustedApplicationUrl(`${origin}/settings/themes`, origin)).toBe(true)
    expect(isTrustedApplicationUrl('http://127.0.0.1:48174/', origin)).toBe(false)
    expect(isTrustedApplicationUrl('https://example.com/', origin)).toBe(false)
    expect(isTrustedApplicationUrl('file:///C:/temp/index.html', origin)).toBe(false)
  })

  it('never calls Electron shell for rejected schemes', async () => {
    const shell = { openExternal: vi.fn().mockResolvedValue(undefined) }

    await expect(openApprovedExternalUrl(shell, 'https://example.com')).resolves.toBe(true)
    await expect(openApprovedExternalUrl(shell, 'javascript:alert(1)')).resolves.toBe(false)

    expect(shell.openExternal).toHaveBeenCalledTimes(1)
    expect(shell.openExternal).toHaveBeenCalledWith('https://example.com', { logUsage: true })
  })
})
