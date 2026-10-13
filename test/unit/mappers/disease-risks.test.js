import {
  toDisease,
  toRiskAssessment,
  toRiskDetail,
  toRiskSummary
} from '#/mappers/disease-risks.js'
import { getDiseaseRisk } from '../../mocks/disease-risks.js'

describe('disease risk mappers', () => {
  describe('toRiskAssessment', () => {
    test('maps a stored assessment to the API shape', () => {
      const { risk } = getDiseaseRisk('HPAI')

      expect(toRiskAssessment(risk)).toEqual({
        status: 'high',
        previousStatus: 'medium',
        levelChange: 'deteriorating',
        source: 'APHA risk assessment',
        dateReported: '2026-10-01T00:00:00.000Z'
      })
    })

    test('keeps a null previous status', () => {
      const { risk } = getDiseaseRisk('AHS')

      expect(toRiskAssessment(risk).previousStatus).toBeNull()
    })
  })

  describe('toDisease', () => {
    test('returns only the code and name', () => {
      expect(
        toDisease({ code: 'ASF', name: 'African Swine Fever', extra: true })
      ).toEqual({ code: 'ASF', name: 'African Swine Fever' })
    })
  })

  describe('toRiskSummary', () => {
    test('maps a document with a strain', () => {
      const doc = getDiseaseRisk('HPAI')

      expect(toRiskSummary(doc)).toEqual({
        id: 'df1c384e-8b04-4078-9177-087e47f3cec3',
        disease: { code: 'HPAI', name: 'Highly Pathogenic Avian Influenza' },
        strain: 'H5N1',
        risk: toRiskAssessment(doc.risk)
      })
    })

    test('omits strain when the document has none', () => {
      const summary = toRiskSummary(getDiseaseRisk('FMD'))

      expect(summary).not.toHaveProperty('strain')
    })

    test('does not include risk history', () => {
      const summary = toRiskSummary(getDiseaseRisk('FMD'))

      expect(summary).not.toHaveProperty('riskHistory')
    })
  })

  describe('toRiskDetail', () => {
    test('includes the summary fields and mapped risk history', () => {
      const doc = getDiseaseRisk('BTV')

      expect(toRiskDetail(doc)).toEqual({
        ...toRiskSummary(doc),
        riskHistory: doc.risk_history.map(toRiskAssessment)
      })
    })

    test('orders risk history by date reported, newest first', () => {
      const doc = getDiseaseRisk('HPAI')
      doc.risk_history.reverse()

      const dates = toRiskDetail(doc).riskHistory.map(
        ({ dateReported }) => dateReported
      )

      expect(dates).toEqual([
        '2026-06-15T00:00:00.000Z',
        '2026-01-09T00:00:00.000Z'
      ])
    })

    test('does not mutate the document risk history', () => {
      const doc = getDiseaseRisk('HPAI')
      doc.risk_history.reverse()
      const original = [...doc.risk_history]

      toRiskDetail(doc)

      expect(doc.risk_history).toEqual(original)
    })

    test('returns an empty history when there are no past assessments', () => {
      expect(toRiskDetail(getDiseaseRisk('AHS')).riskHistory).toEqual([])
    })
  })
})
