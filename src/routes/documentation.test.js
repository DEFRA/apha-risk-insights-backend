import { createServer } from '#/server.js'

describe('Documentation routes', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /documentation', () => {
    test('returns Swagger UI HTML', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/documentation'
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toContain('text/html')
      expect(response.payload).toContain('swagger-ui')
      expect(response.payload).toContain('APHA Risk Insights Backend')
    })
  })

  describe('GET /documentation/openapi.yaml', () => {
    test('returns the OpenAPI YAML spec', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/documentation/openapi.yaml'
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toContain('application/yaml')
      expect(response.payload).toContain('title: APHA Risk Insights Backend')
    })
  })

  describe('GET /documentation/{asset}', () => {
    test('returns swagger-ui.css', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/documentation/swagger-ui.css'
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toContain('text/css')
    })

    test('returns swagger-ui-bundle.js', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/documentation/swagger-ui-bundle.js'
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toContain('javascript')
    })

    test('returns swagger-ui-standalone-preset.js', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/documentation/swagger-ui-standalone-preset.js'
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toContain('javascript')
    })

    test('returns 404 for unknown assets', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/documentation/unknown.js'
      })

      expect(response.statusCode).toBe(404)
    })
  })
})
