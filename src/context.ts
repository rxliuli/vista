import { BaseContext, BaseMiddleware } from './types'



export async function handleRequest<T extends BaseContext>(
  context: T,
  middlewares: BaseMiddleware<T>[],
) {
  const compose = (i: number): Promise<void> => {
    if (i >= middlewares.length) {
      return Promise.resolve()
    }
    return middlewares[i](context, () => compose(i + 1)) as Promise<void>
  }
  await compose(0)
}
