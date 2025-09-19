export interface BaseContext {
  type: string

  [key: string]: any
}

export interface BaseMiddleware<T extends BaseContext> {
  (c: T, next: () => Promise<void>): void | Promise<void>
}

export interface Interceptor<M extends BaseMiddleware<any>, C extends object = {}> {
  (middlewares: M[], config?: C): () => void
}
