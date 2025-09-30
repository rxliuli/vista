import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { interceptEvent, InterceptEventOptions } from '../event'
import { userEvent } from '@vitest/browser/context'
import { render } from 'vitest-browser-react'
import { useState } from 'react'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('interceptEvent', () => {
  it('should intercept click event', async () => {
    const logger = vi.fn()
    const unIntercept = interceptEvent([
      async (c, next) => {
        logger(c.event.type)
        await next()
      },
    ])

    const button = document.createElement('button')
    button.textContent = 'click me'
    document.body.appendChild(button)
    const clickHandler = vi.fn()
    button.addEventListener('click', clickHandler)
    await userEvent.click(button)
    expect(logger).toBeCalledWith('click')
    expect(clickHandler).toBeCalled()

    unIntercept()
  })
  it('skip event', async () => {
    const logger = vi.fn()
    const unIntercept = interceptEvent([
      async (c, next) => {
        logger(c.event.type)
        if (c.event.type === 'pointerleave') {
          return
        }
        await next()
      },
    ])

    const button = document.createElement('button')
    button.textContent = 'click me'
    document.body.appendChild(button)
    const clickHandler = vi.fn()
    button.addEventListener('pointerenter', clickHandler)
    button.addEventListener('pointerleave', clickHandler)
    await userEvent.hover(button)
    await userEvent.unhover(button)
    expect(logger).toBeCalledWith('pointerenter')
    expect(clickHandler).toBeCalledTimes(1)
    expect(logger).toBeCalledWith('pointerleave')
    expect(clickHandler).toBeCalledTimes(1)

    unIntercept()
  })
  it('forward event', async () => {
    const logger = vi.fn()
    const wrappedListeners: NonNullable<
      InterceptEventOptions['wrappedListeners']
    > = []
    const unIntercept = interceptEvent(
      [
        async (c, next) => {
          logger(c.event.type)
          if (
            c.event.target === triggerElement &&
            c.event.type === 'pointerleave'
          ) {
            return
          }
          await next()
        },
      ],
      { wrappedListeners },
    )

    const button = document.createElement('button')
    button.textContent = 'click me'
    document.body.appendChild(button)
    const hoverHandler = vi.fn().mockImplementation(() => {
      if (document.getElementById('hover-card')) {
        return
      }
      const card = document.createElement('div')
      card.id = 'hover-card'
      card.textContent = 'hover card'
      document.body.appendChild(card)
    })
    const unhoverHandler = vi.fn().mockImplementation(() => {
      const card = document.getElementById('hover-card')
      if (card) {
        document.body.removeChild(card)
      }
    })
    button.addEventListener('pointerenter', hoverHandler)
    button.addEventListener('pointerleave', unhoverHandler)
    const triggerElement = button

    document.body.addEventListener('click', (event) => {
      if (event.target !== triggerElement) {
        const leaveListeners = [...wrappedListeners].filter((it) => {
          return it.dom === triggerElement && it.type === 'pointerleave'
        })
        leaveListeners.forEach((it) => {
          const event = new PointerEvent('pointerleave')
          if (typeof it.original === 'function') {
            it.original(event)
          } else {
            it.original.handleEvent(event)
          }
        })
      }
    })
    await userEvent.hover(button)
    expect(logger).toBeCalledWith('pointerenter')
    expect(hoverHandler).toBeCalled()
    expect(document.getElementById('hover-card')).not.null
    await userEvent.unhover(button)
    expect(logger).toBeCalledWith('pointerleave')
    expect(unhoverHandler).not.toBeCalled()
    expect(document.getElementById('hover-card')).not.null

    await userEvent.click(button)
    expect(logger).toBeCalledWith('pointerleave')
    expect(unhoverHandler).not.toBeCalled()
    expect(document.getElementById('hover-card')).not.null

    await userEvent.click(document.body)
    expect(unhoverHandler).toBeCalled()
    expect(document.getElementById('hover-card')).null

    unIntercept()
  })
  it('react event delegation', async () => {
    const logger = vi.fn()
    const wrappedListeners: NonNullable<
      InterceptEventOptions['wrappedListeners']
    > = []
    function isReactElement(element: Element) {
      const attrs = Reflect.ownKeys(triggerElement)
      return attrs.some(
        (it) => typeof it === 'string' && it.startsWith('__reactFiber$'),
      )
    }
    const unIntercept = interceptEvent(
      [
        async (c, next) => {
          logger(c.event.type)
          if (
            c.event.target === triggerElement &&
            isReactElement(triggerElement) &&
            ['pointerout', 'pointerover', 'mouseout', 'mouseover'].includes(
              c.event.type,
            )
          ) {
            return
          }
          await next()
        },
      ],
      { wrappedListeners },
    )

    const hoverHandler = vi.fn()
    const unhoverHandler = vi.fn()

    function App() {
      const [isHovered, setIsHovered] = useState(false)
      return (
        <>
          <button
            onPointerEnter={(ev) => {
              setIsHovered(true)
              hoverHandler(ev)
            }}
            onPointerLeave={(ev) => {
              setIsHovered(false)
              unhoverHandler(ev)
            }}
          >
            click me
          </button>
          {isHovered && <div id="hover-card">hover card</div>}
        </>
      )
    }
    const screen = render(<App />, {
      container: document.body,
    })

    const triggerElement = screen
      .getByText('click me')
      .element() as HTMLButtonElement

    document.body.addEventListener('click', (event) => {
      if (event.target !== triggerElement && isReactElement(triggerElement)) {
        // react event delegation, emit pointerout event to simulate pointerleave
        // https://github.com/facebook/react/blob/6eda534718d09a26d58d65c0a376e05d7e2a3358/packages/react-dom-bindings/src/events/plugins/EnterLeaveEventPlugin.js#L38
        const leaveListeners = [...wrappedListeners].filter(
          (it) =>
            it.type === 'pointerout' &&
            (it.dom as HTMLElement).contains(triggerElement),
        )
        const pointerOutEvent = new PointerEvent('pointerout', {
          bubbles: true,
          cancelable: true,
          composed: true,
          view: window,
          clientX: 0,
          clientY: 0,
        })
        Object.defineProperty(pointerOutEvent, 'target', {
          value: triggerElement,
          enumerable: true,
        })
        Object.defineProperty(pointerOutEvent, 'relatedTarget', {
          value: document.body,
          enumerable: true,
        })
        leaveListeners.forEach((it) => {
          if (typeof it.original === 'function') {
            it.original(pointerOutEvent)
          } else {
            it.original.handleEvent(pointerOutEvent)
          }
        })
      }
    })

    await userEvent.hover(triggerElement)
    expect(hoverHandler).toBeCalled()
    expect(document.getElementById('hover-card')).not.null
    await userEvent.unhover(triggerElement)
    expect(unhoverHandler).not.toBeCalled()
    expect(document.getElementById('hover-card')).not.null

    await userEvent.click(triggerElement)
    expect(unhoverHandler).not.toBeCalled()
    expect(document.getElementById('hover-card')).not.null

    await userEvent.click(document.body)
    expect(unhoverHandler).toBeCalled()
    expect(document.getElementById('hover-card')).null

    unIntercept()
  })
  it('handle error', async () => {
    const errorLogger = vi.fn()
    const unIntercept = interceptEvent([
      async (c, next) => {
        try {
          await next()
        } catch (e) {
          errorLogger(e)
        }
      },
    ])

    const button = document.createElement('button')
    button.textContent = 'click me'
    document.body.appendChild(button)
    const clickHandler = vi.fn().mockImplementation(() => {
      throw new Error('click error')
    })
    button.addEventListener('click', clickHandler)
    await userEvent.click(button)
    expect(clickHandler).toBeCalledTimes(1)
    expect(errorLogger).toBeCalledTimes(1)
    expect(errorLogger).toBeCalledWith(new Error('click error'))

    unIntercept()
  })
  it('document event', async () => {
    const unIntercept = interceptEvent([
      async (c, next) => {
        if (c.event.target !== c.event.currentTarget) {
          return
        }
        await next()
      },
    ])

    const button = document.createElement('button')
    button.textContent = 'click me'
    document.body.appendChild(button)
    const clickHandler = vi.fn()
    const globalClickHandler = vi.fn()
    button.addEventListener('click', clickHandler)
    document.body.addEventListener('click', globalClickHandler)
    await userEvent.click(button)
    expect(clickHandler).toBeCalledTimes(1)
    expect(globalClickHandler).toBeCalledTimes(0)

    await userEvent.click(document.body)
    expect(clickHandler).toBeCalledTimes(1)
    expect(globalClickHandler).toBeCalledTimes(1)

    unIntercept()
  })
  it('unIntercept', async () => {
    const unIntercept = interceptEvent([
      async (_c, next) => {
        await next()
      },
    ])

    const button = document.createElement('button')
    button.textContent = 'click me'
    document.body.appendChild(button)
    const clickHandler = vi.fn()
    button.addEventListener('click', clickHandler)
    await userEvent.click(button)
    expect(clickHandler).toBeCalledTimes(1)

    button.removeEventListener('click', clickHandler)
    await userEvent.click(button)
    expect(clickHandler).toBeCalledTimes(1)

    button.addEventListener('click', clickHandler)
    await userEvent.click(button)
    expect(clickHandler).toBeCalledTimes(2)

    unIntercept()

    await userEvent.click(button)
    expect(clickHandler).toBeCalledTimes(3)

    button.removeEventListener('click', clickHandler)
    await userEvent.click(button)
    expect(clickHandler).toBeCalledTimes(3)
  })
  it('once listener', async () => {
    const wrappedListeners: NonNullable<
      InterceptEventOptions['wrappedListeners']
    > = []
    const unIntercept = interceptEvent(
      [
        async (_c, next) => {
          await next()
        },
      ],
      {
        wrappedListeners,
      },
    )

    const f = vi.fn(function mocked() {})
    document.addEventListener('load', f, { once: true })
    expect(wrappedListeners).length(1)
    document.dispatchEvent(new Event('load'))
    expect(wrappedListeners).length(0)
    document.dispatchEvent(new Event('load'))
    expect(wrappedListeners).length(0)
    document.removeEventListener('load', f)
    expect(f).toBeCalledTimes(1)

    unIntercept()
  })
  it('shadow DOM', async () => {
    const unIntercept = interceptEvent([
      (_c, next) => {
        return next()
      },
    ])

    const host = document.createElement('div')
    const shadow = host.attachShadow({ mode: 'open' })
    const button = document.createElement('button')
    button.textContent = 'click me'
    shadow.appendChild(button)
    document.body.appendChild(host)
    const clickHandler = vi.fn()
    button.addEventListener('click', clickHandler)
    await userEvent.click(button)
    expect(clickHandler).toBeCalledTimes(1)

    unIntercept()
    await userEvent.click(button)
    expect(clickHandler).toBeCalledTimes(2)
  })
})
