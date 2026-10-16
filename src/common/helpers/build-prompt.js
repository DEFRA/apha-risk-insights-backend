import { readFile } from 'node:fs/promises'

const DOCUMENT_TEXT_PLACEHOLDER = '{{DOCUMENT_TEXT}}'

export async function buildPrompt(promptPath, documentText) {
  const template = await readFile(promptPath, 'utf8')
  return template.replaceAll(DOCUMENT_TEXT_PLACEHOLDER, documentText)
}
