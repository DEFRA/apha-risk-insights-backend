import convict from 'convict'
import convictFormatWithValidator from 'convict-format-with-validator'

import { convictValidateMongoUri } from '#/common/helpers/convict/validate-mongo-uri.js'

convict.addFormat(convictValidateMongoUri)
convict.addFormats(convictFormatWithValidator)

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'

export const config = convict({
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  host: {
    doc: 'The IP address to bind',
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'HOST'
  },
  port: {
    doc: 'The port to bind',
    format: 'port',
    default: 3001,
    env: 'PORT'
  },
  serviceName: {
    doc: 'Api Service Name',
    format: String,
    default: 'apha-risk-insights-backend'
  },
  cdpEnvironment: {
    doc: 'The CDP environment the app is running in. With the addition of "local" for local development',
    format: [
      'local',
      'infra-dev',
      'management',
      'dev',
      'test',
      'perf-test',
      'ext-test',
      'prod'
    ],
    default: 'local',
    env: 'ENVIRONMENT'
  },
  log: {
    isEnabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: !isTest,
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in',
      format: ['ecs', 'pino-pretty'],
      default: isProduction ? 'ecs' : 'pino-pretty',
      env: 'LOG_FORMAT'
    },
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : ['req', 'res', 'responseTime']
    }
  },
  mongo: {
    mongoUrl: {
      doc: 'URI for mongodb',
      format: String,
      default: 'mongodb://127.0.0.1:27017/',
      env: 'MONGO_URI'
    },
    databaseName: {
      doc: 'database for mongodb',
      format: String,
      default: 'apha-risk-insights-backend',
      env: 'MONGO_DATABASE'
    },
    mongoOptions: {
      retryWrites: {
        doc: 'Enable Mongo write retries, overrides mongo URI when set.',
        format: Boolean,
        default: null,
        nullable: true,
        env: 'MONGO_RETRY_WRITES'
      },
      readPreference: {
        doc: 'Mongo read preference, overrides mongo URI when set.',
        format: [
          'primary',
          'primaryPreferred',
          'secondary',
          'secondaryPreferred',
          'nearest'
        ],
        default: null,
        nullable: true,
        env: 'MONGO_READ_PREFERENCE'
      }
    }
  },
  httpProxy: {
    doc: 'HTTP Proxy URL',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  },
  tracing: {
    header: {
      doc: 'CDP tracing header name',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
  },
  bedrock: {
    region: {
      doc: 'AWS region to invoke Bedrock in',
      format: String,
      default: 'us-east-1',
      env: 'AWS_REGION'
    },
    modelId: {
      doc: 'Bedrock model id used for risk extraction',
      format: String,
      default: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
      env: 'BEDROCK_MODEL_ID'
    },
    maxTokens: {
      doc: 'Max tokens requested from Bedrock for a single extraction call',
      format: 'nat',
      default: 4096,
      env: 'BEDROCK_MAX_TOKENS'
    },
    apiKey: {
      // Bearer token auth (an AWS Bedrock API key), not the pod's IAM role.
      // Prototype-only: set as a secret in the CDP Portal, never in cdp-app-config.
      doc: 'Bedrock API key (bearer token) used to authenticate InvokeModel calls',
      format: String,
      default: '',
      env: 'AWS_BEARER_TOKEN_BEDROCK'
    }
  },
  s3: {
    forcePathStyle: {
      doc: 'Force path-style S3 addressing. Needed for the local floci S3 emulator, which has no wildcard DNS for virtual-hosted-style bucket subdomains',
      format: Boolean,
      default: false,
      env: 'S3_FORCE_PATH_STYLE'
    }
  },
  ingestion: {
    promptPath: {
      doc: 'Path to the prompt template used for risk PDF extraction',
      format: String,
      default: './src/prompts/risk-extraction-prompt.txt',
      env: 'INGESTION_PROMPT_PATH'
    }
  }
})

config.validate({ allowed: 'strict' })
