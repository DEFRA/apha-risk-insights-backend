import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { buildPrompt } from './build-prompt.js'

const fixturePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/prompt-fixture.txt'
)

describe('#buildPrompt', () => {
  test('replaces the document text placeholder with the supplied text', async () => {
    const result = await buildPrompt(fixturePath, 'some extracted text')
    expect(result.trim()).toBe('Hello some extracted text world')
  })
})
