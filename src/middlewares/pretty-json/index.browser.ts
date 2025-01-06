import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { prettyJSON } from '.'
import { Vista } from '../../vista'

describe('pretty json', () => {
  let vista: Vista
  const expected = {
    userId: 1,
    id: 1,
    title: 'delectus aut autem',
    completed: false,
  }
  beforeEach(() => {
    vista = new Vista()
    vista.use(prettyJSON())
    vista.intercept()
  })
  afterEach(() => {
    vista.destroy()
    vi.restoreAllMocks()
  })

  it('fetch', async () => {
    const r1 = await (await fetch('http://localhost:3000/todos/1')).text()
    expect(r1).toBe(JSON.stringify(expected))
    const r2 = await (
      await fetch('http://localhost:3000/todos/1?pretty')
    ).text()
    expect(r2).toBe(JSON.stringify(expected, null, 2))
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
    expect(await fetchXHR('http://localhost:3000/todos/1')).toBe(
      JSON.stringify(expected),
    )
    expect(await fetchXHR('http://localhost:3000/todos/1?pretty')).toBe(
      JSON.stringify(expected, null, 2),
    )
  })
})
