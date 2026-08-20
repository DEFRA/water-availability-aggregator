export const root = {
  method: 'GET',
  path: '/',
  handler: (_request, h) =>
    h.response({
      service: 'water-availability-aggregator',
      status: 'ok',
      endpoints: [
        '/health',
        '/integration/status',
        '/integration/data-sources',
        '/integration/data-sources/sample'
      ]
    })
}
