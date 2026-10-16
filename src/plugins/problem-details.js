const PROBLEM_CONTENT_TYPE = 'application/problem+json'
const SERVER_ERROR = 500

/**
 * Convert Boom error responses to RFC 9457 problem details, as described by
 * the `Problem` schema in the OpenAPI spec. Server error details are not
 * exposed to clients.
 * @param {import('@hapi/hapi').Request} request - Hapi request
 * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
 * @returns {symbol|import('@hapi/hapi').ResponseObject} The response
 */
export function toProblemResponse(request, h) {
  const { response } = request

  if (!response.isBoom) {
    return h.continue
  }

  const { statusCode, payload, headers } = response.output
  const problem = {
    type: 'about:blank',
    title: payload.error,
    status: statusCode,
    ...(statusCode < SERVER_ERROR && { detail: payload.message }),
    instance: request.path
  }

  const problemResponse = h
    .response(problem)
    .code(statusCode)
    .type(PROBLEM_CONTENT_TYPE)

  for (const [name, value] of Object.entries(headers)) {
    problemResponse.header(name, value)
  }

  return problemResponse
}

export const problemDetails = {
  plugin: {
    name: 'problem-details',
    register: (server) => {
      server.ext('onPreResponse', toProblemResponse)
    }
  }
}
