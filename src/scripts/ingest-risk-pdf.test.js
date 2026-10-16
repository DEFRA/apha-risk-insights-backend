const validRecord = {
  disease: { code: 'ASF' },
  status: 'medium',
  previousStatus: null,
  levelChange: 'undetermined',
  dateReported: '2026-01-15'
}

vi.mock('#/services/s3-document.js', () => ({
  downloadObject: vi.fn().mockResolvedValue(Buffer.from('pdf-bytes'))
}))

vi.mock('#/services/pdf-text-extractor.js', () => ({
  extractText: vi.fn().mockResolvedValue('extracted document text')
}))

vi.mock('#/services/bedrock-risk-extractor.js', () => ({
  extractRiskData: vi.fn().mockResolvedValue({
    records: [validRecord],
    rawResponseText: JSON.stringify([validRecord])
  })
}))

describe('#ingestRiskPdf', () => {
  let db
  let ingestRiskPdf

  beforeAll(async () => {
    const { getDb } = await import('#/data/db.js')
    db = getDb()
    ;({ ingestRiskPdf } = await import('./ingest-risk-pdf.js'))
  })

  afterEach(async () => {
    await db.collection('disease_risks').deleteMany({})
    await db.collection('ingestion-logs').deleteMany({})
  })

  test('downloads, extracts, validates and stores risk records', async () => {
    const records = await ingestRiskPdf({
      bucket: 'my-bucket',
      key: 'reports/idm.pdf',
      modelId: 'test-model',
      region: 'eu-west-2'
    })

    expect(records).toHaveLength(1)

    const stored = await db
      .collection('disease_risks')
      .findOne({ 'disease.code': 'ASF' })
    expect(stored.disease.name).toBe('African Swine Fever')
    expect(stored.risk.status).toBe('medium')
    expect(stored.risk.source).toBe('s3://my-bucket/reports/idm.pdf')

    const log = await db
      .collection('ingestion-logs')
      .findOne({ bucket: 'my-bucket', key: 'reports/idm.pdf' })
    expect(log.status).toBe('success')
    expect(log.parsedRecordCount).toBe(1)
  })
})
