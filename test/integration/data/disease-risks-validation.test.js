import { ObjectId } from 'mongodb'

import {
  applyCollectionValidators,
  DISEASE_RISKS_COLLECTION
} from '#/data/collections.js'
import { getDb } from '#/data/db.js'
import { clearCollections } from '../../helpers/mongo.js'
import { getDiseaseRisk, getDiseaseRisks } from '../../mocks/disease-risks.js'

const DOCUMENT_FAILED_VALIDATION = 121

/**
 * Return a valid document with the given mutation applied.
 * @param {(doc: object) => void} mutate - Mutates the document in place
 * @returns {object} The mutated document
 */
function buildDiseaseRisk(mutate) {
  const doc = getDiseaseRisk()
  mutate(doc)
  return doc
}

describe('disease_risks $jsonSchema validator', () => {
  let collection

  beforeAll(async () => {
    const db = getDb()
    await applyCollectionValidators(db)
    collection = db.collection(DISEASE_RISKS_COLLECTION)
  })

  beforeEach(async () => {
    await clearCollections()
  })

  afterEach(async () => {
    await clearCollections()
  })

  describe('accepts', () => {
    test('every mock document', async () => {
      const docs = getDiseaseRisks()

      await collection.insertMany(docs)

      const stored = await collection.find().sort({ _id: 1 }).toArray()
      const expected = [...docs].sort((a, b) => a._id.localeCompare(b._id))
      expect(stored).toEqual(expected)
    })

    test.each([
      ['no strain', (doc) => delete doc.strain],
      ['an empty risk_history', (doc) => (doc.risk_history = [])],
      ['a null previous_status', (doc) => (doc.risk.previous_status = null)],
      ['an upper case UUID', (doc) => (doc._id = doc._id.toUpperCase())]
    ])('a document with %s', async (_, mutate) => {
      const doc = buildDiseaseRisk(mutate)

      await expect(collection.insertOne(doc)).resolves.toMatchObject({
        acknowledged: true
      })
    })
  })

  describe('rejects', () => {
    test.each([
      ['_id is an ObjectId', (doc) => (doc._id = new ObjectId())],
      ['_id is not a UUID', (doc) => (doc._id = 'not-a-uuid')],
      ['disease is missing', (doc) => delete doc.disease],
      ['risk is missing', (doc) => delete doc.risk],
      ['risk_history is missing', (doc) => delete doc.risk_history],
      ['there is an unknown top-level field', (doc) => (doc.extra = 'x')],
      ['disease code is unknown', (doc) => (doc.disease.code = 'XYZ')],
      ['disease name is missing', (doc) => delete doc.disease.name],
      [
        'disease code and name do not match',
        (doc) => (doc.disease.name = 'Bluetongue')
      ],
      ['disease has an unknown field', (doc) => (doc.disease.extra = 'x')],
      ['strain is empty', (doc) => (doc.strain = '')],
      ['risk status is unknown', (doc) => (doc.risk.status = 'extreme')],
      [
        'risk previous_status is unknown',
        (doc) => (doc.risk.previous_status = 'extreme')
      ],
      [
        'risk previous_status is missing',
        (doc) => delete doc.risk.previous_status
      ],
      [
        'risk level_change is unknown',
        (doc) => (doc.risk.level_change = 'worse')
      ],
      ['risk source is empty', (doc) => (doc.risk.source = '')],
      [
        'risk date_reported is a string',
        (doc) => (doc.risk.date_reported = '2026-10-01')
      ],
      ['risk has an unknown field', (doc) => (doc.risk.extra = 'x')],
      ['risk_history is not an array', (doc) => (doc.risk_history = {})],
      [
        'a risk_history entry has an unknown status',
        (doc) => (doc.risk_history[0].status = 'extreme')
      ],
      [
        'a risk_history entry is missing date_reported',
        (doc) => delete doc.risk_history[0].date_reported
      ],
      [
        'a risk_history entry has an unknown field',
        (doc) => (doc.risk_history[0].extra = 'x')
      ]
    ])('a document where %s', async (_, mutate) => {
      const doc = buildDiseaseRisk(mutate)

      await expect(collection.insertOne(doc)).rejects.toMatchObject({
        name: 'MongoServerError',
        code: DOCUMENT_FAILED_VALIDATION
      })
      expect(await collection.countDocuments()).toBe(0)
    })

    test('an update that makes a stored document invalid', async () => {
      const doc = getDiseaseRisk()
      await collection.insertOne(doc)

      const update = collection.updateOne(
        { _id: doc._id },
        { $set: { 'risk.status': 'extreme' } }
      )

      await expect(update).rejects.toMatchObject({
        name: 'MongoServerError',
        code: DOCUMENT_FAILED_VALIDATION
      })
      expect(await collection.findOne({ _id: doc._id })).toEqual(doc)
    })
  })
})
