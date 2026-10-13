// mongosh script: replace every document in `disease_risks` with the
// documents in an Extended JSON file.
//
// The file holds an object with the documents under `documents`. Any other
// keys, such as `_comment`, are ignored.
//
// Usage: DATA_FILE=<path> mongosh <mongo uri with database> --file load-disease-risks.js
//
// Run the API first: it applies the collection's $jsonSchema validator on
// start up, and this script refuses to load into a collection without one.

/* global db, EJSON, print */

const fs = require('node:fs')

const COLLECTION = 'disease_risks'

const dataFile = process.env.DATA_FILE
if (!dataFile) {
  throw new Error('Set DATA_FILE to the Extended JSON file to load')
}

const [info] = db.getCollectionInfos({ name: COLLECTION })
if (!info?.options?.validator) {
  throw new Error(
    `${COLLECTION} has no validator. Start the API so it applies one, then rerun.`
  )
}

const { documents: docs } = EJSON.parse(fs.readFileSync(dataFile, 'utf8'))
if (!Array.isArray(docs)) {
  throw new TypeError(`Expected a "documents" array in ${dataFile}`)
}

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
