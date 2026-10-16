import { health } from '#/routes/health.js'
import {
  documentation,
  openApiSpec,
  swaggerAssets
} from '#/routes/documentation.js'
import { getRisk, listRisks } from '#/routes/risks.js'
import { getDisease, listDiseases } from '#/routes/diseases.js'

export const router = {
  plugin: {
    name: 'router',
    register: (server, _options) => {
      server.route([
        health,
        documentation,
        openApiSpec,
        swaggerAssets,
        listRisks,
        getRisk,
        listDiseases,
        getDisease
      ])
    }
  }
}
