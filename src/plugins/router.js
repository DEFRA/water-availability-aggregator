import { health } from '#/routes/health.js'
import { root } from '#/routes/root.js'
import { integration } from '#/routes/integration.js'
import { dataSources } from '#/routes/data-sources.js'

export const router = {
  plugin: {
    name: 'router',
    register: (server, _options) => {
      server.route([root, health, integration].concat(dataSources))
    }
  }
}
