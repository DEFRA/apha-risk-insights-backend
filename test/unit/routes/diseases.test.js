import { findDiseaseByCode, findDiseases } from '#/repos/disease-risks.js'
import { createServer } from '#/server.js'
import { getDiseaseRisk, getDiseaseRisks } from '../../mocks/disease-risks.js'

vi.mock('#/repos/disease-risks.js')
vi.mock('#/plugins/mongodb.js', () => ({
  mongoDb: { plugin: { name: 'mongodb', register: () => {} } }
}))

const PROBLEM_CONTENT_TYPE = 'application/problem+json'

describe('Disease routes', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /diseases', () => {
    test('returns the diseases from the repository', async () => {
      const diseases = getDiseaseRisks().map(({ disease }) => disease)
      vi.mocked(findDiseases).mockResolvedValue(diseases)

      const response = await server.inject({ method: 'GET', url: '/diseases' })

      expect(findDiseases).toHaveBeenCalledWith(undefined)
      expect(response.statusCode).toBe(200)
      expect(response.result).toEqual(diseases)
    })

    test('passes the search text to the repository', async () => {
      const { disease } = getDiseaseRisk('ASF')
      vi.mocked(findDiseases).mockResolvedValue([disease])

      const response = await server.inject({
        method: 'GET',
        url: '/diseases?q=swine'
      })

      expect(findDiseases).toHaveBeenCalledWith('swine')
      expect(response.result).toEqual([
        { code: 'ASF', name: 'African Swine Fever' }
      ])
    })

    test('returns an empty array when there are no diseases', async () => {
      vi.mocked(findDiseases).mockResolvedValue([])

      const response = await server.inject({ method: 'GET', url: '/diseases' })

      expect(response.statusCode).toBe(200)
      expect(response.result).toEqual([])
    })

    test.each([
      ['an empty search', 'q='],
      ['a search over 100 characters', `q=${'a'.repeat(101)}`],
      ['an unknown parameter', 'foo=bar']
    ])('returns 400 problem for %s', async (_, query) => {
      const response = await server.inject({
        method: 'GET',
        url: `/diseases?${query}`
      })

      expect(response.statusCode).toBe(400)
      expect(response.headers['content-type']).toContain(PROBLEM_CONTENT_TYPE)
      expect(findDiseases).not.toHaveBeenCalled()
    })
  })

  describe('GET /diseases/{diseaseCode}', () => {
    test('returns the disease', async () => {
      const { disease } = getDiseaseRisk('HPAI')
      vi.mocked(findDiseaseByCode).mockResolvedValue(disease)

      const response = await server.inject({
        method: 'GET',
        url: '/diseases/HPAI'
      })

      expect(findDiseaseByCode).toHaveBeenCalledWith('HPAI')
      expect(response.statusCode).toBe(200)
      expect(response.result).toEqual({
        code: 'HPAI',
        name: 'Highly Pathogenic Avian Influenza'
      })
    })

    test('returns 404 problem when no risk uses the disease', async () => {
      vi.mocked(findDiseaseByCode).mockResolvedValue(null)

      const response = await server.inject({
        method: 'GET',
        url: '/diseases/FMD'
      })

      expect(response.statusCode).toBe(404)
      expect(response.headers['content-type']).toContain(PROBLEM_CONTENT_TYPE)
      expect(response.result).toEqual({
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'Disease FMD not found',
        instance: '/diseases/FMD'
      })
    })

    test('returns 400 problem for an unknown disease code', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/diseases/XYZ'
      })

      expect(response.statusCode).toBe(400)
      expect(response.headers['content-type']).toContain(PROBLEM_CONTENT_TYPE)
      expect(findDiseaseByCode).not.toHaveBeenCalled()
    })
  })
})
