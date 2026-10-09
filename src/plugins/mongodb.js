import { LockManager } from 'mongo-locks'

import { closeMongo, connectMongo, getClient } from '#/data/db.js'

const LOCKS_COLLECTION = 'mongo-locks'

export const mongoDb = {
  plugin: {
    name: 'mongodb',
    version: '1.0.0',
    register: async function (server, options) {
      server.logger.info('Setting up MongoDb')

      const db = await connectMongo(options)
      const locker = new LockManager(db.collection(LOCKS_COLLECTION))

      await db.collection(LOCKS_COLLECTION).createIndex({ id: 1 })

      server.logger.info(`MongoDb connected to ${db.databaseName}`)

      server.decorate('server', 'mongoClient', getClient())
      server.decorate('server', 'db', db)
      server.decorate('server', 'locker', locker)
      server.decorate('request', 'db', () => db, { apply: true })
      server.decorate('request', 'locker', () => locker, { apply: true })

      server.events.on('stop', async () => {
        server.logger.info('Closing Mongo client')
        try {
          await closeMongo()
        } catch (e) {
          server.logger.error(e, 'failed to close mongo client')
        }
      })
    }
  }
}
