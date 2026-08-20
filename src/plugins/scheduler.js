import { config } from '#/config.js'

function trimTrailingSlashes(value) {
  let result = value
  while (result.endsWith('/')) {
    result = result.slice(0, -1)
  }
  return result
}

function backendPath(path) {
  const baseUrl = trimTrailingSlashes(config.get('backend.baseUrl'))
  return `${baseUrl}${path}`
}

function heartbeatHeaders() {
  const headers = {
    'content-type': 'application/json'
  }

  const heartbeatAuthToken = config.get('backend.heartbeatAuthToken')
  if (heartbeatAuthToken) {
    headers.authorization = `Bearer ${heartbeatAuthToken}`
  }

  return headers
}

export const scheduler = {
  plugin: {
    name: 'scheduler',
    register: async (server) => {
      const schedulerConfig = config.get('scheduler')

      if (!schedulerConfig.enabled) {
        server.logger.info('Scheduler disabled')
        return
      }

      let isRunning = false
      let timer = null

      const runHeartbeat = async () => {
        if (isRunning) {
          server.logger.warn(
            'Skipping scheduler heartbeat because previous run is still active'
          )
          return
        }

        isRunning = true
        try {
          const response = await fetch(backendPath('/integration/heartbeat'), {
            method: 'POST',
            headers: heartbeatHeaders(),
            body: JSON.stringify({ source: 'water-availability-aggregator' })
          })

          if (!response.ok) {
            throw new Error(
              `Heartbeat request failed with status ${response.status}`
            )
          }

          server.logger.info('Aggregator scheduler heartbeat executed')
        } catch (error) {
          server.logger.error(
            { err: error },
            'Aggregator scheduler heartbeat failed'
          )
        } finally {
          isRunning = false
        }
      }

      timer = setInterval(() => {
        runHeartbeat()
      }, schedulerConfig.intervalMs)

      timer.unref()
      server.logger.info(
        `Scheduler started with interval ${schedulerConfig.intervalMs}ms`
      )

      await runHeartbeat()

      server.ext('onPostStop', async () => {
        if (timer) {
          clearInterval(timer)
          timer = null
        }
      })
    }
  }
}
