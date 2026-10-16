import {
  applyCollectionValidators,
  DISEASE_RISKS_COLLECTION
} from '#/data/collections.js'
import { getDb } from '#/data/db.js'
import {
  findDiseaseByCode,
  findDiseases,
  findRiskById,
  findRisks
} from '#/repos/disease-risks.js'
import { clearCollections } from '../../helpers/mongo.js'
import { getDiseaseRisk, getDiseaseRisks } from '../../mocks/disease-risks.js'

const ALL_PAGES = { page: 1, pageSize: 200 }

describe('disease risks repository against Mongo', () => {
  beforeAll(async () => {
    const db = getDb()
    await applyCollectionValidators(db)
    await clearCollections()
    await db.collection(DISEASE_RISKS_COLLECTION).insertMany(getDiseaseRisks())
  })

  afterAll(async () => {
    await clearCollections()
  })

  describe('findRisks', () => {
    test('orders by disease code without risk history', async () => {
      const { documents, totalItems } = await findRisks({}, ALL_PAGES)

      expect(totalItems).toBe(5)
      expect(documents.map(({ disease }) => disease.code)).toEqual([
        'AHS',
        'ASF',
        'BTV',
        'FMD',
        'HPAI'
      ])
      expect(documents[0]).not.toHaveProperty('risk_history')
    })

    test('combines filters using AND', async () => {
      const { documents } = await findRisks(
        { status: 'medium', levelChange: 'deteriorating' },
        ALL_PAGES
      )

      expect(documents.map(({ disease }) => disease.code)).toEqual(['FMD'])
    })

    test('matches q case-insensitively against code or name', async () => {
      const byName = await findRisks({ q: 'SWINE' }, ALL_PAGES)
      const byCode = await findRisks({ q: 'hpa' }, ALL_PAGES)

      expect(byName.documents.map(({ disease }) => disease.code)).toEqual([
        'ASF'
      ])
      expect(byCode.documents.map(({ disease }) => disease.code)).toEqual([
        'HPAI'
      ])
    })

    test('returns the requested page and the total count', async () => {
      const { documents, totalItems } = await findRisks(
        {},
        { page: 2, pageSize: 2 }
      )

      expect(totalItems).toBe(5)
      expect(documents.map(({ disease }) => disease.code)).toEqual([
        'BTV',
        'FMD'
      ])
    })
  })

  describe('findRiskById', () => {
    test('returns the full document', async () => {
      const expected = getDiseaseRisk('HPAI')

      expect(await findRiskById(expected._id)).toEqual(expected)
    })
  })

  describe('findDiseases', () => {
    test('returns distinct diseases ordered by code', async () => {
      expect(await findDiseases()).toEqual([
        { code: 'AHS', name: 'African Horse Sickness' },
        { code: 'ASF', name: 'African Swine Fever' },
        { code: 'BTV', name: 'Bluetongue' },
        { code: 'FMD', name: 'Foot and Mouth Disease' },
        { code: 'HPAI', name: 'Highly Pathogenic Avian Influenza' }
      ])
    })

    test('filters by q', async () => {
      expect(await findDiseases('african')).toEqual([
        { code: 'AHS', name: 'African Horse Sickness' },
        { code: 'ASF', name: 'African Swine Fever' }
      ])
    })
  })

  describe('findDiseaseByCode', () => {
    test('returns the disease', async () => {
      expect(await findDiseaseByCode('BTV')).toEqual({
        code: 'BTV',
        name: 'Bluetongue'
      })
    })
  })
})
