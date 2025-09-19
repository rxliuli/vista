import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  MockInstance,
  vi,
} from 'vitest'
import { interceptClipboard } from '../clipboard'
import { userEvent } from '@vitest/browser/context'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('clipboard.writeText', () => {
  let writeTextSpy: MockInstance<typeof navigator.clipboard.writeText>
  let logger: ReturnType<typeof vi.fn>
  let button: HTMLButtonElement
  let content = ''
  beforeEach(() => {
    writeTextSpy = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue()
    logger = vi.fn()
    button = document.createElement('button')
    button.textContent = 'copy'
    document.body.appendChild(button)
    button.addEventListener('click', async () => {
      await navigator.clipboard.writeText(content)
    })
  })

  it('should intercept clipboard.writeText', async () => {
    const unIntercept = interceptClipboard([
      async (c, next) => {
        logger(c.text)
        await next()
      },
    ])

    content = 'hello'
    await userEvent.click(button)
    expect(logger).toBeCalledWith('hello')
    expect(writeTextSpy).toBeCalledWith('hello')

    unIntercept()
  })
  it('skip writeText', async () => {
    const unIntercept = interceptClipboard([
      async (c, next) => {
        logger(c.text)
        if (c.text === 'skip') {
          return
        }
        await next()
      },
    ])

    content = 'skip'
    await userEvent.click(button)
    expect(logger).toBeCalledWith('skip')
    expect(writeTextSpy).not.toBeCalled()

    unIntercept()
  })
  it('rewrite text', async () => {
    const unIntercept = interceptClipboard([
      async (c, next) => {
        logger(c.text)
        if (c.text === 'rewrite') {
          c.text = 'rewritten'
        }
        await next()
      },
    ])

    content = 'rewrite'
    await userEvent.click(button)
    expect(logger).toBeCalledWith('rewrite')
    expect(writeTextSpy).toBeCalledWith('rewritten')

    unIntercept()
  })
  it('handle error', async () => {
    const unIntercept = interceptClipboard([
      async (c, next) => {
        logger(c.text)
        if (c.text === 'error') {
          throw new Error('mock error')
        }
        await next()
      },
    ])

    const button = document.createElement('button')
    button.textContent = 'copy'
    document.body.appendChild(button)
    const clickHandler = vi.fn(async () => {
      await navigator.clipboard.writeText(content)
    })
    button.addEventListener('click', clickHandler)

    content = 'error'
    await userEvent.click(button)
    expect(logger).toBeCalledWith('error')
    expect(writeTextSpy).not.toBeCalled()
    expect(clickHandler).toBeCalled()
    await expect(clickHandler.mock.results[0].value).rejects.toEqual(
      new Error('mock error'),
    )
    unIntercept()
  })
})
