function normalizeBaseUrl(baseUrl) {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
}

function withTimeout(ms) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ms)

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId)
  }
}

async function fetchJson(url, timeoutMs) {
  const { signal, clear } = withTimeout(timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json'
      },
      signal
    })

    if (!response.ok) {
      throw new Error(
        `Request failed: ${response.status} ${response.statusText}`
      )
    }

    return await response.json()
  } finally {
    clear()
  }
}

function normalizeFeature(feature, index) {
  const geometryType = feature?.geometry?.type ?? null
  const properties = feature?.properties ?? {}

  return {
    id: feature?.id ?? `defra-feature-${index + 1}`,
    label:
      properties.name ??
      properties.title ??
      properties.waterbody_name ??
      properties.waterbodyName ??
      `defra-feature-${index + 1}`,
    source: 'defra',
    geometryType,
    properties
  }
}

function getCollectionId(collectionsPayload, configuredCollectionId) {
  if (configuredCollectionId) {
    return configuredCollectionId
  }

  const firstCollection = collectionsPayload?.collections?.[0]
  return firstCollection?.id ?? null
}

export async function fetchDefraSample(options) {
  const baseUrl = normalizeBaseUrl(options.baseUrl)
  const timeoutMs = options.timeoutMs
  const limit = options.limit
  const configuredCollectionId = options.collectionId

  const collectionsUrl = new URL(`${baseUrl}/collections`)
  collectionsUrl.searchParams.set('f', 'json')

  const collectionsPayload = await fetchJson(
    collectionsUrl.toString(),
    timeoutMs
  )
  const selectedCollectionId = getCollectionId(
    collectionsPayload,
    configuredCollectionId
  )

  if (!selectedCollectionId) {
    throw new Error('No Defra OGC collection found at configured endpoint')
  }

  const itemsUrl = new URL(
    `${baseUrl}/collections/${encodeURIComponent(selectedCollectionId)}/items`
  )
  itemsUrl.searchParams.set('f', 'json')
  itemsUrl.searchParams.set('limit', String(limit))

  const itemsPayload = await fetchJson(itemsUrl.toString(), timeoutMs)
  const features = Array.isArray(itemsPayload?.features)
    ? itemsPayload.features
    : []

  return {
    source: 'defra',
    connected: true,
    collectionId: selectedCollectionId,
    numberMatched: itemsPayload?.numberMatched ?? features.length,
    numberReturned: itemsPayload?.numberReturned ?? features.length,
    items: features.map((feature, index) => normalizeFeature(feature, index))
  }
}
