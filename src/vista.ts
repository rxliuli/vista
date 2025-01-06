import { interceptFetch } from './interceptors/fetch'
import { interceptXHR } from './interceptors/xhr'
import { Middleware } from './types'

export class Vista {
  private middlewares: Middleware[] = []

  use(middleware: Middleware) {
    this.middlewares.push(middleware)
    return this
  }

  private cancels: (() => void)[] = []

  intercept() {
    this.cancels.push(interceptFetch(...this.middlewares))
    this.cancels.push(interceptXHR(...this.middlewares))
  }

  destroy() {
    this.cancels.forEach((cancel) => cancel())
    this.cancels = []
  }
}
