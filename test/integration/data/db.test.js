import { Db, MongoClient } from 'mongodb'

import { config } from '#/config.js'
import { closeMongo, connectMongo, getClient, getDb } from '#/data/db.js'
import { clearCollections } from '../../helpers/mongo.js'

const TEST_COLLECTION = 'db-helper-test'

describe('#data/db', () => {
  afterEach(async () => {
    await connectMongo()
    await clearCollections()
  })

  test('getDb returns the configured database', () => {
    expect(getDb()).toBeInstanceOf(Db)
    expect(getDb().databaseName).toBe(config.get('mongo.databaseName'))
  })

  test('getClient returns a connected client', async () => {
    expect(getClient()).toBeInstanceOf(MongoClient)
    await expect(getDb().command({ ping: 1 })).resolves.toMatchObject({
      ok: 1
    })
  })

  test('connectMongo reuses the existing client', async () => {
    const client = getClient()
    await connectMongo()
    expect(getClient()).toBe(client)
  })

  test('concurrent connectMongo calls share one client', async () => {
    await closeMongo()
    const connectSpy = vi.spyOn(MongoClient, 'connect')

    try {
      await Promise.all([connectMongo(), connectMongo()])
      expect(connectSpy).toHaveBeenCalledTimes(1)
    } finally {
      connectSpy.mockRestore()
    }
  })

  test('connectMongo can be retried after a failed connect', async () => {
    await closeMongo()
    const connectSpy = vi
      .spyOn(MongoClient, 'connect')
      .mockRejectedValueOnce(new Error('connect failed'))

    try {
      await expect(connectMongo()).rejects.toThrow('connect failed')
      expect(() => getClient()).toThrow('MongoDB client not connected')

      await connectMongo()
      expect(getClient()).toBeInstanceOf(MongoClient)
    } finally {
      connectSpy.mockRestore()
    }
  })

  test('closeMongo waits for an in-flight connect and closes it', async () => {
    await closeMongo()

    const connecting = connectMongo()
    await closeMongo()
    await connecting

    expect(() => getClient()).toThrow('MongoDB client not connected')
  })

  test('writes and reads a document', async () => {
    await getDb().collection(TEST_COLLECTION).insertOne({ id: 'abc' })

    const doc = await getDb()
      .collection(TEST_COLLECTION)
      .findOne({ id: 'abc' }, { projection: { _id: 0 } })

    expect(doc).toEqual({ id: 'abc' })
  })

  test('getClient and getDb throw after closeMongo', async () => {
    await closeMongo()

    expect(() => getClient()).toThrow('MongoDB client not connected')
    expect(() => getDb()).toThrow('MongoDB client not connected')
  })

  test('clearCollections empties seeded collections', async () => {
    await getDb()
      .collection(TEST_COLLECTION)
      .insertMany([{ id: 1 }, { id: 2 }])

    await clearCollections()

    expect(await getDb().collection(TEST_COLLECTION).countDocuments()).toBe(0)
  })
})
