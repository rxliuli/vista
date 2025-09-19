import { handleRequest } from '../context'
import { BaseMiddleware, Interceptor } from '../types'

export interface ClipboardContext {
  type: 'clipboard.writeText'
  text: string
}
export type ClipboardMiddleware = BaseMiddleware<ClipboardContext>

export const interceptClipboard: Interceptor<ClipboardMiddleware> = (
  middlewares,
): (() => void) => {
  const originalWriteText = navigator.clipboard.writeText
  navigator.clipboard.writeText = async function (text) {
    await handleRequest({ type: 'clipboard.writeText' as const, text }, [
      ...middlewares,
      (c) => originalWriteText.call(this, c.text),
    ])
  }
  return () => {
    navigator.clipboard.writeText = originalWriteText
  }
}
