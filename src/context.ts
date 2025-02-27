import { Middleware } from './types'

export interface Context {
  req: Request
  res: Response
  type: 'fetch' | 'xhr' | 'request'

  [key: string]: any
}

export async function handleRequest(
  context: Context,
  middlewares: Middleware[],
) {
  const compose = (i: number): Promise<void> => {
    if (i >= middlewares.length) {
      return Promise.resolve()
    }
    return middlewares[i](context, () => compose(i + 1)) as Promise<void>
  }
  await compose(0)
}
