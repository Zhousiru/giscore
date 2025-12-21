import { colors } from 'consola/utils'
import { createMiddleware } from 'hono/factory'

const formatDuration = (ms: number): string => {
  if (ms < 1) return `${Math.round(ms * 1000)}µs`
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export const logger = createMiddleware(async (c, next) => {
  const start = performance.now()
  await next()
  const duration = performance.now() - start
  const status = c.res.status

  const statusColor =
    status >= 500
      ? colors.red
      : status >= 400
        ? colors.yellow
        : status >= 300
          ? colors.cyan
          : colors.green

  console.log(
    `${new Date().toISOString()} ${statusColor(
      String(status),
    )} ${formatDuration(duration).padStart(8)} ${colors.cyan(
      c.req.method.padEnd(7),
    )} ${c.req.path}`,
  )
})
