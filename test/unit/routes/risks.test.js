import { toRiskDetail, toRiskSummary } from '#/mappers/disease-risks.js'
import { findRiskById, findRisks } from '#/repos/disease-risks.js'
import { createServer } from '#/server.js'
import { getDiseaseRisk, getDiseaseRisks } from '../../mocks/disease-risks.js'

vi.mock('#/repos/disease-risks.js')
vi.mock('#/plugins/mongodb.js', () => ({
  mongoDb: { plugin: { name: 'mongodb', register: () => {} } }
}))

const PROBLEM_CONTENT_TYPE = 'application/problem+json'

describe('Risk routes', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /risks', () => {
    test('returns a page of risk summaries', async () => {
      const documents = getDiseaseRisks()
      vi.mocked(findRisks).mockResolvedValue({
        documents,
        totalItems: documents.length
      })

      const response = await server.inject({ method: 'GET', url: '/risks' })

      expect(response.statusCode).toBe(200)
      expect(response.result).toEqual({
        items: documents.map(toRiskSummary),
        page: 1,
        pageSize: 50,
        totalItems: 5,
        totalPages: 1
      })
    })

    test('applies default paging', async () => {
      vi.mocked(findRisks).mockResolvedValue({ documents: [], totalItems: 0 })

      await server.inject({ method: 'GET', url: '/risks' })

      expect(findRisks).toHaveBeenCalledWith({}, { page: 1, pageSize: 50 })
    })

    test('passes filters and paging to the repository', async () => {
      vi.mocked(findRisks).mockResolvedValue({ documents: [], totalItems: 0 })

      await server.inject({
        method: 'GET',
        url: '/risks?diseaseCode=ASF&status=very%20low&strain=Genotype%20II&levelChange=no%20change&source=APHA&q=swine&page=2&pageSize=10'
      })

      expect(findRisks).toHaveBeenCalledWith(
        {
          diseaseCode: 'ASF',
          status: 'very low',
          strain: 'Genotype II',
          levelChange: 'no change',
          source: 'APHA',
          q: 'swine'
        },
        { page: 2, pageSize: 10 }
      )
    })

    test.each([
      [0, 0],
      [1, 1],
      [10, 1],
      [11, 2]
    ])('%i items with page size 10 gives %i pages', async (total, pages) => {
      vi.mocked(findRisks).mockResolvedValue({
        documents: [],
        totalItems: total
      })

      const response = await server.inject({
        method: 'GET',
        url: '/risks?pageSize=10'
      })

      expect(response.result.totalPages).toBe(pages)
    })

    test.each([
      ['an unknown disease code', 'diseaseCode=XYZ'],
      ['an unknown status', 'status=severe'],
      ['an unknown level change', 'levelChange=worse'],
      ['an empty search', 'q='],
      ['a search over 100 characters', `q=${'a'.repeat(101)}`],
      ['a strain over 200 characters', `strain=${'a'.repeat(201)}`],
      ['a source over 500 characters', `source=${'a'.repeat(501)}`],
      ['page 0', 'page=0'],
      ['a non-integer page', 'page=1.5'],
      ['page size 0', 'pageSize=0'],
      ['page size over 200', 'pageSize=201'],
      ['an unknown parameter', 'foo=bar']
    ])('returns 400 problem for %s', async (_, query) => {
      const response = await server.inject({
        method: 'GET',
        url: `/risks?${query}`
      })

      expect(response.statusCode).toBe(400)
      expect(response.headers['content-type']).toContain(PROBLEM_CONTENT_TYPE)
      expect(response.result).toMatchObject({
        type: 'about:blank',
        title: 'Bad Request',
        status: 400,
        instance: '/risks'
      })
      expect(findRisks).not.toHaveBeenCalled()
    })

    test('returns 500 problem without details when the repository fails', async () => {
      vi.mocked(findRisks).mockRejectedValue(new Error('connection lost'))

      const response = await server.inject({ method: 'GET', url: '/risks' })

      expect(response.statusCode).toBe(500)
      expect(response.headers['content-type']).toContain(PROBLEM_CONTENT_TYPE)
      expect(response.result).toEqual({
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        instance: '/risks'
      })
    })
  })

  describe('GET /risks/{riskId}', () => {
    test('returns the risk detail with history', async () => {
      const document = getDiseaseRisk('HPAI')
      vi.mocked(findRiskById).mockResolvedValue(document)

      const response = await server.inject({
        method: 'GET',
        url: `/risks/${document._id}`
      })

      expect(findRiskById).toHaveBeenCalledWith(document._id)
      expect(response.statusCode).toBe(200)
      expect(response.result).toEqual(toRiskDetail(document))
    })

    test('returns 404 problem when the risk does not exist', async () => {
      const riskId = '80d1d0e4-381f-4a68-887b-fd5c5556943d'
      vi.mocked(findRiskById).mockResolvedValue(null)

      const response = await server.inject({
        method: 'GET',
        url: `/risks/${riskId}`
      })

      expect(response.statusCode).toBe(404)
      expect(response.headers['content-type']).toContain(PROBLEM_CONTENT_TYPE)
      expect(response.result).toEqual({
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: `Risk ${riskId} not found`,
        instance: `/risks/${riskId}`
      })
    })

    test.each([
      ['not a UUID', 'not-a-uuid'],
      ['a UUID in braces', '%7B80d1d0e4-381f-4a68-887b-fd5c5556943d%7D']
    ])('returns 400 problem when the risk ID is %s', async (_, riskId) => {
      const response = await server.inject({
        method: 'GET',
        url: `/risks/${riskId}`
      })

      expect(response.statusCode).toBe(400)
      expect(response.headers['content-type']).toContain(PROBLEM_CONTENT_TYPE)
      expect(findRiskById).not.toHaveBeenCalled()
    })
  })
})
