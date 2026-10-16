import { riskExtractionSchema } from './risk-extraction-schema.js'

const validRecord = {
  disease: { code: 'ASF' },
  status: 'medium',
  previousStatus: null,
  levelChange: 'undetermined',
  dateReported: '2026-01-15'
}

describe('#riskExtractionSchema', () => {
  test('accepts a minimal valid record', () => {
    const { error } = riskExtractionSchema.validate([validRecord])
    expect(error).toBeUndefined()
  })

  test('accepts an empty array', () => {
    const { error } = riskExtractionSchema.validate([])
    expect(error).toBeUndefined()
  })

  test('accepts an optional strain', () => {
    const { error } = riskExtractionSchema.validate([
      { ...validRecord, disease: { code: 'HPAI' }, strain: 'H5N1' }
    ])
    expect(error).toBeUndefined()
  })

  test('rejects an unknown disease code', () => {
    const { error } = riskExtractionSchema.validate([
      { ...validRecord, disease: { code: 'RABIES' } }
    ])
    expect(error).toBeDefined()
  })

  test('rejects an invalid status', () => {
    const { error } = riskExtractionSchema.validate([
      { ...validRecord, status: 'extreme' }
    ])
    expect(error).toBeDefined()
  })

  test('rejects a record missing the disease', () => {
    const { disease, ...rest } = validRecord
    const { error } = riskExtractionSchema.validate([rest])
    expect(error).toBeDefined()
  })
})
