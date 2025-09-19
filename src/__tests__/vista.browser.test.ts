import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Vista } from '../vista'
import { interceptFetch } from '../interceptors/fetch'
import { interceptXHR } from '../interceptors/xhr'
import { userEvent } from '@vitest/browser/context'
import { interceptClipboard } from '../interceptors/clipboard'
import { EventMiddleware, interceptEvent } from '../interceptors/event'

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
  it('clipboard', async () => {
    const writeTextSpy = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue()
    const vista = new Vista([interceptClipboard])
    const logger = vi.fn()
    vista.use(async (c, next) => {
      logger(c.text)
      await next()
    })
    vista.intercept()
    const button = document.createElement('button')
    button.textContent = 'copy'
    document.body.appendChild(button)
    button.addEventListener('click', async () => {
      await navigator.clipboard.writeText('hello')
    })
    await userEvent.click(button)
    expect(logger).toBeCalledWith('hello')
    expect(writeTextSpy).toBeCalledWith('hello')

    vista.destroy()
  })
  it('event', async () => {
    const vista = new Vista([
      (m: EventMiddleware[]) =>
        interceptEvent(m, {
          wrappedListeners: [],
        }),
    ])
    vista.use(async (c, next) => {
      logger(c.event.type)
      await next()
    })
    vista.intercept()

    const logger = vi.fn()
    const button = document.createElement('button')
    button.textContent = 'click me'
    document.body.appendChild(button)
    const clickHandler = vi.fn()
    button.addEventListener('click', clickHandler)
    await userEvent.click(button)
    expect(logger).toBeCalledWith('click')
    expect(clickHandler).toBeCalled()

    vista.destroy()
  })
})
