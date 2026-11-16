import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  applyCollectionValidators,
  ensureIndexes,
  WAHIS_OUTBREAKS_COLLECTION
} from '#/data/collections.js'
import { getDb } from '#/data/db.js'
import { loadWahisOutbreaks } from '#/scripts/load-wahis-outbreaks.js'
import { getWahisOutbreak } from '../../mocks/wahis-outbreak.js'

describe('load-wahis-outbreaks', () => {
  let db
  let dir

  beforeAll(async () => {
    db = getDb()
    await applyCollectionValidators(db)
    await ensureIndexes(db)
  })

  beforeEach(async () => {
    await db.collection(WAHIS_OUTBREAKS_COLLECTION).deleteMany({})
    dir = await mkdtemp(join(tmpdir(), 'wahis-load-'))
  })

  afterEach(async () => {
    await db.collection(WAHIS_OUTBREAKS_COLLECTION).deleteMany({})
    await rm(dir, { recursive: true, force: true })
  })

  /**
   * Write a record as the transform writes it: JSON, without `_id`.
   * @param {string} name - File name
   * @param {object} record - Record to write
   * @returns {Promise<string>} The file path
   */
  async function writeRecord(name, record) {
    const { _id, ...withoutId } = record
    const path = join(dir, name)
    await writeFile(path, JSON.stringify(withoutId))
    return path
  }

  test('stores a valid record in the collection', async () => {
    const path = await writeRecord('outbreak.json', getWahisOutbreak())

    const result = await loadWahisOutbreaks(db, [path])

    expect(result.loaded).toBe(1)
    expect(result.rejected).toEqual([])
    const stored = await db
      .collection(WAHIS_OUTBREAKS_COLLECTION)
      .find()
      .toArray()
    expect(stored).toHaveLength(1)
    expect(stored[0].source.outbreakId).toBe(198855)
  })

  test('rejects an invalid record and reports the field and rule', async () => {
    const invalid = getWahisOutbreak()
    invalid.geography.point.coordinates[1] = 91
    const path = await writeRecord('invalid.json', invalid)

    const result = await loadWahisOutbreaks(db, [path])

    expect(result.loaded).toBe(0)
    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]).toMatchObject({ file: path, outbreakId: 198855 })
    expect(result.rejected[0].errors.join(' ')).toMatch(/coordinates/)
    expect(
      await db.collection(WAHIS_OUTBREAKS_COLLECTION).countDocuments()
    ).toBe(0)
  })

  test('loading the same outbreak again replaces it rather than duplicating it', async () => {
    const path = await writeRecord('outbreak.json', getWahisOutbreak())
    await loadWahisOutbreaks(db, [path])

    const updated = getWahisOutbreak()
    updated.classification.note = 'reloaded'
    const updatedPath = await writeRecord('outbreak-updated.json', updated)
    const result = await loadWahisOutbreaks(db, [updatedPath])

    expect(result.loaded).toBe(1)
    const stored = await db
      .collection(WAHIS_OUTBREAKS_COLLECTION)
      .find()
      .toArray()
    expect(stored).toHaveLength(1)
    expect(stored[0].classification.note).toBe('reloaded')
  })
})
