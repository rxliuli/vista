import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, describe, expect, it, test  } from 'vitest'
import { interceptXHR } from '../xhr'
import { setupServer } from 'msw/node'
import { XMLHttpRequest } from 'xmlhttprequest'

globalThis.XMLHttpRequest = XMLHttpRequest

const server = setupServer(
  http.get('http://example.com/msw-test/200', () => HttpResponse.json({ success: true })),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => server.resetHandlers())

afterEach(() => {
  server.resetHandlers()
  server.close()
})

describe('MSW with XHR interceptors', () => {
  it('properly intercepts a successful request', async () => {
    const unIntercept = interceptXHR([
      async (c, next) => {
        await next()
        c.res = new Response('{"intercepted": true}')
      },
    ])


    // this now goes through MSW and then Vista
    const xhr = new Promise<XMLHttpRequest>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', new URL('http://example.com/msw-test/200'))
      xhr.onload = () => resolve(xhr)
      xhr.onerror = () => reject(xhr)
      xhr.onloadend = () => console.error('LOAD END')
      xhr.send('')
    })
    await expect(xhr).resolves.not.toThrow()

    unIntercept()
  })
})
