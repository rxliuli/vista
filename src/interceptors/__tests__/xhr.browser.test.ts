import { beforeEach, describe, expect, inject, it, vi } from 'vitest'
import { interceptXHR } from '../xhr'
import { HTTPException } from '../../http-exception'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('interceptXHR', () => {
  async function request(
    url: string,
    options?: {
      method?: string
      responseType?: XMLHttpRequestResponseType
      body?: any
    },
  ) {
    return new Promise<XMLHttpRequest>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open(options?.method || 'GET', url)
      xhr.responseType = options?.responseType ?? 'text'
      xhr.onload = () => resolve(xhr)
      xhr.onerror = () => reject(xhr)
      xhr.send(options?.body)
    })
  }

  it('should intercept XHR', async () => {
    const spy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const logger = vi.fn()
    const unIntercept = interceptXHR([
      async (c, next) => {
        logger(c.req.url)
        await next()
      },
    ])
    await request('https://jsonplaceholder.typicode.com/todos/1')
    expect(logger.mock.calls[0][0]).toBe(
      'https://jsonplaceholder.typicode.com/todos/1',
    )
    expect(spy).toBeCalledTimes(1)
    unIntercept()
  })
  it('modify url', async () => {
    const spy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const unIntercept = interceptXHR([
      async (c, next) => {
        c.req = new Request(
          'https://jsonplaceholder.typicode.com/todos/2',
          c.req,
        )
        await next()
      },
    ])
    const xhr = await request('https://jsonplaceholder.typicode.com/todos/1')
    const r = JSON.parse(xhr.responseText)
    expect(r.id).toBe(2)
    expect(spy).toBeCalledTimes(1)
    unIntercept()
  })
  it('modify post url', async () => {
    const serverUrl = inject('serverUrl')
    const spy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const unIntercept = interceptXHR([
      async (c, next) => {
        c.req = new Request(`${serverUrl}/echo`, {
          method: c.req.method,
          headers: c.req.headers,
          body: await c.req.text(),
          duplex: 'half', // for ReadableStream body
        } as RequestInit)
        await next()
      },
    ])
    const xhr = await request(`${serverUrl}/todos/1`, {
      method: 'POST',
      body: 'hello',
    })
    const r = JSON.parse(xhr.responseText)
    expect(spy.mock.calls[0][1] as string).toBe(`${serverUrl}/echo`)
    expect(r.echo).toBe('hello')
    expect(spy).toBeCalledTimes(1)
    unIntercept()
  })
  it('modify response', async () => {
    const spy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const unIntercept = interceptXHR([
      async (c, next) => {
        await next()
        const json = await c.res.json()
        json.id = 2
        c.res = new Response(JSON.stringify(json), c.res)
      },
    ])
    const xhr = await request('https://jsonplaceholder.typicode.com/todos/1')
    const r = JSON.parse(xhr.responseText)
    expect(r.id).toBe(2)
    expect(spy).toBeCalledTimes(1)
    unIntercept()
  })
  it('mock response', async () => {
    const spy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const unIntercept = interceptXHR([
      async (c, _next) => {
        c.res = new Response('test')
      },
    ])
    const xhr = await request('https://jsonplaceholder.typicode.com/todos/1')
    const r = xhr.responseText
    expect(r).toBe('test')
    expect(spy).toBeCalledTimes(0)
    unIntercept()
  })
  it('modify response on onload and onerror', async () => {
    const spy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const unIntercept = interceptXHR([
      async (c, next) => {
        await next()
        const json = await c.res.json()
        json.id = 2
        c.res = new Response(JSON.stringify(json), c.res)
      },
    ])
    const xhr = await request('https://jsonplaceholder.typicode.com/todos/1')
    const r = JSON.parse(xhr.responseText)
    expect(r.id).toBe(2)
    expect(spy).toBeCalledTimes(1)
    unIntercept()
  })
  it('modify response on xhr.responseText', async () => {
    const spy = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const unIntercept = interceptXHR([
      async (c, next) => {
        await next()
        const json = await c.res.json()
        json.id = 2
        c.res = new Response(JSON.stringify(json), c.res)
      },
    ])
    const xhr = await request('https://jsonplaceholder.typicode.com/todos/1')
    const r = JSON.parse(xhr.responseText)
    expect(r.id).toBe(2)
    expect(spy).toBeCalledTimes(1)
    unIntercept()
  })
  it('handle error', async () => {
    const unIntercept = interceptXHR([
      async (c, next) => {
        throw 'test'
      },
    ])
    const xhr = request('https://jsonplaceholder.typicode.com/todos/1')
    await expect(xhr).rejects.toThrow()
    try {
      await xhr
    } catch (e: any) {
      expect(e.status).toBe(500)
      expect(e.responseText).toBe('test')
    }
    unIntercept()
  })
  it('handle http exception', async () => {
    const unIntercept = interceptXHR([
      async (c, next) => {
        throw new HTTPException(404, {
          message: 'test',
        })
      },
    ])
    const xhr = request('https://jsonplaceholder.typicode.com/todos/1')
    await expect(xhr).rejects.toThrow()
    try {
      await xhr
    } catch (e: any) {
      expect(e.status).toBe(404)
      expect(e.responseText).toBe('test')
    }
    unIntercept()
  })
  it('handle http exception with next after', async () => {
    const xhr1 = await request(`${inject('serverUrl')}/todos/1`, {
      responseType: 'json',
    })
    expect(xhr1.response).toMatchObject({ id: 1 })
    const unIntercept = interceptXHR([
      async (c, next) => {
        await next()
        throw new HTTPException(400, {
          message: 'test',
        })
      },
    ])
    const xhr2 = request(`${inject('serverUrl')}/todos/1`)
    await expect(xhr2).rejects.toThrow()
    try {
      await xhr2
    } catch (err) {
      const xhr = err as XMLHttpRequest
      expect(xhr.responseText).toBe('test')
      expect(xhr.status).toBe(400)
    }
    unIntercept()
  })
  it('handle normal error', async () => {
    const unIntercept = interceptXHR([
      async (c, next) => {
        throw new Error('test')
      },
    ])
    const xhr = request('https://jsonplaceholder.typicode.com/todos/1')
    await expect(xhr).rejects.toThrow()
    try {
      await xhr
    } catch (e: any) {
      expect(e.status).toBe(500)
      expect(e.responseText).toBe('test')
    }
    unIntercept()
  })
  it('handle empty response', async () => {
    const unIntercept = interceptXHR([
      async (_c, next) => {
        await next()
      },
    ])
    const xhr = await request(`${inject('serverUrl')}/empty`)
    expect(xhr.status).toBe(204)
    unIntercept()
  })
  it('set responseType', async () => {
    const unIntercept = interceptXHR([
      async (_c, next) => {
        await next()
      },
    ])
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
  describe('sse', () => {
    const f = (count: number): Promise<string[]> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        let chunks: string[] = []
        xhr.open('GET', `${inject('serverUrl')}/sse?count=${count}`)
        xhr.responseType = 'text'
        xhr.onprogress = () => {
          const newData = xhr.responseText
          if (newData) {
            chunks = newData.split('\n\n').filter((it) => it.trim())
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
    it('modify sse response', async () => {
      expect(await f(5)).length(5)
      const unIntercept = interceptXHR([
        async (c, next) => {
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
        },
      ])
      expect(await f(5)).length(10)
      unIntercept()
    })
    it('read sse response', async () => {
      expect(await f(5)).length(5)
      const chunks: string[] = []
      const unIntercept = interceptXHR([
        async (c, next) => {
          await next()
          const cloneResp = c.res.clone()
          if (
            cloneResp.headers.get('Content-Type') === 'text/event-stream' &&
            cloneResp.body
          ) {
            const reader = cloneResp
              .body!.pipeThrough(new TextDecoderStream())
              .getReader()
            let chunk = await reader.read()
            while (!chunk.done) {
              chunks.push(
                ...chunk.value!.split('\n\n').filter((it) => it.trim()),
              )
              chunk = await reader.read()
            }
          }
        },
      ])
      expect(await f(5)).length(5)
      expect(chunks).length(5)
      unIntercept()
    })
  })
  it('send body', async () => {
    const spy = vi.spyOn(XMLHttpRequest.prototype, 'send')
    const unIntercept = interceptXHR([
      async (c, next) => {
        await next()
      },
    ])
    const xhr = new XMLHttpRequest()
    xhr.open('POST', 'https://jsonplaceholder.typicode.com/todos/1')
    xhr.send('test')
    expect(spy).toBeCalledWith('test')
    unIntercept()
  })
  it('blocking request', async () => {
    const f = async () => {
      const start = Date.now()
      await request(`${inject('serverUrl')}/todos/1`)
      return Date.now() - start
    }
    const r1 = await f()
    const unIntercept = interceptXHR([
      async (c, next) => {
        await next()
        await new Promise((resolve) => setTimeout(resolve, 100))
      },
    ])
    const r2 = await f()
    expect(r1).lt(100)
    expect(r2).gt(100)
    unIntercept()
  })
  it('blocking request of readystatechange', async () => {
    const r: number[] = []
    const unIntercept = interceptXHR([
      async (_c, next) => {
        await next()
        await new Promise((resolve) => setTimeout(resolve, 100))
        r.push(1)
      },
    ])
    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', `${inject('serverUrl')}/todos/1`)
      xhr.responseType = 'text'
      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          r.push(2)
          resolve()
        }
      }
      // xhr.onload = resolve
      xhr.send()
    })
    expect(r).toEqual([1, 2])
    unIntercept()
  })
  it('set responseType to json', async () => {
    let json: any
    const unIntercept = interceptXHR([
      async (c, next) => {
        await next()
        json = await c.res.clone().json()
      },
    ])
    const xhr = new XMLHttpRequest()
    xhr.open('GET', `${inject('serverUrl')}/todos/1`)
    xhr.responseType = 'json'
    await new Promise((resolve, reject) => {
      xhr.onload = resolve
      xhr.onerror = reject
      xhr.send()
    })
    expect(xhr.response).toEqual(json)
    unIntercept()
  })
  it('interceptXHR should be executed in the order of the onion model', async () => {
    const r: number[] = []
    const unIntercept = interceptXHR([
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
    ])
    await request(`${inject('serverUrl')}/todos/1`)
    expect(r).toEqual([1, 3, 4, 2])
    unIntercept()
  })
  it('should handle empty body with get method', async () => {
    const unIntercept = interceptXHR([
      async (c, next) => {
        await next()
      },
    ])

    const xhr = await new Promise<XMLHttpRequest>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', `${inject('serverUrl')}/todos/1`)
      xhr.onload = () => resolve(xhr)
      xhr.onerror = () => reject(xhr)
      xhr.send('')
    })
    expect(xhr.status).toBe(200)

    unIntercept()
  })
  it('should keep original headers but also include headers added in interceptors', async () => {
    const unIntercept = interceptXHR([
      async (c, next) => {
        c.req.headers.set('X-Test-Header-2', 'test-value-2')
        await next()

        expect(c.req.headers.get('X-Test-Header')).toBe('test-value')
        expect(c.req.headers.get('X-Test-Header-2')).toBe('test-value-2')
      },
    ])

    const xhr = await new Promise<XMLHttpRequest>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', `${inject('serverUrl')}/headers`)
      xhr.setRequestHeader('X-Test-Header', 'test-value')
      xhr.onload = () => resolve(xhr)
      xhr.onerror = () => reject(xhr)
      xhr.send('')
    })
    expect(JSON.parse(xhr.responseText)).toMatchObject({
      'x-test-header': 'test-value',
      'x-test-header-2': 'test-value-2',
    })

    unIntercept()
  })
  it('should emit loadend after all middlewares', async () => {
    const testEnded = Promise.withResolvers<void>()

    const status: string[] = []
    const unIntercept = interceptXHR([
      async (c, next) => {
        status.push('middleware start')
        await next()
        await new Promise((r) => window.requestAnimationFrame(r))
        status.push('middleware end')
        testEnded.resolve()
      },
    ])

    await new Promise<XMLHttpRequest>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('GET', `${inject('serverUrl')}/headers`)
      xhr.onloadend = () => {
        status.push('xhr loadend')
        resolve(xhr)
      }
      xhr.onerror = () => reject(xhr)
      xhr.send('')
    })

    await testEnded.promise
    expect(status).toEqual([
      'middleware start',
      'middleware end',
      'xhr loadend',
    ])

    unIntercept()
  })
  it('should not modify content-type when it is multipart/form-data', async () => {
    const unIntercept = interceptXHR([
      async (c, next) => {
        await next()
      },
    ])

    const formData = new FormData()
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${inject('serverUrl')}/upload`)
    formData.append(
      'file',
      new Blob(['file content'], { type: 'text/plain' }),
      'test.txt',
    )
    const xhrResult = await new Promise<XMLHttpRequest>((resolve, reject) => {
      xhr.onload = () => resolve(xhr)
      xhr.onerror = () => reject(xhr)
      xhr.send(formData)
    })
    expect(xhrResult.status).eq(200)

    unIntercept()
  }, 1000)
  // regression test for the missing ReadableStream support of Firefox
  it('can update body of request', async () => {
    const spy = vi.spyOn(XMLHttpRequest.prototype, 'send')
    const unIntercept = interceptXHR([
      async (c, next) => {
        c.req = new Request(c.req, {
          body: new Uint8Array([116, 101, 115, 116]), // 'test' in uint8array
        })
        await next()
      },
    ])

    const { promise, resolve } = Promise.withResolvers<string>()
    const xhr = new XMLHttpRequest()
    xhr.onloadend = () => resolve(xhr.responseText)
    xhr.open('PUT', `${inject('serverUrl')}/echo`)
    xhr.send('hello')

    expect(await promise).toBe('test') // the body should be updated to 'test'
    unIntercept()
  })
})
