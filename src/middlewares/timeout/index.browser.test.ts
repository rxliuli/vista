import { afterEach, beforeEach, describe, expect, inject, it, vi } from 'vitest'
import { Vista } from '../../vista'
import { timeout } from '.'

describe('timeout', () => {
  let vista: Vista
  beforeEach(() => {
    vista = new Vista()
    vista.use(timeout(500))
    vista.intercept()
  })
  afterEach(() => {
    vista.destroy()
    vi.restoreAllMocks()
  })

  it('fetch', async () => {
    const r1 = await fetch(`${inject('serverUrl')}/wait`)
    expect(r1.ok).true
    const r2 = await fetch(`${inject('serverUrl')}/wait?timeout=1000`)
    expect(r2.ok).false
    expect(await r2.text()).toBe('Gateway Timeout')
  })
  it('xhr', async () => {
    async function fetchXHR(url: string) {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', url)
      return new Promise((resolve, reject) => {
        xhr.onload = () => resolve(xhr.responseText)
        xhr.onerror = () => reject(xhr.responseText)
        xhr.send()
      })
    }
    expect(await fetchXHR(`${inject('serverUrl')}/wait`)).toBe('ok')
    await expect(
      fetchXHR(`${inject('serverUrl')}/wait?timeout=1000`),
    ).rejects.toThrow()
  })
})
