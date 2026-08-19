import { config } from '#/config.js'
import { scheduler } from './scheduler.js'

const initialConfig = structuredClone(config.getProperties())

function createPluginServer() {
  return {
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    },
    ext: vi.fn()
  }
}

describe('scheduler plugin', () => {
  beforeEach(() => {
    config.load(initialConfig)
    globalThis.fetchMock.resetMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    config.load(initialConfig)
  })

  test('does not schedule a heartbeat when disabled', async () => {
    const server = createPluginServer()
    config.set('scheduler.enabled', false)

    await scheduler.plugin.register(server)

    expect(globalThis.fetchMock).not.toHaveBeenCalled()
    expect(server.ext).not.toHaveBeenCalled()
    expect(server.logger.info).toHaveBeenCalledWith('Scheduler disabled')
  })

  test('sends an authenticated heartbeat and clears its timer during shutdown', async () => {
    const server = createPluginServer()
    config.set('scheduler.enabled', true)
    config.set('scheduler.intervalMs', 1000)
    config.set('backend.baseUrl', 'https://backend.example/')
    config.set('backend.heartbeatAuthToken', 'test-token')
    globalThis.fetchMock.mockResponse(JSON.stringify({ accepted: true }), {
      status: 200
    })

    await scheduler.plugin.register(server)

    expect(globalThis.fetchMock).toHaveBeenCalledWith(
      'https://backend.example/integration/heartbeat',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer test-token'
        },
        body: JSON.stringify({ source: 'water-availability-aggregator' })
      })
    )

    const shutdownHandler = server.ext.mock.calls[0][1]
    await shutdownHandler()

    await vi.advanceTimersByTimeAsync(1000)
    expect(globalThis.fetchMock).toHaveBeenCalledTimes(1)
  })

  test('logs failed heartbeat responses', async () => {
    const server = createPluginServer()
    config.set('scheduler.enabled', true)
    globalThis.fetchMock.mockResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 401
      }
    )

    await scheduler.plugin.register(server)

    expect(server.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'Aggregator scheduler heartbeat failed'
    )
  })

  test('skips an interval when the previous heartbeat is still running', async () => {
    const server = createPluginServer()
    config.set('scheduler.enabled', true)
    config.set('scheduler.intervalMs', 1000)
    globalThis.fetchMock
      .mockResponseOnce(JSON.stringify({ accepted: true }), { status: 200 })
      .mockImplementationOnce(
        () =>
          new Promise(() => {
            // Keep the scheduled request in flight to exercise overlap protection.
          })
      )

    await scheduler.plugin.register(server)
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(1000)

    expect(server.logger.warn).toHaveBeenCalledWith(
      'Skipping scheduler heartbeat because previous run is still active'
    )
  })
})
