import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pdfParsePath = require.resolve('pdf-parse')
const pdfParseMock = vi.fn().mockResolvedValue({ text: 'extracted text' })

let extractText

// extractText loads pdf-parse via createRequire, not an ESM import, so
// vi.mock can't intercept it. Stub the shared CJS module cache instead,
// before dynamically importing the module under test.
beforeAll(async () => {
  require.cache[pdfParsePath] = { id: pdfParsePath, exports: pdfParseMock }
  ;({ extractText } = await import('./pdf-text-extractor.js'))
})

afterAll(() => {
  delete require.cache[pdfParsePath]
})

describe('#extractText', () => {
  test('returns the text extracted from the PDF buffer', async () => {
    const result = await extractText(Buffer.from('fake-pdf'))
    expect(result).toBe('extracted text')
  })
})
