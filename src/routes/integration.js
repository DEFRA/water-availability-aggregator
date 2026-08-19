export const integration = {
  method: 'GET',
  path: '/integration/status',
  handler: (_request, h) =>
    h.response({
      service: 'water-availability-aggregator',
      status: 'ok'
    })
}
