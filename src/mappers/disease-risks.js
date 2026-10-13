/**
 * Map a stored risk assessment to the API `RiskAssessment` shape.
 * @param {object} assessment - `risk` or `risk_history` item from Mongo
 * @returns {object} The API risk assessment
 */
export function toRiskAssessment(assessment) {
  return {
    status: assessment.status,
    previousStatus: assessment.previous_status,
    levelChange: assessment.level_change,
    source: assessment.source,
    dateReported: assessment.date_reported.toISOString()
  }
}

/**
 * Map a stored disease to the API `Disease` shape.
 * @param {{ code: string, name: string }} disease - `disease` from Mongo
 * @returns {{ code: string, name: string }} The API disease
 */
export function toDisease({ code, name }) {
  return { code, name }
}

/**
 * Map a `disease_risks` document to the API `RiskSummary` shape.
 * @param {object} doc - `disease_risks` document
 * @returns {object} The API risk summary
 */
export function toRiskSummary(doc) {
  return {
    id: doc._id,
    disease: toDisease(doc.disease),
    ...(doc.strain && { strain: doc.strain }),
    risk: toRiskAssessment(doc.risk)
  }
}

/**
 * Map a `disease_risks` document to the API `RiskDetail` shape, with history
 * ordered by date reported, newest first.
 * @param {object} doc - `disease_risks` document
 * @returns {object} The API risk detail
 */
export function toRiskDetail(doc) {
  const riskHistory = [...doc.risk_history]
    .sort((a, b) => b.date_reported - a.date_reported)
    .map(toRiskAssessment)

  return { ...toRiskSummary(doc), riskHistory }
}
