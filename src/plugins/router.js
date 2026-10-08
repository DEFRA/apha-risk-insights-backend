import { health } from '#/routes/health.js'
import { example } from '#/routes/example.js'
import {
  documentation,
  openApiSpec,
  swaggerAssets
} from '#/routes/documentation.js'

export const router = {
  plugin: {
    name: 'router',
    register: (server, _options) => {
      server.route(
        [health, documentation, openApiSpec, swaggerAssets].concat(example)
      )
    }
  }
}
