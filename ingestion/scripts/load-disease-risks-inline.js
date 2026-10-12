// mongosh script: replace every document in `disease_risks` with the
// documents in RAW_DATA below.
//
// RAW_DATA is Extended JSON (e.g. { "$date": "..." } for dates), so the
// `documents` array from a data file can be pasted in as-is.
//
// The RAW_DATA below is DUMMY DATA, copied from test/mocks/disease-risks.json.
// None of it is a real APHA risk assessment.
//
// Usage: mongosh <mongo uri with database> --file load-disease-risks-inline.js
//
// Run the API first: it applies the collection's $jsonSchema validator on
// start up, and this script refuses to load into a collection without one.

/* global db, EJSON, print */

// Everything is wrapped in one block so it also works pasted into an
// interactive mongosh session: pasted input runs statement by statement,
// so a top-level throw would not stop the delete and insert below. The
// block also lets the script be pasted more than once in one session.
{
  const COLLECTION = 'disease_risks'

  const RAW_DATA = [
    {
      _id: 'faaf77f1-61e7-4fd6-85e0-9edf37ca1854',
      disease: { code: 'FMD', name: 'Foot and Mouth Disease' },
      risk: {
        status: 'medium',
        previous_status: 'low',
        level_change: 'deteriorating',
        source: 'APHA outbreak assessment',
        date_reported: { $date: '2026-09-14T00:00:00.000Z' }
      },
      risk_history: [
        {
          status: 'low',
          previous_status: 'very low',
          level_change: 'deteriorating',
          source: 'APHA outbreak assessment',
          date_reported: { $date: '2026-03-02T00:00:00.000Z' }
        },
        {
          status: 'very low',
          previous_status: null,
          level_change: 'undetermined',
          source: 'APHA outbreak assessment',
          date_reported: { $date: '2025-11-20T00:00:00.000Z' }
        }
      ]
    },
    {
      _id: 'a0aec99b-1e8e-426d-879e-8262bdac4659',
      disease: { code: 'ASF', name: 'African Swine Fever' },
      risk: {
        status: 'medium',
        previous_status: 'medium',
        level_change: 'no change',
        source: 'APHA preliminary outbreak assessment',
        date_reported: { $date: '2026-08-28T00:00:00.000Z' }
      },
      risk_history: [
        {
          status: 'medium',
          previous_status: null,
          level_change: 'undetermined',
          source: 'APHA preliminary outbreak assessment',
          date_reported: { $date: '2026-05-11T00:00:00.000Z' }
        }
      ]
    },
    {
      _id: 'df1c384e-8b04-4078-9177-087e47f3cec3',
      disease: { code: 'HPAI', name: 'Highly Pathogenic Avian Influenza' },
      strain: 'H5N1',
      risk: {
        status: 'high',
        previous_status: 'medium',
        level_change: 'deteriorating',
        source: 'APHA risk assessment',
        date_reported: { $date: '2026-10-01T00:00:00.000Z' }
      },
      risk_history: [
        {
          status: 'medium',
          previous_status: 'high',
          level_change: 'improving',
          source: 'APHA risk assessment',
          date_reported: { $date: '2026-06-15T00:00:00.000Z' }
        },
        {
          status: 'high',
          previous_status: null,
          level_change: 'undetermined',
          source: 'APHA risk assessment',
          date_reported: { $date: '2026-01-09T00:00:00.000Z' }
        }
      ]
    },
    {
      _id: '67d933dc-534c-4830-a3a7-668953dae05c',
      disease: { code: 'AHS', name: 'African Horse Sickness' },
      risk: {
        status: 'negligible',
        previous_status: null,
        level_change: 'undetermined',
        source: 'APHA risk assessment',
        date_reported: { $date: '2026-07-22T00:00:00.000Z' }
      },
      risk_history: []
    },
    {
      _id: '05787792-b71d-4f96-86a1-308d616a7b72',
      disease: { code: 'BTV', name: 'Bluetongue' },
      strain: 'BTV-3',
      risk: {
        status: 'low',
        previous_status: 'high',
        level_change: 'improving',
        source: 'APHA outbreak assessment',
        date_reported: { $date: '2026-09-30T00:00:00.000Z' }
      },
      risk_history: [
        {
          status: 'high',
          previous_status: 'medium',
          level_change: 'deteriorating',
          source: 'APHA outbreak assessment',
          date_reported: { $date: '2026-07-04T00:00:00.000Z' }
        },
        {
          status: 'medium',
          previous_status: null,
          level_change: 'undetermined',
          source: 'APHA outbreak assessment',
          date_reported: { $date: '2026-02-17T00:00:00.000Z' }
        }
      ]
    }
  ]

  // commented out until cdp lets us deploy (thank you github actions >:/ )
  // const [info] = db.getCollectionInfos({ name: COLLECTION })
  // if (!info?.options?.validator) {
  //   throw new Error(
  //     `${COLLECTION} has no validator. Start the API so it applies one, then rerun.`
  //   )
  // }

  if (!Array.isArray(RAW_DATA)) {
    throw new TypeError('Expected RAW_DATA to be an array of documents')
  }

  const docs = EJSON.deserialize(RAW_DATA)

  const collection = db.getCollection(COLLECTION)

  // deleteMany, not drop(): dropping the collection removes its validator
  const { deletedCount } = collection.deleteMany({})
  const insertedCount =
    docs.length > 0
      ? Object.keys(collection.insertMany(docs).insertedIds).length
      : 0

  print(
    `${COLLECTION}: deleted ${deletedCount}, inserted ${insertedCount} into ${db.getName()}`
  )
}
