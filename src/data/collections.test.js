describe('#data/collections', () => {
  let db
  let applyCollectionValidators
  let ensureIndexes
  let upsertDiseaseRisk
  let createIngestionLog
  let completeIngestionLog

  beforeAll(async () => {
    const { getDb } = await import('#/data/db.js')
    ;({
      applyCollectionValidators,
      ensureIndexes,
      upsertDiseaseRisk,
      createIngestionLog,
      completeIngestionLog
    } = await import('./collections.js'))

    db = getDb()
    await applyCollectionValidators(db)
    await ensureIndexes(db)
  })

  afterEach(async () => {
    await db.collection('disease_risks').deleteMany({})
    await db.collection('ingestion-logs').deleteMany({})
  })

  describe('upsertDiseaseRisk', () => {
    const record = {
      disease: { code: 'ASF', name: 'African Swine Fever' },
      status: 'medium',
      previousStatus: null,
      levelChange: 'undetermined',
      dateReported: '2026-01-15'
    }

    test('inserts a new disease risk record', async () => {
      await upsertDiseaseRisk(db, record, 's3://bucket/key')

      const stored = await db
        .collection('disease_risks')
        .findOne({ 'disease.code': 'ASF' })

      expect(stored.disease.name).toBe('African Swine Fever')
      expect(stored.risk.status).toBe('medium')
      expect(stored.risk.source).toBe('s3://bucket/key')
      expect(stored.risk_history).toEqual([])
    })

    test('is idempotent and tracks history on repeated upserts', async () => {
      await upsertDiseaseRisk(db, record, 's3://bucket/key1')
      await upsertDiseaseRisk(
        db,
        {
          ...record,
          status: 'high',
          previousStatus: 'medium',
          levelChange: 'deteriorating'
        },
        's3://bucket/key2'
      )

      const count = await db
        .collection('disease_risks')
        .countDocuments({ 'disease.code': 'ASF' })
      expect(count).toBe(1)

      const stored = await db
        .collection('disease_risks')
        .findOne({ 'disease.code': 'ASF' })
      expect(stored.risk.status).toBe('high')
      expect(stored.risk_history).toHaveLength(1)
      expect(stored.risk_history[0].status).toBe('medium')
    })

    test('keeps strain-specific records separate', async () => {
      const disease = { code: 'HPAI', name: 'Highly Pathogenic Avian Influenza' }

      await upsertDiseaseRisk(
        db,
        { ...record, disease, strain: 'H5N1' },
        'source-a'
      )
      await upsertDiseaseRisk(
        db,
        { ...record, disease, strain: 'H5N8' },
        'source-b'
      )

      const count = await db
        .collection('disease_risks')
        .countDocuments({ 'disease.code': 'HPAI' })
      expect(count).toBe(2)
    })
  })

  describe('ingestion logs', () => {
    test('creates a pending log then completes it', async () => {
      const logId = await createIngestionLog(db, {
        bucket: 'b',
        key: 'k',
        modelId: 'm',
        region: 'eu-west-2'
      })

      let stored = await db.collection('ingestion-logs').findOne({ _id: logId })
      expect(stored.status).toBe('pending')

      await completeIngestionLog(db, logId, {
        status: 'success',
        parsedRecordCount: 2
      })

      stored = await db.collection('ingestion-logs').findOne({ _id: logId })
      expect(stored.status).toBe('success')
      expect(stored.parsedRecordCount).toBe(2)
      expect(stored.finishedAt).toBeInstanceOf(Date)
    })
  })
})
