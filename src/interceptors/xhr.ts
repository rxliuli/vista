import { Context, handleRequest } from '../context'
import { HTTPException } from '../http-exception'
import { Middleware } from '../types'

export class CustomXHR extends globalThis.XMLHttpRequest {
  constructor() {
    super()
  }

  #method: string = ''
  #url: string | URL = ''
  #async?: boolean
  #username?: string | null
  #password?: string | null
  #headers: Record<string, string> = {}
  #body?: Document | XMLHttpRequestBodyInit | null

  #listeners: [
    string,
    (this: XMLHttpRequest, ev: ProgressEvent) => any,
    boolean | AddEventListenerOptions | undefined,
  ][] = []

  open(method: string, url: string | URL): void
  open(
    method: string,
    url: string | URL,
    async: boolean,
    username?: string | null,
    password?: string | null,
  ): void
  open(
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ): void {
    this.#method = method
    this.#url = url
    if (async !== undefined) {
      this.#async = async
    }
    if (username !== undefined) {
      this.#username = username
    }
    if (password !== undefined) {
      this.#password = password
    }
  }

  static #middlewares: Middleware[] = []

  static middlewares(middlewares: Middleware[]) {
    CustomXHR.#middlewares = middlewares
  }

  setRequestHeader(name: string, value: string): void {
    this.#headers[name] = value
  }

  addEventListener<K extends keyof XMLHttpRequestEventMap>(
    type: K,
    listener: (this: XMLHttpRequest, ev: XMLHttpRequestEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ): void
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void
  addEventListener(type: any, listener: any, options?: any): void {
    this.#listeners.push([type, listener, options])
  }
  removeEventListener<K extends keyof XMLHttpRequestEventMap>(
    type: K,
    listener: (this: XMLHttpRequest, ev: XMLHttpRequestEventMap[K]) => any,
    options?: boolean | EventListenerOptions,
  ): void
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void
  removeEventListener(type: any, listener: any, options?: any): void {
    this.#listeners = this.#listeners.filter(
      ([t, l, o]) => t !== type || l !== listener || o !== options,
    )
  }
  set onload(callback: (this: XMLHttpRequest, ev: ProgressEvent) => any) {
    this.#listeners.push(['load', callback, false])
  }
  set onerror(callback: (this: XMLHttpRequest, ev: ProgressEvent) => any) {
    this.#listeners.push(['error', callback, false])
  }

  get status() {
    return this.#responseXHR?.status ?? super.status
  }

  get statusText() {
    return this.#responseXHR?.statusText ?? super.statusText
  }

  get responseURL() {
    return this.#responseXHR?.responseURL ?? super.responseURL
  }

  get readyState() {
    return this.#responseXHR?.readyState ?? super.readyState
  }

  get responseText() {
    return this.#responseXHR?.responseText ?? super.responseText
  }

  get responseType() {
    return this.#responseXHR?.responseType ?? super.responseType
  }
  set responseType(value: XMLHttpRequestResponseType) {
    super.responseType = value
  }

  #responseXHR?: XMLHttpRequest

  async send(body?: Document | XMLHttpRequestBodyInit | null): Promise<void> {
    this.#body = body

    const origin = {
      req: new Request(this.#url, {
        method: this.#method,
        headers: this.#headers,
        body: body as any,
      }),
      res: new Response(),
    }
    const c: Context = {
      type: 'xhr',
      req: origin.req,
      res: origin.res,
    }
    try {
      await handleRequest(c, [
        ...CustomXHR.#middlewares,
        this.#getMiddleware(origin),
      ])
    } catch (err) {
      if (err instanceof HTTPException) {
        this.#responseXHR = await responseToXHR(
          err.getResponse(),
          this.responseType,
        )
      } else if (typeof err === 'string') {
        this.#responseXHR = await responseToXHR(
          new Response(err, {
            status: 500,
            statusText: err,
          }),
          this.responseType,
        )
      } else if (err instanceof Error) {
        this.#responseXHR = await responseToXHR(
          new Response(err.message, { status: 500 }),
          this.responseType,
        )
      } else {
        this.#responseXHR = await responseToXHR(
          new Response(JSON.stringify(err), {
            status: 500,
            statusText: 'Internal Server Error',
          }),
          this.responseType,
        )
      }
      this.#listeners
        .filter(([type]) => type === 'error')
        .forEach(([_type, listener, _options]) => {
          listener.call(this, new ProgressEvent('error'))
        })
      return
    }
    if (c.res !== origin.res) {
      this.#responseXHR = await responseToXHR(c.res, this.responseType)
    }
    this.#listeners
      .filter(([type]) => type === 'load')
      .forEach(([_type, listener, _options]) => {
        listener.call(this, new ProgressEvent('load'))
      })
  }

  #getMiddleware: (origin: { req: Request; res: Response }) => Middleware =
    (origin) => async (c) => {
      const openArgs: any[] = [c.req.method, c.req.url]
      if (this.#async !== undefined) {
        openArgs.push(this.#async)
      }
      if (this.#username !== undefined) {
        openArgs.push(this.#username)
      }
      if (this.#password !== undefined) {
        openArgs.push(this.#password)
      }
      super.open.apply(this, openArgs as any)
      Object.entries(this.#headers).forEach(([name, value]) => {
        super.setRequestHeader.apply(this, [name, value])
      })
      this.#listeners
        .filter(([type]) => type !== 'load' && type !== 'error')
        .forEach(([type, listener, options]) => {
          super.addEventListener.apply(this, [type, listener as any, options])
        })
      let sendBody = this.#body
      if (c.req !== origin.req) {
        sendBody = c.req.body as any
      }
      await new Promise<void>((resolve, reject) => {
        super.addEventListener.apply(this, [
          'load',
          (_ev) => {
            c.res = xhrToResponse(this)
            origin.res = c.res
            resolve()
          },
        ])
        super.addEventListener.apply(this, [
          'error',
          (_ev) => {
            reject(new Error(this.status + ' ' + this.statusText))
          },
        ])
        if (c.req.body) {
          super.send.apply(this, [sendBody])
        } else {
          super.send.apply(this)
        }
      })
    }
}

function xhrToResponse(xhr: XMLHttpRequest) {
  const responseInit = {
    status: xhr.status,
    statusText: xhr.statusText,
    headers: parseHeadersText(xhr.getAllResponseHeaders()),
  }
  // ref: https://github.com/jpillora/xhook/pull/121/files
  const BODYLESS_STATUS_CODES = [101, 204, 205, 304]
  let body = xhr.response
  if (BODYLESS_STATUS_CODES.includes(xhr.status)) {
    body = null
  } else if (xhr.responseType === '' || xhr.responseType === 'text') {
    body = xhr.responseText
  }
  return new Response(body, responseInit)
}

async function responseToXHR(
  response: Response,
  responseType: XMLHttpRequestResponseType,
) {
  const xhr = new XMLHttpRequest()

  let responseValue
  if (
    ['text/event-stream', 'application/octet-stream'].includes(
      response.headers.get('Content-Type') ?? '',
    )
  ) {
    responseValue = response.body
  } else {
    switch (responseType) {
      case 'json':
        responseValue = await response.clone().json()
        break
      case 'blob':
        responseValue = await response.clone().blob()
        break
      case 'arraybuffer':
        responseValue = await response.clone().arrayBuffer()
        break
      case 'document':
      case 'text':
      default:
        responseValue = await response.clone().text()
    }
  }

  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })

  Object.defineProperties(xhr, {
    status: { value: response.status },
    statusText: { value: response.statusText },
    responseURL: { value: response.url },
    readyState: { value: 4 },
    response: { value: responseValue },
    responseType: { value: responseType },
    responseText: {
      value:
        responseType === 'text' || responseType === '' ? responseValue : null,
    },
    getAllResponseHeaders: {
      value: () => {
        return Object.entries(headers)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\r\n')
      },
    },
    getResponseHeader: {
      value: (name: string) => headers[name.toLowerCase()] || null,
    },
  })

  return xhr
}

function parseHeadersText(text: string) {
  return text
    .split('\r\n')
    .filter((header) => header)
    .reduce((acc, current) => {
      const [key, value] = current.split(': ')
      acc[key] = value
      return acc
    }, {} as Record<string, string>)
}

export function interceptXHR(...middlewares: Middleware[]) {
  const pureXHR = globalThis.XMLHttpRequest
  globalThis.XMLHttpRequest = CustomXHR
  CustomXHR.middlewares(middlewares)

  return () => {
    globalThis.XMLHttpRequest = pureXHR
  }
}
