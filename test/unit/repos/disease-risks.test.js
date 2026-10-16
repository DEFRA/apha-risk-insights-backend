import { buildRiskFilter } from '#/repos/disease-risks.js'

describe('disease risks repository', () => {
  describe('buildRiskFilter', () => {
    test('returns an empty filter when no filters are supplied', () => {
      expect(buildRiskFilter({})).toEqual({})
    })

    test('maps each filter to its document field', () => {
      expect(
        buildRiskFilter({
          diseaseCode: 'ASF',
          status: 'high',
          strain: 'Genotype II',
          levelChange: 'deteriorating',
          source: 'APHA risk assessment'
        })
      ).toEqual({
        'disease.code': 'ASF',
        'risk.status': 'high',
        strain: 'Genotype II',
        'risk.level_change': 'deteriorating',
        'risk.source': 'APHA risk assessment'
      })
    })

    test('matches q case-insensitively against disease code and name', () => {
      expect(buildRiskFilter({ q: 'swine' })).toEqual({
        $or: [
          { 'disease.code': { $regex: 'swine', $options: 'i' } },
          { 'disease.name': { $regex: 'swine', $options: 'i' } }
        ]
      })
    })

    test('escapes regex characters in q', () => {
      const filter = buildRiskFilter({ q: 'a.b*(c)' })

      expect(filter.$or[0]['disease.code'].$regex).toBe('a\\.b\\*\\(c\\)')
    })
  })
})
