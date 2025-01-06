import { Context, handleRequest } from '../context'
import { HTTPException } from '../http-exception'
import { Middleware } from '../types'

export function interceptFetch(...middlewares: Middleware[]) {
  const pureFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    const c: Context = {
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
