import { describe, it, vi, expect, beforeEach, inject } from 'vitest'
import { interceptFetch } from '../fetch'
import { HTTPException } from '../../http-exception'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('interceptFetch', () => {
  it('should intercept fetch', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => new Response())
    const logger = vi.fn()
    const unIntercept = interceptFetch(async (c, next) => {
      logger(c.req.url)
      await next()
    })
    const urls = [
      'https://jsonplaceholder.typicode.com/todos/1',
      new URL('https://jsonplaceholder.typicode.com/todos/1'),
      new Request('https://jsonplaceholder.typicode.com/todos/1'),
    ]
    await Promise.all(urls.map((url) => fetch(url)))
    expect(logger.mock.calls).toEqual([
      ['https://jsonplaceholder.typicode.com/todos/1'],
      ['https://jsonplaceholder.typicode.com/todos/1'],
      ['https://jsonplaceholder.typicode.com/todos/1'],
    ])
    expect(spy).toBeCalledTimes(3)
    unIntercept()
  })
  it('modify url', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const unIntercept = interceptFetch(async (c, next) => {
      c.req = new Request('https://jsonplaceholder.typicode.com/todos/2', c.req)
      await next()
    })
    const r = await (
      await fetch('https://jsonplaceholder.typicode.com/todos/1')
    ).json()
    expect((spy.mock.calls[0][0] as Request).url).toBe(
      'https://jsonplaceholder.typicode.com/todos/2',
    )
    expect(r.id).toBe(2)
    expect(spy).toBeCalledTimes(1)
    unIntercept()
  })
  it('modify response', async () => {
    const spy = vi.spyOn(globalThis, 'fetch')
    const unIntercept = interceptFetch(async (c, next) => {
      await next()
      const json = await c.res.json()
      json.id = 2
      c.res = new Response(JSON.stringify(json), c.res)
    })
    const r = await (
      await fetch('https://jsonplaceholder.typicode.com/todos/1')
    ).json()
    expect(r.id).toBe(2)
    expect(spy).toBeCalledTimes(1)
    unIntercept()
  })
  it('mock response', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => new Response())
    const unIntercept = interceptFetch(async (c, _next) => {
      c.res = new Response('test')
    })
    const r = await fetch('https://jsonplaceholder.typicode.com/todos/1')
    expect(await r.text()).toBe('test')
    expect(spy).toBeCalledTimes(0)
    unIntercept()
  })
  it('handle error', async () => {
    const unIntercept = interceptFetch(async (c, next) => {
      throw 'test'
    })
    await expect(
      fetch('https://jsonplaceholder.typicode.com/todos/1'),
    ).rejects.toThrow('test')
    unIntercept()
  })
  it('handle http error', async () => {
    const unIntercept = interceptFetch(async (c, next) => {
      throw new HTTPException(404, {
        res: new Response('Not Found', {
          status: 404,
        }),
      })
    })
    const r = await fetch('https://jsonplaceholder.typicode.com/todos/1')
    expect(r.status).toBe(404)
    expect(await r.text()).toBe('Not Found')
    unIntercept()
  })
  it('handle empty response', async () => {
    const unIntercept = interceptFetch(async (_c, next) => {
      await next()
    })
    const r = await fetch(`${inject('serverUrl')}/empty`)
    expect(r.status).toBe(204)
    unIntercept()
  })
  it('handle sse', async () => {
    const f = async (count: number) => {
      const r = await fetch(`${inject('serverUrl')}/sse?count=${count}`)
      expect(r.body).not.null
      const reader = r.body!.pipeThrough(new TextDecoderStream()).getReader()
      let chunk = await reader.read()
      const chunks: string[] = []
      while (!chunk.done) {
        chunks.push(chunk.value)
        chunk = await reader.read()
      }
      return chunks
    }
    expect(await f(5)).length(5)
    const unIntercept = interceptFetch(async (c, next) => {
      await next()
      if (
        c.res.headers.get('Content-Type')?.includes('text/event-stream') &&
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
    expect(await f(5)).length(10)
    unIntercept()
  })
  it('interceptFetch should be executed in the order of the onion model', async () => {
    const r: number[] = []
    const unIntercept = interceptFetch(
      async (_c, next) => {
        r.push(1)
        await next()
        r.push(2)
      },
      async (_c, next) => {
        r.push(3)
        await next()
        r.push(4)
      },
    )
    await fetch(`${inject('serverUrl')}/todos/1`)
    expect(r).toEqual([1, 3, 4, 2])
    unIntercept()
  })
})
