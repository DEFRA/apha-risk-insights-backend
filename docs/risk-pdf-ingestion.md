# Running the risk PDF ingestion locally

This is a step-by-step guide for running `npm run ingest:risk-pdf` on your own machine, including
the practical gotchas that aren't obvious from the command itself. See the
[README's "Risk PDF ingestion" section](../README.md#risk-pdf-ingestion) for the short version and
links to the related ADRs.

## Prerequisites

- Node.js (see `engines` in `package.json`) and `npm install` already run.
- The local Docker Compose stack running: `npm run docker:up:d` (starts MongoDB and Floci, the
  local S3/AWS emulator).
- A `.env` file in the repo root containing a Bedrock API key:
  ```
  AWS_BEARER_TOKEN_BEDROCK=<your key>
  ```
  Never commit this file — it's gitignored.

## Running from your host machine (not inside Docker)

The ingestion script is written to run inside the app's Docker container, where `MONGO_URI` and
AWS settings are already configured. Running it directly from your Windows host (e.g. from an IDE
terminal) instead needs a few environment variables set first, because none of the compose
defaults (`mongodb://mongodb:27017/`, Floci's internal network alias) resolve from outside Docker:

```powershell
$env:AWS_ACCESS_KEY_ID="test"
$env:AWS_SECRET_ACCESS_KEY="test"
$env:AWS_ENDPOINT_URL_S3="http://localhost:4566"
$env:S3_FORCE_PATH_STYLE="true"
$env:MONGO_URI="mongodb://localhost:27017/"

npm run ingest:risk-pdf -- --bucket apha-risk-insights-local-uploads --key <your-file>.pdf
```

**Important:** use `AWS_ENDPOINT_URL_S3`, not the generic `AWS_ENDPOINT_URL`. The generic variable
redirects _every_ AWS SDK client to Floci, including the Bedrock client — which then gets Floci's
stub response (`"Floci stub response"`) instead of a real LLM reply. `AWS_ENDPOINT_URL_S3` scopes
the override to S3 only, leaving Bedrock calls going to the real AWS endpoint.

## Uploading a PDF to the local S3 bucket

Floci auto-creates an `apha-risk-insights-local-uploads` bucket on startup. If you don't have the
AWS CLI installed, upload with a short Node script instead (this repo already has
`@aws-sdk/client-s3` as a dependency):

```javascript
// upload.mjs - delete after use
import { readFile } from 'node:fs/promises'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const client = new S3Client({
  region: 'eu-west-2',
  endpoint: 'http://localhost:4566',
  forcePathStyle: true,
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
})

await client.send(
  new PutObjectCommand({
    Bucket: 'apha-risk-insights-local-uploads',
    Key: '<your-file>.pdf',
    Body: await readFile('C:/path/to/your-file.pdf')
  })
)
```

Run it with `node upload.mjs`, then delete the script — it's just a one-off helper, not part of the
project.

## Bedrock API key errors

Amazon Bedrock API keys come in two types, and they fail differently:

| Error message                                                   | Likely cause                                                                                                                                                                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `... has expired`                                               | A short-term key (lasts up to 12 hours). Generate a new one.                                                                                                                                                                          |
| `Authentication failed: Please make sure your API Key is valid` | The key is malformed, revoked, or — for a **long-term** key — its auto-created IAM user doesn't have a Bedrock policy attached yet. Check via Bedrock console > API keys > Long-term API keys > select key > "Manage in IAM Console". |
| `Credential should be scoped to a valid region`                 | The key was generated with the console set to a different AWS region than `bedrock.region` in `src/config.js` (`eu-west-2` by default). Switch region in the console before generating.                                               |

Short-term keys are simpler to debug (they inherit your own console session's permissions), so
prefer them for quick local testing.

## "Bedrock response was not valid JSON" — two different causes

This error can mean two unrelated things:

1. **The model refused to answer.** Check `stop_reason` on the raw response — `'refusal'` with
   `output_tokens: 0` means Claude declined to process the document's content, most likely because
   the file deliberately uses garbled/obfuscated text. This isn't a bug; try a more naturally
   worded document.
2. **The real answer is in a later content block.** Some models (including `anthropic.claude-sonnet-5`)
   return a `thinking` content block before the actual text response. `bedrock-risk-extractor.js`
   finds the first block with a `text` field rather than assuming `content[0]`, specifically to
   handle this. If you see this error again after that fix, log
   `responseBody.content.map(b => b.type)` to see the actual block order.

## Checking the result

```powershell
docker exec apha-risk-insights-backend-mongodb-1 mongosh "apha-risk-insights-backend" --eval "printjson(db.disease_risks.find().toArray())"
docker exec apha-risk-insights-backend-mongodb-1 mongosh "apha-risk-insights-backend" --eval "printjson(db['ingestion-logs'].find().sort({_id:-1}).limit(1).toArray())"
```

Or point MongoDB Compass at `mongodb://localhost:27017/apha-risk-insights-backend`.

## Getting local test data into a CDP-hosted MongoDB

See `adr/bridge-local-ingestion-to-cdp-via-mongodump.adr.md` — in short, `mongodump` the local
database, upload the archive via a CDP Terminal session's Files tab, then `mongorestore` it there.
This is a prototype-only bridge for non-production environments, not a production pipeline.

## Common mistakes

- **Don't run `npx vitest run` / `npm test` directly from the host against your dev database.**
  From the host, tests connect to the same `mongodb://127.0.0.1:27017/apha-risk-insights-backend`
  as a manual ingestion run and can wipe its collections. Use `npm run docker:test` (or
  `docker:test:watch`), which runs against an isolated `apha-risk-insights-backend-test` Compose
  project instead.
- **`AWS_ENDPOINT_URL` vs `AWS_ENDPOINT_URL_S3`** — see above; mixing these up silently breaks the
  Bedrock call instead of failing loudly.
