import { Context } from './context'

export interface Middleware {
  (c: Context, next: () => Promise<void>): void | Promise<void>
}
