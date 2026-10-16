import { createRequire } from 'node:module'

// pdf-parse@1.1.1 runs its own self-test (reading a sample file relative to
// the cwd) whenever it detects no parent module, which is how it looks when
// loaded via a plain ESM `import` in a Node ESM interop context. Loading it
// through `createRequire` instead gives it a real CJS parent, avoiding that.
const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

export async function extractText(buffer) {
  const { text } = await pdfParse(buffer)
  return text
}
