import { extractRiskData } from './bedrock-risk-extractor.js'

const validRecord = {
  disease: { code: 'ASF' },
  status: 'medium',
  previousStatus: null,
  levelChange: 'undetermined',
  dateReported: '2026-01-15'
}

function encodeResponse(payload) {
  return new TextEncoder().encode(JSON.stringify(payload))
}

describe('#extractRiskData', () => {
  test('parses and validates a well formed Bedrock response', async () => {
    const bedrockClient = {
      send: vi.fn().mockResolvedValue({
        body: encodeResponse({
          content: [{ text: JSON.stringify([validRecord]) }]
        })
      })
    }

    const { records, rawResponseText } = await extractRiskData(bedrockClient, {
      modelId: 'test-model',
      maxTokens: 100,
      prompt: 'prompt text'
    })

    expect(records).toHaveLength(1)
    expect(records[0].disease.code).toBe(validRecord.disease.code)
    expect(rawResponseText).toContain(validRecord.disease.code)
    expect(bedrockClient.send).toHaveBeenCalledTimes(1)
  })

  test('skips leading thinking blocks that have no text field', async () => {
    const bedrockClient = {
      send: vi.fn().mockResolvedValue({
        body: encodeResponse({
          content: [
            { type: 'thinking', thinking: 'reasoning...' },
            { type: 'text', text: JSON.stringify([validRecord]) }
          ]
        })
      })
    }

    const { records } = await extractRiskData(bedrockClient, {
      modelId: 'test-model',
      maxTokens: 100,
      prompt: 'prompt text'
    })

    expect(records).toHaveLength(1)
    expect(records[0].disease.code).toBe(validRecord.disease.code)
  })

  test('strips markdown code fences before parsing', async () => {
    const fenced = '```json\n' + JSON.stringify([validRecord]) + '\n```'
    const bedrockClient = {
      send: vi.fn().mockResolvedValue({
        body: encodeResponse({ content: [{ text: fenced }] })
      })
    }

    const { records } = await extractRiskData(bedrockClient, {
      modelId: 'test-model',
      maxTokens: 100,
      prompt: 'prompt text'
    })

    expect(records).toHaveLength(1)
  })

  test('throws when the response is not valid JSON', async () => {
    const bedrockClient = {
      send: vi.fn().mockResolvedValue({
        body: encodeResponse({ content: [{ text: 'not json' }] })
      })
    }

    await expect(
      extractRiskData(bedrockClient, {
        modelId: 'm',
        maxTokens: 10,
        prompt: 'p'
      })
    ).rejects.toThrow('not valid JSON')
  })

  test('throws when the response fails schema validation', async () => {
    const bedrockClient = {
      send: vi.fn().mockResolvedValue({
        body: encodeResponse({
          content: [{ text: JSON.stringify([{ disease: { code: 'RABIES' } }]) }]
        })
      })
    }

    await expect(
      extractRiskData(bedrockClient, {
        modelId: 'm',
        maxTokens: 10,
        prompt: 'p'
      })
    ).rejects.toThrow('failed schema validation')
  })
})
