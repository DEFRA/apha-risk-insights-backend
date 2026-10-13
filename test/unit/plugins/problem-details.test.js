import Boom from '@hapi/boom'

import { toProblemResponse } from '#/plugins/problem-details.js'

/**
 * A minimal Hapi response toolkit that records the response it builds.
 * @returns {object} The fake toolkit
 */
function createToolkit() {
  const response = {
    code: vi.fn().mockReturnThis(),
    type: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis()
  }
  return {
    continue: Symbol('continue'),
    response: vi.fn((payload) => Object.assign(response, { payload }))
  }
}

describe('#problemDetails', () => {
  test('leaves non-error responses unchanged', () => {
    const h = createToolkit()

    expect(toProblemResponse({ response: { isBoom: false } }, h)).toBe(
      h.continue
    )
  })

  test('copies Boom headers to the problem response', () => {
    const h = createToolkit()
    const error = Boom.unauthorized('Missing token', 'Bearer')

    const result = toProblemResponse({ response: error, path: '/risks' }, h)

    expect(result.payload).toEqual({
      type: 'about:blank',
      title: 'Unauthorized',
      status: 401,
      detail: 'Missing token',
      instance: '/risks'
    })
    expect(result.code).toHaveBeenCalledWith(401)
    expect(result.type).toHaveBeenCalledWith('application/problem+json')
    expect(result.header).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'Bearer error="Missing token"'
    )
  })
})
