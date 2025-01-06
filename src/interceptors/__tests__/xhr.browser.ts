import { beforeEach, describe, expect, it, vi } from 'vitest'
import { interceptXHR } from '../xhr'
import { HTTPException } from '../../http-exception'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('interceptXHR', () => {
  it('should intercept XHR', async () => {
    const spy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const logger = vi.fn()
    const unIntercept = interceptXHR(async (c, next) => {
      logger(c.req.url)
      await next()
    })
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://jsonplaceholder.typicode.com/todos/1')
    xhr.send()
    expect(logger.mock.calls[0][0]).toBe(
      'https://jsonplaceholder.typicode.com/todos/1',
    )
    expect(spy).toBeCalledTimes(1)
    unIntercept()
  })
  it('modify url', async () => {
    const spy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const unIntercept = interceptXHR(async (c, next) => {
      c.req = new Request('https://jsonplaceholder.typicode.com/todos/2', c.req)
      await next()
    })
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://jsonplaceholder.typicode.com/todos/1')
    const r = await new Promise<{ id: string }>((resolve, reject) => {
      xhr.addEventListener('load', function () {
        resolve(JSON.parse(this.responseText))
      })
      xhr.addEventListener('error', function () {
        reject(this.responseText)
      })
      xhr.send()
    })
    expect(r.id).toBe(2)
    expect(spy).toBeCalledTimes(1)
    unIntercept()
  })
  it('modify response', async () => {
    const spy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const unIntercept = interceptXHR(async (c, next) => {
      await next()
      const json = await c.res.json()
      json.id = 2
      c.res = new Response(JSON.stringify(json), c.res)
    })
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://jsonplaceholder.typicode.com/todos/1')
    const r = await new Promise<{ id: string }>((resolve, reject) => {
      xhr.addEventListener('load', function () {
        resolve(JSON.parse(this.responseText))
      })
      xhr.addEventListener('error', function () {
        reject(this.responseText)
      })
      xhr.send()
    })
    expect(r.id).toBe(2)
    expect(spy).toBeCalledTimes(1)
    unIntercept()
  })
  it('mock response', async () => {
    const spy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const unIntercept = interceptXHR(async (c, _next) => {
      c.res = new Response('test')
    })
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://jsonplaceholder.typicode.com/todos/1')
    xhr.send()
    const r = await new Promise<string>((resolve, reject) => {
      xhr.addEventListener('load', function () {
        resolve(this.responseText)
      })
      xhr.addEventListener('error', function () {
        reject(this.responseText)
      })
      xhr.send()
    })
    expect(r).toBe('test')
    expect(spy).toBeCalledTimes(0)
    unIntercept()
  })
  it('modify response on onload and onerror', async () => {
    const spy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const unIntercept = interceptXHR(async (c, next) => {
      await next()
      const json = await c.res.json()
      json.id = 2
      c.res = new Response(JSON.stringify(json), c.res)
    })
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://jsonplaceholder.typicode.com/todos/1')
    const r = await new Promise<{ id: string }>((resolve, reject) => {
      xhr.onload = function () {
        resolve(JSON.parse(this.responseText))
      }
      xhr.onerror = function () {
        reject(this.responseText)
      }
      xhr.send()
    })
    expect(r.id).toBe(2)
    expect(spy).toBeCalledTimes(1)
    unIntercept()
  })
  it('modify response on xhr.responseText', async () => {
    const spy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const unIntercept = interceptXHR(async (c, next) => {
      await next()
      const json = await c.res.json()
      json.id = 2
      c.res = new Response(JSON.stringify(json), c.res)
    })
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://jsonplaceholder.typicode.com/todos/1')
    const r = await new Promise<{ id: string }>((resolve, reject) => {
      xhr.onload = () => resolve(JSON.parse(xhr.responseText))
      xhr.onerror = () => reject(xhr.responseText)
      xhr.send()
    })
    expect(r.id).toBe(2)
    expect(spy).toBeCalledTimes(1)
    unIntercept()
  })
  it('handle error', async () => {
    const unIntercept = interceptXHR(async (c, next) => {
      throw 'test'
    })
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://jsonplaceholder.typicode.com/todos/1')
    await expect(
      new Promise((resolve, reject) => {
        xhr.onload = () => resolve(xhr.responseText)
        xhr.onerror = () => reject(xhr.responseText)
        xhr.send()
      }),
    ).rejects.toThrow()
    expect(xhr.status).toBe(500)
    expect(xhr.responseText).toBe('test')
    unIntercept()
  })
  it('handle http error', async () => {
    const unIntercept = interceptXHR(async (c, next) => {
      throw new HTTPException(404, {
        message: 'test',
      })
    })
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://jsonplaceholder.typicode.com/todos/1')
    await expect(
      new Promise((resolve, reject) => {
        xhr.onload = () => resolve(xhr.responseText)
        xhr.onerror = () => reject(xhr.responseText)
        xhr.send()
      }),
    ).rejects.toThrow()
    expect(xhr.status).toBe(404)
    expect(xhr.responseText).toBe('test')
    unIntercept()
  })
  it('handle normal error', async () => {
    const unIntercept = interceptXHR(async (c, next) => {
      throw new Error('test')
    })
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://jsonplaceholder.typicode.com/todos/1')
    await expect(
      new Promise((resolve, reject) => {
        xhr.onload = () => resolve(xhr.responseText)
        xhr.onerror = () => reject(xhr.responseText)
        xhr.send()
      }),
    ).rejects.toThrow()
    expect(xhr.status).toBe(500)
    expect(xhr.responseText).toBe('test')
    unIntercept()
  })
  it('handle empty response', async () => {
    const unIntercept = interceptXHR(async (_c, next) => {
      await next()
    })
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'http://localhost:3000/empty')
    await new Promise((resolve, reject) => {
      xhr.onload = () => resolve(xhr.responseText)
      xhr.onerror = () => reject(xhr.responseText)
      xhr.send()
    })
    expect(xhr.status).toBe(204)
    unIntercept()
  })
  it('set responseType', async () => {
    const unIntercept = interceptXHR(async (_c, next) => {
      await next()
    })
    const xhr = new XMLHttpRequest()
    xhr.open('GET', 'https://jsonplaceholder.typicode.com/todos/1')
    xhr.responseType = 'text'
    await new Promise((resolve, reject) => {
      xhr.onload = () => resolve(xhr.responseText)
      xhr.onerror = () => reject(xhr.responseText)
      xhr.send()
    })
    expect(xhr.responseType).toBe('text')
    unIntercept()
  })
  it('handle sse', async () => {
    const f = (count: number): Promise<string[]> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        let chunks: string[] = []
        xhr.open('GET', `http://localhost:3000/sse?count=${count}`)
        xhr.responseType = 'text'
        xhr.onprogress = () => {
          const newData = xhr.responseText
          if (newData) {
            chunks = xhr.responseText.split('\n\n').filter((it) => it.trim())
          }
        }
        xhr.onload = function () {
          expect(xhr.getResponseHeader('Content-Type')).toBe(
            'text/event-stream',
          )
          expect(this.getResponseHeader('Content-Type')).toBe(
            'text/event-stream',
          )
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(chunks)
          } else {
            reject(new Error(`HTTP error! status: ${xhr.status}`))
          }
        }
        xhr.onerror = () => {
          reject(new Error('Network error occurred'))
        }
        xhr.send()
      })
    }
    expect(await f(5)).length(5)
    const unIntercept = interceptXHR(async (c, next) => {
      await next()
      if (
        c.res.headers.get('Content-Type') === 'text/event-stream' &&
        c.res.body
      ) {
        c.res = new Response(
          new ReadableStream({
            async start(controller) {
              const reader = c.res.body!.getReader()
              let chunk = await reader.read()
              while (!chunk.done) {
                controller.enqueue(chunk.value)
                controller.enqueue(chunk.value)
                chunk = await reader.read()
              }
              controller.close()
            },
          }),
          c.res,
        )
      }
    })
    expect(await f(5))
    unIntercept()
  })
})
