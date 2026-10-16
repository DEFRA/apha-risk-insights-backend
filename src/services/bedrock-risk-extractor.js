import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

import { riskExtractionSchema } from '#/common/schemas/risk-extraction-schema.js'

const CODE_FENCE_PATTERN = /^```(?:json)?\s*([\s\S]*?)\s*```$/

function stripCodeFence(text) {
  const match = CODE_FENCE_PATTERN.exec(text.trim())
  return match ? match[1] : text.trim()
}

export async function extractRiskData(bedrockClient, { modelId, maxTokens, prompt }) {
  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const response = await bedrockClient.send(command)
  const responseBody = JSON.parse(Buffer.from(response.body).toString('utf8'))
  // Some models prepend "thinking" content blocks (no `text` field) before the
  // actual text response, so find the text block rather than assuming index 0.
  const textBlock = responseBody.content?.find(
    (block) => typeof block.text === 'string'
  )
  const rawResponseText = textBlock?.text ?? ''

  let records
  try {
    records = JSON.parse(stripCodeFence(rawResponseText))
  } catch (error) {
    throw new Error(`Bedrock response was not valid JSON: ${error.message}`)
  }

  const { error, value } = riskExtractionSchema.validate(records, {
    abortEarly: false
  })
  if (error) {
    throw new Error(`Bedrock response failed schema validation: ${error.message}`)
  }

  return { records: value, rawResponseText }
}
