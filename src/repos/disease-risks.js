import { DISEASE_RISKS_COLLECTION } from '#/data/collections.js'
import { getDb } from '#/data/db.js'

const RISK_SORT = { 'disease.code': 1, _id: 1 }

function diseaseRisks() {
  return getDb().collection(DISEASE_RISKS_COLLECTION)
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Build a filter that matches a case-insensitive substring of the disease
 * code or disease name.
 * @param {string} q - Search text
 * @returns {object} Mongo filter
 */
function diseaseSearchFilter(q) {
  const pattern = { $regex: escapeRegex(q), $options: 'i' }
  return { $or: [{ 'disease.code': pattern }, { 'disease.name': pattern }] }
}

/**
 * Build a Mongo filter from the list risks query parameters. All filters are
 * combined using AND.
 * @param {object} filters - Validated query parameters
 * @returns {object} Mongo filter
 */
export function buildRiskFilter({
  diseaseCode,
  status,
  strain,
  levelChange,
  source,
  q
}) {
  return {
    ...(diseaseCode && { 'disease.code': diseaseCode }),
    ...(status && { 'risk.status': status }),
    ...(strain && { strain }),
    ...(levelChange && { 'risk.level_change': levelChange }),
    ...(source && { 'risk.source': source }),
    ...(q && diseaseSearchFilter(q))
  }
}

/**
 * Find a page of current disease risks, ordered by disease code then ID.
 * @param {object} filters - Validated query parameters
 * @param {{ page: number, pageSize: number }} paging - Page to return
 * @returns {Promise<{ documents: object[], totalItems: number }>} Matching documents and total count
 */
export async function findRisks(filters, { page, pageSize }) {
  const filter = buildRiskFilter(filters)
  const collection = diseaseRisks()

  const [documents, totalItems] = await Promise.all([
    collection
      .find(filter, { projection: { risk_history: 0 } })
      .sort(RISK_SORT)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    collection.countDocuments(filter)
  ])

  return { documents, totalItems }
}

/**
 * Find one disease risk by ID.
 * @param {string} riskId - UUID of the disease risk
 * @returns {Promise<object|null>} The document, or null when not found
 */
export function findRiskById(riskId) {
  return diseaseRisks().findOne({ _id: riskId })
}

/**
 * Find the distinct diseases used by disease risks, ordered by code.
 * @param {string} [q] - Optional case-insensitive search text
 * @returns {Promise<{ code: string, name: string }[]>} Distinct diseases
 */
export function findDiseases(q) {
  return diseaseRisks()
    .aggregate([
      { $match: q ? diseaseSearchFilter(q) : {} },
      { $group: { _id: { code: '$disease.code', name: '$disease.name' } } },
      { $replaceRoot: { newRoot: '$_id' } },
      { $sort: { code: 1 } }
    ])
    .toArray()
}

/**
 * Find a disease used by disease risks.
 * @param {string} diseaseCode - Disease code
 * @returns {Promise<{ code: string, name: string }|null>} The disease, or null when not found
 */
export async function findDiseaseByCode(diseaseCode) {
  const doc = await diseaseRisks().findOne(
    { 'disease.code': diseaseCode },
    { projection: { _id: 0, disease: 1 } }
  )
  return doc?.disease ?? null
}
