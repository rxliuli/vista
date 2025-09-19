import { handleRequest } from '../context'
import { HTTPException } from '../http-exception'
import { Interceptor } from '../types'

export interface FetchContext {
  type: 'fetch' | 'xhr' | 'request'

  req: Request
  res: Response

  [key: string]: any
}

export interface FetchMiddleware {
  (c: FetchContext, next: () => Promise<void>): void | Promise<void>
}

export const interceptFetch: Interceptor<FetchMiddleware> = function (
  middlewares: FetchMiddleware[],
) {
  const pureFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    const c: FetchContext = {
      req: new Request(input, init),
      res: new Response(),
      type: 'fetch',
    }
    try {
      await handleRequest(c, [
        ...middlewares,
        async (context) => {
          context.res = await pureFetch(c.req)
        },
      ])
    } catch (err) {
      if (err instanceof HTTPException) {
        return err.getResponse()
      }
      throw err
    }
    return c.res
  }

  return () => {
    globalThis.fetch = pureFetch
  }
}
