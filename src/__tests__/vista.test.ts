import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Vista } from '../vista'

describe('vista', () => {
  let vista: Vista
  beforeEach(() => {
    vista = new Vista()
  })
  afterEach(() => {
    vista.destroy()
    vi.restoreAllMocks()
  })
  it('should be a singleton', async () => {
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
  })
})
