import { afterEach, beforeEach, describe, expect, inject, it, vi } from 'vitest'
import { prettyJSON } from './pretty-json'
import { FetchContext, interceptFetch } from '../interceptors/fetch'
import { Vista } from '../vista'
import { interceptXHR } from '../interceptors/xhr'

describe('pretty json', () => {
  let vista: Vista<FetchContext>
  const expected = {
    userId: 1,
    id: 1,
    title: 'delectus aut autem',
    completed: false,
  }
  beforeEach(() => {
    vista = new Vista<FetchContext>([interceptFetch, interceptXHR])
    vista.use(prettyJSON())
    vista.intercept()
  })
  afterEach(() => {
    vista.destroy()
    vi.restoreAllMocks()
  })

  it('fetch', async () => {
    const r1 = await (await fetch(`${inject('serverUrl')}/todos/1`)).text()
    expect(r1).toBe(JSON.stringify(expected))
    const r2 = await (
      await fetch(`${inject('serverUrl')}/todos/1?pretty`)
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
    expect(await fetchXHR(`${inject('serverUrl')}/todos/1`)).toBe(
      JSON.stringify(expected),
    )
    expect(await fetchXHR(`${inject('serverUrl')}/todos/1?pretty`)).toBe(
      JSON.stringify(expected, null, 2),
    )
  })
})
