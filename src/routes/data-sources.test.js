import { createServer } from '#/server.js'
import { config } from '#/config.js'

const initialConfig = structuredClone(config.getProperties())

describe('data source routes', () => {
  let server

  beforeEach(async () => {
    config.load(initialConfig)
    config.set('cdpEnvironment', 'local')
    server = await createServer()
  })

  afterEach(async () => {
    await server.stop()
    globalThis.fetchMock.resetMocks()
    config.load(initialConfig)
  })

  test('GET /integration/data-sources returns source metadata', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/integration/data-sources'
    })

    expect(response.statusCode).toBe(200)

    const payload = JSON.parse(response.payload)
    expect(payload.sources).toHaveLength(2)
    expect(payload.sources[0].key).toBe('defra')
    expect(payload.sources[1].key).toBe('rpa')
  })

  test('GET /integration/data-sources/sample?source=rpa returns stub parcels', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/integration/data-sources/sample?source=rpa&limit=2'
    })

    expect(response.statusCode).toBe(200)

    const payload = JSON.parse(response.payload)
    expect(payload.source).toBe('rpa-stub')
    expect(payload.connected).toBe(true)
    expect(payload.items).toHaveLength(2)
    expect(payload.items[0].properties.sbi).toBeDefined()
  })

  test('GET /integration/data-sources/sample?source=defra returns live sample payload', async () => {
    globalThis.fetchMock
      .mockResponseOnce(
        JSON.stringify({
          collections: [{ id: 'demo-collection' }]
        })
      )
      .mockResponseOnce(
        JSON.stringify({
          numberMatched: 1,
          numberReturned: 1,
          features: [
            {
              id: 'feature-1',
              geometry: { type: 'Polygon' },
              properties: { name: 'Demo feature' }
            }
          ]
        })
      )

    const response = await server.inject({
      method: 'GET',
      url: '/integration/data-sources/sample?source=defra&limit=1'
    })

    expect(response.statusCode).toBe(200)

    const payload = JSON.parse(response.payload)
    expect(payload.source).toBe('defra')
    expect(payload.connected).toBe(true)
    expect(payload.collectionId).toBe('demo-collection')
    expect(payload.items).toHaveLength(1)
    expect(payload.items[0].id).toBe('feature-1')
    expect(payload.items[0].label).toBe('Demo feature')
  })

  test('GET /integration/data-sources/sample?source=defra falls back to stubs on fetch failure', async () => {
    globalThis.fetchMock.mockRejectOnce(new Error('Network unavailable'))

    const response = await server.inject({
      method: 'GET',
      url: '/integration/data-sources/sample?source=defra&limit=2'
    })

    expect(response.statusCode).toBe(200)

    const payload = JSON.parse(response.payload)
    expect(payload.source).toBe('defra-stub-fallback')
    expect(payload.connected).toBe(false)
    expect(payload.items).toHaveLength(2)
  })

  test('GET /integration/data-sources/sample?source=rpa is unavailable outside local development', async () => {
    await server.stop()
    config.set('cdpEnvironment', 'dev')
    server = await createServer()

    const response = await server.inject({
      method: 'GET',
      url: '/integration/data-sources/sample?source=rpa'
    })

    expect(response.statusCode).toBe(404)
    expect(response.result).toEqual({
      error: 'RPA stub data is only available locally'
    })
  })
})
