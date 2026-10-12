import diseaseRisksValidator from './schemas/disease-risks.schema.json' with { type: 'json' }

export const DISEASE_RISKS_COLLECTION = 'disease_risks'

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
