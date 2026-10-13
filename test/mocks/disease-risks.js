import { BSON } from 'mongodb'

import diseaseRisksJson from './disease-risks.json' with { type: 'json' }

/**
 * Valid `disease_risks` documents, one per known disease. This is dummy
 * data, not real risk assessments.
 *
 * `disease-risks.json` holds the documents under `documents`, next to a
 * `_comment` that marks them as dummy data. They are Extended JSON so the dev
 * seed script (`ingestion/scripts/seed-dev.sh`) can load the same data. This
 * parses `{ "$date": ... }` into `Date` objects.
 * @returns {object[]} Fresh copies, safe to mutate
 */
export function getDiseaseRisks() {
  return BSON.EJSON.deserialize(diseaseRisksJson.documents)
}

/**
 * A single valid `disease_risks` document. Defaults to HPAI, which exercises
 * every schema field including optional ones.
 * @param {string} [code='HPAI'] - Disease code to retrieve
 * @returns {object|undefined} A fresh copy of the matching document
 */
export function getDiseaseRisk(code = 'HPAI') {
  return getDiseaseRisks().find(({ disease }) => disease.code === code)
}
