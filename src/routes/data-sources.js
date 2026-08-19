import { config } from '#/config.js'
import { fetchDefraSample } from '#/common/data-sources/defra-ogc.js'
import { getRpaParcelStub } from '#/common/data-sources/rpa-stub.js'

function parseLimit(rawLimit) {
  const parsed = Number.parseInt(rawLimit ?? '5', 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 5
  }

  return Math.min(parsed, 50)
}

function defraFallback(limit, errorMessage) {
  const fallbackItems = [
    {
      id: 'defra-stub-1',
      label: 'Stub waterbody 1',
      source: 'defra-stub',
      geometryType: 'Polygon',
      properties: {
        reason: 'Defra endpoint unavailable during dev test run',
        fallback: true
      }
    },
    {
      id: 'defra-stub-2',
      label: 'Stub waterbody 2',
      source: 'defra-stub',
      geometryType: 'Polygon',
      properties: {
        reason: 'Defra endpoint unavailable during dev test run',
        fallback: true
      }
    }
  ].slice(0, limit)

  return {
    source: 'defra-stub-fallback',
    connected: false,
    warning: errorMessage,
    items: fallbackItems
  }
}

function isLocalEnvironment() {
  return config.get('cdpEnvironment') === 'local'
}

export const dataSources = [
  {
    method: 'GET',
    path: '/integration/data-sources',
    handler: (_request, h) => {
      const defraBaseUrl = config.get('dataSources.defra.baseUrl')
      const defraDefaultCollectionId = config.get(
        'dataSources.defra.defaultCollectionId'
      )

      return h.response({
        sources: [
          {
            key: 'defra',
            type: 'live-ogc-features',
            baseUrl: defraBaseUrl,
            defaultCollectionId: defraDefaultCollectionId,
            route: '/integration/data-sources/sample?source=defra&limit=5'
          },
          {
            key: 'rpa',
            type: 'stub',
            route: '/integration/data-sources/sample?source=rpa&limit=5'
          }
        ]
      })
    }
  },
  {
    method: 'GET',
    path: '/integration/data-sources/sample',
    handler: async (request, h) => {
      const source = String(request.query.source ?? 'defra').toLowerCase()
      const limit = parseLimit(request.query.limit)

      if (source === 'rpa') {
        if (!isLocalEnvironment()) {
          return h
            .response({ error: 'RPA stub data is only available locally' })
            .code(404)
        }

        return h.response({
          source: 'rpa-stub',
          connected: true,
          items: getRpaParcelStub(limit)
        })
      }

      if (source !== 'defra') {
        return h
          .response({
            error: `Unsupported source: ${source}. Expected one of: defra, rpa`
          })
          .code(400)
      }

      try {
        const payload = await fetchDefraSample({
          baseUrl: config.get('dataSources.defra.baseUrl'),
          timeoutMs: config.get('dataSources.defra.timeoutMs'),
          collectionId:
            request.query.collectionId ??
            config.get('dataSources.defra.defaultCollectionId'),
          limit
        })

        return h.response(payload)
      } catch (error) {
        request.logger.error({ err: error }, 'Defra sample fetch failed')

        if (config.get('dataSources.stub.fallbackEnabled')) {
          return h.response(defraFallback(limit, error.message))
        }

        return h
          .response({
            source: 'defra',
            connected: false,
            error: error.message
          })
          .code(502)
      }
    }
  }
]
