import { randomUUID } from 'node:crypto'

import diseaseRisksValidator from './schemas/disease-risks.schema.json' with { type: 'json' }

export const DISEASE_RISKS_COLLECTION = 'disease_risks'
const INGESTION_LOGS_COLLECTION = 'ingestion-logs'

const NAMESPACE_EXISTS = 48

// Reject invalid inserts and updates outright, including updates to documents
// that were stored before the validator existed
const VALIDATION_OPTIONS = {
  validationLevel: 'strict',
  validationAction: 'error'
}

const VALIDATED_COLLECTIONS = [
  { name: DISEASE_RISKS_COLLECTION, validator: diseaseRisksValidator }
]

/**
 * Create each validated collection with its `$jsonSchema` validator, or update
 * the validator on a collection that already exists. Safe to run on every
 * start up, and by more than one instance at once.
 *
 * `collMod` does not re-check documents already stored. Writers must clear a
 * collection with `deleteMany({})`, not `drop()`, which removes the validator.
 * @param {import('mongodb').Db} db - Connected database
 * @returns {Promise<void>}
 */
export async function applyCollectionValidators(db) {
  for (const { name, validator } of VALIDATED_COLLECTIONS) {
    try {
      await db.createCollection(name, { validator, ...VALIDATION_OPTIONS })
    } catch (e) {
      if (e.code !== NAMESPACE_EXISTS) {
        throw e
      }
      await db.command({ collMod: name, validator, ...VALIDATION_OPTIONS })
    }
  }
}

/**
 * Create indexes used to look up an existing disease risk record by its
 * disease code and (optional) strain.
 * @param {import('mongodb').Db} db - Connected database
 * @returns {Promise<void>}
 */
export async function ensureIndexes(db) {
  await db
    .collection(DISEASE_RISKS_COLLECTION)
    .createIndex({ 'disease.code': 1, strain: 1 })
}

/**
 * Insert or update the disease risk record for a disease/strain. The
 * previous `risk` is pushed onto `risk_history` before being replaced, so the
 * document always satisfies the `disease_risks` $jsonSchema validator.
 * @param {import('mongodb').Db} db - Connected database
 * @param {object} record - Extracted record: `disease`, optional `strain`,
 *   `status`, `previousStatus`, `levelChange`, `dateReported`
 * @param {string} source - Human readable source of the assessment
 * @returns {Promise<string>} The `_id` of the stored document
 */
export async function upsertDiseaseRisk(db, record, source) {
  const { disease, strain, status, previousStatus, levelChange, dateReported } =
    record
  const collection = db.collection(DISEASE_RISKS_COLLECTION)
  const filter = strain
    ? { 'disease.code': disease.code, strain }
    : { 'disease.code': disease.code, strain: { $exists: false } }

  const existing = await collection.findOne(filter)

  const risk = {
    status,
    previous_status: previousStatus ?? null,
    level_change: levelChange,
    source,
    date_reported: new Date(dateReported)
  }

  const doc = {
    _id: existing?._id ?? randomUUID(),
    disease,
    ...(strain ? { strain } : {}),
    risk,
    risk_history: existing ? [existing.risk, ...existing.risk_history] : []
  }

  await collection.replaceOne({ _id: doc._id }, doc, { upsert: true })

  return doc._id
}

/**
 * Record the start of an ingestion run.
 * @param {import('mongodb').Db} db - Connected database
 * @param {object} details - `bucket`, `key`, `modelId`, `region`
 * @returns {Promise<import('mongodb').ObjectId>} The new log's `_id`
 */
export async function createIngestionLog(db, { bucket, key, modelId, region }) {
  const { insertedId } = await db
    .collection(INGESTION_LOGS_COLLECTION)
    .insertOne({
      bucket,
      key,
      modelId,
      region,
      status: 'pending',
      startedAt: new Date()
    })
  return insertedId
}

/**
 * Record the outcome of an ingestion run.
 * @param {import('mongodb').Db} db - Connected database
 * @param {import('mongodb').ObjectId} logId - `_id` returned by `createIngestionLog`
 * @param {object} patch - Fields to set, e.g. `status`, `error`, `parsedRecordCount`
 * @returns {Promise<void>}
 */
export async function completeIngestionLog(db, logId, patch) {
  await db
    .collection(INGESTION_LOGS_COLLECTION)
    .updateOne({ _id: logId }, { $set: { ...patch, finishedAt: new Date() } })
}
