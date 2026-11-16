import { ObjectId } from 'mongodb'

import {
  applyCollectionValidators,
  ensureIndexes,
  WAHIS_OUTBREAKS_COLLECTION
} from '#/data/collections.js'
import { getDb } from '#/data/db.js'
import { getWahisOutbreak } from '../../mocks/wahis-outbreak.js'

const DOCUMENT_FAILED_VALIDATION = 121
const DUPLICATE_KEY = 11000

describe('wahis_outbreaks $jsonSchema validator', () => {
  let collection

  beforeAll(async () => {
    const db = getDb()
    await applyCollectionValidators(db)
    await ensureIndexes(db)
    collection = db.collection(WAHIS_OUTBREAKS_COLLECTION)
  })

  beforeEach(async () => {
    await collection.deleteMany({})
  })

  afterEach(async () => {
    await collection.deleteMany({})
  })

  test('accepts the sample outbreak', async () => {
    await expect(
      collection.insertOne(getWahisOutbreak())
    ).resolves.toMatchObject({ acknowledged: true })
  })

  describe('rejects', () => {
    test.each([
      ['_id is not an ObjectId', (doc) => (doc._id = 'not-an-object-id')],
      ['source is missing', (doc) => delete doc.source],
      ['there is an unknown top-level field', (doc) => (doc.extra = 'x')],
      [
        'latitude is above 90',
        (doc) => (doc.geography.point.coordinates[1] = 91)
      ],
      [
        'coordinates has a third value',
        (doc) => doc.geography.point.coordinates.push(0)
      ],
      [
        'a species count is a string',
        (doc) => (doc.species[0].totals.cases = 'many')
      ]
    ])('a document where %s', async (_, mutate) => {
      const doc = getWahisOutbreak()
      mutate(doc)

      await expect(collection.insertOne(doc)).rejects.toMatchObject({
        code: DOCUMENT_FAILED_VALIDATION
      })
    })

    test('a second document for the same outbreak', async () => {
      await collection.insertOne(getWahisOutbreak())
      const duplicate = getWahisOutbreak()
      duplicate._id = new ObjectId()

      await expect(collection.insertOne(duplicate)).rejects.toMatchObject({
        code: DUPLICATE_KEY
      })
    })
  })
})
