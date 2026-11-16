import { ObjectId } from 'mongodb'

import example from './wahis-outbreak.example.json' with { type: 'json' }

/**
 * Return a valid WAHIS outbreak document as it is stored in MongoDB, with its
 * `_id`. Outbreak 198855 from the ingestion repo's sample.
 * @returns {object} A new copy on every call
 */
export function getWahisOutbreak() {
  return {
    _id: new ObjectId('6730a1f0c0ffee0000000001'),
    ...structuredClone(example)
  }
}
