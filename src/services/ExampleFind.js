const EXAMPLE_COLLECTION = 'example-data'
const WITHOUT_MONGO_ID = { projection: { _id: 0 } }

export function findAllExampleData(db) {
  return db.collection(EXAMPLE_COLLECTION).find({}, WITHOUT_MONGO_ID).toArray()
}

export function findExampleData(db, id) {
  return db
    .collection(EXAMPLE_COLLECTION)
    .findOne({ exampleId: id }, WITHOUT_MONGO_ID)
}
