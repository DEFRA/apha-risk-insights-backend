import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

import { ObjectId } from 'mongodb'

import { createLogger } from '#/common/helpers/logging/logger.js'
import {
  applyCollectionValidators,
  ensureIndexes,
  WAHIS_OUTBREAKS_COLLECTION
} from '#/data/collections.js'
import { closeMongo, connectMongo } from '#/data/db.js'

const logger = createLogger()

// MongoDB's error code when a document fails the collection's $jsonSchema
const DOCUMENT_FAILED_VALIDATION = 121

/**
 * List the JSON files at each path. A directory is searched recursively.
 * @param {string[]} paths - Files and directories
 * @returns {Promise<string[]>} Sorted file paths
 */
async function listJsonFiles(paths) {
  const files = []
  for (const path of paths) {
    if ((await stat(path)).isDirectory()) {
      const entries = await readdir(path, { recursive: true })
      files.push(
        ...entries
          .filter((entry) => entry.endsWith('.json'))
          .map((entry) => join(path, entry))
      )
    } else {
      files.push(path)
    }
  }
  return files.sort()
}

/**
 * Turn the rule tree in a validation error into one message per broken rule,
 * such as "geography.point.coordinates.1 (maximum): comparison failed".
 * @param {object[]} nodes - Entries from MongoDB's `errInfo.details`
 * @param {string[]} [path] - Property names and array positions above these nodes
 * @returns {string[]} One message per broken rule
 */
function describeRules(nodes = [], path = []) {
  return nodes.flatMap((node) => {
    if (node.schemaRulesNotSatisfied) {
      return describeRules(node.schemaRulesNotSatisfied, path)
    }
    if (node.propertiesNotSatisfied) {
      return node.propertiesNotSatisfied.flatMap((property) =>
        describeRules(property.details, [...path, property.propertyName])
      )
    }
    if (node.itemIndex !== undefined) {
      const index = node.itemIndex.low ?? node.itemIndex
      return describeRules(node.details, [...path, String(index)])
    }
    if (node.missingProperties) {
      return node.missingProperties.map(
        (name) => `${[...path, name].join('.')}: is required`
      )
    }
    if (node.details) {
      return describeRules(node.details, path)
    }
    const where = path.join('.') || 'document'
    return [`${where} (${node.operatorName}): ${node.reason ?? 'failed'}`]
  })
}

/**
 * Store one record, replacing the stored record for the same outbreak.
 * @param {import('mongodb').Collection} collection - WAHIS outbreaks collection
 * @param {string} file - Path to a JSON record, as the transform writes it
 * @returns {Promise<{ rejected?: object }>} The rejection, if the record failed
 *   the collection's validator
 */
async function loadFile(collection, file) {
  const record = JSON.parse(await readFile(file, 'utf8'))
  const outbreakId = record.source.outbreakId
  const existing = await collection.findOne(
    { 'source.outbreakId': outbreakId },
    { projection: { _id: 1 } }
  )
  const doc = { ...record, _id: existing?._id ?? new ObjectId() }

  try {
    await collection.replaceOne({ _id: doc._id }, doc, { upsert: true })
    return {}
  } catch (error) {
    if (error.code !== DOCUMENT_FAILED_VALIDATION) {
      throw error
    }
    return {
      rejected: {
        file,
        outbreakId,
        errors: describeRules([error.errInfo?.details])
      }
    }
  }
}

/**
 * Store WAHIS outbreak records from JSON files. MongoDB checks each record
 * against the collection's `$jsonSchema` and rejects any that fail, so a
 * rejected record is reported and nothing is stored for it.
 * @param {import('mongodb').Db} db - Connected database
 * @param {string[]} paths - JSON files and/or directories of them
 * @returns {Promise<{ loaded: number, rejected: object[] }>} Counts, and one
 *   entry per rejected file with its errors
 */
export async function loadWahisOutbreaks(db, paths) {
  const collection = db.collection(WAHIS_OUTBREAKS_COLLECTION)
  const result = { loaded: 0, rejected: [] }

  for (const file of await listJsonFiles(paths)) {
    const outcome = await loadFile(collection, file)
    if (outcome.rejected) {
      result.rejected.push(outcome.rejected)
    } else {
      result.loaded++
    }
  }

  return result
}

if (process.argv[1] === import.meta.filename) {
  try {
    const { positionals } = parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true
    })
    if (positionals.length === 0) {
      throw new Error('Usage: load:wahis -- <file or directory>...')
    }

    const db = await connectMongo()
    await applyCollectionValidators(db)
    await ensureIndexes(db)
    const { loaded, rejected } = await loadWahisOutbreaks(db, positionals)

    for (const { file, outbreakId, errors } of rejected) {
      logger.error({ file, outbreakId, errors }, 'Rejected WAHIS outbreak')
    }
    logger.info(
      `Loaded ${loaded} WAHIS outbreak(s), rejected ${rejected.length}`
    )
    if (rejected.length > 0) {
      process.exitCode = 1
    }
  } catch (error) {
    logger.error(error, 'Failed to load WAHIS outbreaks')
    process.exitCode = 1
  } finally {
    await closeMongo()
  }
}
