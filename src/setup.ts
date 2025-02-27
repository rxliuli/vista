import { serve, ServerType } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { streamSSE } from 'hono/streaming'
import { detectPort, waitPort } from 'detect-port'
import type { TestProject } from 'vitest/node'

let server: ServerType

declare module 'vitest' {
  export interface ProvidedContext {
    serverUrl: string
  }
}

export async function setup(project: TestProject) {
  const port = await detectPort(3000)
  const app = new Hono()
    .use(cors())
    .get('/todos/1', (c) =>
      c.json({
        userId: 1,
        id: 1,
        title: 'delectus aut autem',
        completed: false,
      }),
    )
    .get('/wait', async (c) => {
      const timeout = c.req.query('timeout')
      if (!timeout) {
        return c.text('ok')
      }
      await new Promise((resolve) => setTimeout(resolve, Number(timeout)))
      return c.text('ok')
    })
    .get('/empty', () => {
      return new Response(null, {
        status: 204,
      })
    })
    .get('/sse', (c) => {
      const count = Number(c.req.query('count'))
      const sleep = c.req.query('sleep') ? Number(c.req.query('sleep')) : 10
      return streamSSE(c, async (stream) => {
        let id = 0
        while (id < count) {
          const message = `It is ${new Date().toISOString()}`
          await stream.writeSSE({
            data: message,
            event: 'time-update',
            id: String(id++),
          })
          await stream.sleep(sleep)
        }
      })
    })

  project.provide('serverUrl', `http://localhost:${port}`)
  server = serve({ ...app, port }, (info) => {
    // console.log(`server listening on http://localhost:${info.port}`)
  })
}

export async function teardown() {
  await new Promise((resolve) => server.close(resolve))
}
