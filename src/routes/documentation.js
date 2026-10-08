import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const openApiPath = path.resolve(__dirname, '../../docs/openapi/v1.yaml')
const swaggerUiDistPath = path.resolve(
  __dirname,
  '../../node_modules/swagger-ui-dist'
)

const swaggerHtml = `
<!DOCTYPE html>
<html>
  <head>
    <title>APHA Risk Insights Backend - OpenAPI Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="/documentation/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/documentation/swagger-ui-bundle.js"></script>
    <script src="/documentation/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = function() {
        window.ui = SwaggerUIBundle({
          url: "/documentation/openapi.yaml",
          dom_id: '#swagger-ui',
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          layout: "StandaloneLayout"
        })
      }
    </script>
  </body>
</html>
`.trim()

export const documentation = {
  method: 'GET',
  path: '/documentation',
  handler: (_request, h) => h.response(swaggerHtml).type('text/html')
}

export const openApiSpec = {
  method: 'GET',
  path: '/documentation/openapi.yaml',
  handler: (_request, h) =>
    h.file(openApiPath, { confine: false }).type('application/yaml')
}

export const swaggerAssets = {
  method: 'GET',
  path: '/documentation/{asset}',
  handler: (_request, h) => {
    const asset = _request.params.asset
    const allowedAssets = [
      'swagger-ui.css',
      'swagger-ui-bundle.js',
      'swagger-ui-standalone-preset.js'
    ]

    if (!allowedAssets.includes(asset)) {
      return h.response({ error: 'Not found' }).code(404)
    }

    const assetPath = path.join(swaggerUiDistPath, asset)
    const response = h.file(assetPath, { confine: false })

    if (asset.endsWith('.js')) {
      response.type('application/javascript')
    } else if (asset.endsWith('.css')) {
      response.type('text/css')
    }

    return response
  }
}
