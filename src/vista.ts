import { BaseContext, BaseMiddleware } from './types'

export class Vista<T extends BaseContext> {
  private middlewares: BaseMiddleware<T>[] = []

  private cancels: (() => void)[] = []

  constructor(
    private readonly interceptors: Array<
      (middlewares: BaseMiddleware<T>[]) => () => void
    > = [],
  ) {}

  use(middleware: BaseMiddleware<T>) {
    this.middlewares.push(middleware)
    return this
  }

  intercept() {
    this.cancels = this.interceptors.map((interceptor) =>
      interceptor(this.middlewares),
    )
  }

  destroy() {
    this.cancels.forEach((cancel) => cancel())
    this.cancels = []
  }
}
