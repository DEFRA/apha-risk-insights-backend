import { parseArgs } from 'node:util'

import { S3Client } from '@aws-sdk/client-s3'
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'

import { config } from '#/config.js'
import { createLogger } from '#/common/helpers/logging/logger.js'
import { connectMongo } from '#/data/db.js'
import {
  applyCollectionValidators,
  ensureIndexes,
  upsertDiseaseRisk,
  createIngestionLog,
  completeIngestionLog
} from '#/data/collections.js'
import { DISEASE_NAMES } from '#/common/schemas/risk-extraction-schema.js'
import { buildPrompt } from '#/common/helpers/build-prompt.js'
import { downloadObject } from '#/services/s3-document.js'
import { extractText } from '#/services/pdf-text-extractor.js'
import { extractRiskData } from '#/services/bedrock-risk-extractor.js'

const logger = createLogger()

function parseCliArgs(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      bucket: { type: 'string' },
      key: { type: 'string' },
      'model-id': { type: 'string' },
      region: { type: 'string' }
    }
  })

  if (!values.bucket || !values.key) {
    throw new Error(
      'Usage: ingest-risk-pdf --bucket <bucket> --key <key> [--model-id <id>] [--region <region>]'
    )
  }

  return {
    bucket: values.bucket,
    key: values.key,
    modelId: values['model-id'] ?? config.get('bedrock.modelId'),
    region: values.region ?? config.get('bedrock.region')
  }
}

export async function ingestRiskPdf({ bucket, key, modelId, region }) {
  const db = await connectMongo()
  const source = `s3://${bucket}/${key}`
  const logId = await createIngestionLog(db, { bucket, key, modelId, region })

  try {
    await applyCollectionValidators(db)
    await ensureIndexes(db)

    const apiKey = config.get('bedrock.apiKey')
    if (!apiKey) {
      throw new Error(
        'AWS_BEARER_TOKEN_BEDROCK is not set (Bedrock API key required)'
      )
    }

    const s3Client = new S3Client({
      region,
      forcePathStyle: config.get('s3.forcePathStyle')
    })
    // AWS Bedrock API key (token identity), not the pod's IAM role/credential chain
    const bedrockClient = new BedrockRuntimeClient({
      region,
      token: { token: apiKey }
    })

    const pdfBuffer = await downloadObject(s3Client, bucket, key)
    const documentText = await extractText(pdfBuffer)
    const prompt = await buildPrompt(
      config.get('ingestion.promptPath'),
      documentText
    )

    const { records, rawResponseText } = await extractRiskData(bedrockClient, {
      modelId,
      maxTokens: config.get('bedrock.maxTokens'),
      prompt
    })

    for (const record of records) {
      await upsertDiseaseRisk(
        db,
        {
          ...record,
          disease: {
            code: record.disease.code,
            name: DISEASE_NAMES[record.disease.code]
          }
        },
        source
      )
    }

    await completeIngestionLog(db, logId, {
      status: 'success',
      pdfTextLength: documentText.length,
      rawLlmResponse: rawResponseText,
      parsedRecordCount: records.length
    })

    logger.info(`Ingested ${records.length} risk record(s) from ${source}`)

    return records
  } catch (error) {
    await completeIngestionLog(db, logId, {
      status: 'failed',
      error: error.message
    })
    logger.error(error, `Failed to ingest ${source}`)
    throw error
  }
}

if (process.argv[1] === import.meta.filename) {
  const { closeMongo } = await import('#/data/db.js')
  try {
    const args = parseCliArgs(process.argv.slice(2))
    await ingestRiskPdf(args)
  } catch {
    process.exitCode = 1
  } finally {
    await closeMongo()
  }
}
