import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Vista } from '../vista'
import { interceptFetch } from '../interceptors/fetch'
import { interceptXHR } from '../interceptors/xhr'
import { userEvent } from '@vitest/browser/context'

describe('Vista', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  it('fetch', async () => {
    const vista = new Vista([interceptFetch, interceptXHR])
    const logger = vi.fn()
    vista.use(async (c, next) => {
      logger(c)
      await next()
      const r = await c.res.json()
      r.id = 2
      c.res = new Response(JSON.stringify(r), r)
    })
    vista.intercept()
    const r = await (
      await fetch('https://jsonplaceholder.typicode.com/todos/1')
    ).json()
    expect(r.id).toBe(2)
    expect(logger).toBeCalledTimes(1)

    vista.destroy()
  })
})
