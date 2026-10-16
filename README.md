# apha-risk-insights-backend

Core delivery platform Node.js Backend Template.

- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Local development](#local-development)
  - [Setup](#setup)
  - [Development](#development)
  - [Testing](#testing)
  - [Production](#production)
  - [Npm scripts](#npm-scripts)
  - [Update dependencies](#update-dependencies)
  - [Formatting](#formatting)
    - [Windows prettier issue](#windows-prettier-issue)
- [API endpoints](#api-endpoints)
- [Risk PDF ingestion](#risk-pdf-ingestion)
- [Development helpers](#development-helpers)
  - [MongoDB Locks](#mongodb-locks)
  - [Proxy](#proxy)
- [Docker](#docker)
  - [Development image](#development-image)
  - [Production image](#production-image)
  - [Docker Compose](#docker-compose)
  - [Dependabot](#dependabot)
  - [SonarCloud](#sonarcloud)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

Please install [Node.js](http://nodejs.org/) `>= v24` and [npm](https://nodejs.org/) `>= v11`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
cd apha-risk-insights-backend
nvm use
```

## Local development

### Setup

Install application dependencies:

```bash
npm install
```

### Git hooks

Git hooks are managed by [pre-commit](https://pre-commit.com/) (see
[.pre-commit-config.yaml](./.pre-commit-config.yaml)). On commit they run
[detect-secrets](https://github.com/Yelp/detect-secrets), ESLint (with `--fix`)
and Prettier.

Install pre-commit, then install the hooks once after cloning:

```bash
pip install pre-commit   # or: pipx install pre-commit
pre-commit install
```

To run the hooks against every file without committing:

```bash
pre-commit run --all-files
```

To run the full check suite (security audit, format check, lint and tests)
manually or in CI:

```bash
npm run check:all
```

#### Secrets baseline

`.secrets.baseline` records known, accepted findings so `detect-secrets` only
flags new ones. It was generated once with:

```bash
pip install detect-secrets
detect-secrets scan > .secrets.baseline
```

If the hook flags a false positive, update the baseline with
`detect-secrets scan --baseline .secrets.baseline` and commit the result.

### Development

To run the application in `development` mode run:

```bash
npm run dev
```

### Testing

To test the application run:

```bash
npm run test
```

### Production

To mimic the application running in `production` mode locally run:

```bash
npm start
```

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json).
To view them in your command line run:

```bash
npm run
```

### Update dependencies

To update dependencies use [npm-check-updates](https://github.com/raineorshine/npm-check-updates):

> The following script is a good start. Check out all the options on
> the [npm-check-updates](https://github.com/raineorshine/npm-check-updates)

```bash
ncu --interactive --format group
```

### Formatting

#### Windows prettier issue

If you are having issues with formatting of line breaks on Windows update your global git config by running:

```bash
git config --global core.autocrlf false
```

## API endpoints

| Endpoint              | Description           |
| :-------------------- | :-------------------- |
| `GET: /health`        | Health                |
| `GET: /documentation` | OpenAPI documentation |

## Risk PDF ingestion

> For a full step-by-step walkthrough, including running from a host machine and troubleshooting
> common errors, see [docs/risk-pdf-ingestion.md](./docs/risk-pdf-ingestion.md).

> **Note:** `adr/python-ingestion-kept-separate.adr.md` says ingestion should be a separate Python
> workload. This Node.js script predates that decision and has not yet been reconciled with it.

> **Note:** Step 2 below cannot actually be run from a CDP Terminal session — it has no Node.js,
> npm, or this repo's code. CDP's hosted MongoDB is also unreachable from a developer laptop. See
> `adr/bridge-local-ingestion-to-cdp-via-mongodump.adr.md` for the current (prototype-only) way to
> get locally-ingested data into a CDP-hosted MongoDB.

International Disease Monitoring (IDM) report PDFs are ingested manually in two steps:

1. Upload the PDF to the service's S3 bucket from a CDP terminal session:

   ```bash
   aws s3 cp ./report.pdf s3://<bucket>/<key>
   ```

2. From the same (or another) CDP terminal session, run the ingestion script from this project to
   extract the text, send it to a Bedrock LLM and store the structured result in MongoDB:

   ```bash
   npm run ingest:risk-pdf -- --bucket <bucket> --key <key> [--model-id <id>] [--region <region>]
   ```

   `--model-id` and `--region` default to the `bedrock.modelId` / `bedrock.region` config values
   (see [src/config.js](./src/config.js)).

> **Prototype note:** Bedrock is called with bearer token (API key) auth, not the pod's IAM role.
> Set `AWS_BEARER_TOKEN_BEDROCK` (a Bedrock API key, not an inference profile ARN) as a secret —
> in the CDP Portal for deployed environments, or in a local `.env` file for local runs. This
> bypasses CDP's governed inference-profile/guardrail access path; see
> `adr/bedrock-bearer-token-auth.adr.md` before using it beyond this prototype.

The prompt sent to the LLM, including the JSON schema it must return, is read from
[src/prompts/risk-extraction-prompt.txt](./src/prompts/risk-extraction-prompt.txt) so it can be
tuned without a code change. Each run is recorded in the `ingestion-logs` collection (raw extracted
text length, raw LLM response, status) for audit purposes, and extracted records are upserted into
the `disease_risks` collection via [src/data/collections.js](./src/data/collections.js), matching
the `$jsonSchema` validator described in `adr/validate-with-mongo-jsonschema-only.adr.md`.

For local testing, Floci creates an `apha-risk-insights-local-uploads` bucket on startup
(see `./compose/floci/start.d/10-setup-resources.sh`) that can be used in place of a real S3
bucket; Bedrock has no local emulator, so unit tests mock the Bedrock client instead.

## Development helpers

### MongoDB Locks

If you require a write lock for Mongo you can acquire it via `server.locker` or `request.locker`:

```javascript
async function doStuff(server) {
  const lock = await server.locker.lock('unique-resource-name')

  if (!lock) {
    // Lock unavailable
    return
  }

  try {
    // do stuff
  } finally {
    await lock.free()
  }
}
```

Keep it small and atomic.

You may use **using** for the lock resource management.
Note test coverage reports do not like that syntax.

```javascript
async function doStuff(server) {
  await using lock = await server.locker.lock('unique-resource-name')

  if (!lock) {
    // Lock unavailable
    return
  }

  // do stuff

  // lock automatically released
}
```

Helper methods are also available in `/src/helpers/mongo-lock.js`.

### Proxy

We are using forward-proxy which is set up by default. Services are automatically configured with the proxy environment variables when deployed.

Node.js 24 uses these variables to route outbound HTTP(S) requests through the proxy:

NODE_USE_ENV_PROXY=1
HTTPS_PROXY=...
NO_PROXY=...

No additional proxy configuration is required in the service.

## Docker

Build:

```bash
docker build --no-cache --tag apha-risk-insights-backend .
```

Run:

```bash
docker run -e PORT=3001 -p 3001:3001 apha-risk-insights-backend
```

### Docker Compose

A local environment with:

- Floci for AWS services (S3, SQS, SNS etc)
- MongoDB
- This service.

Compose files:

- `compose.yaml` — base services, no published ports.
- `compose.override.yaml` — host ports for dev. Auto-loaded by `docker compose up` (no `-f` flags).
- `compose.debug.yaml` — runs the service with the Node inspector attached.
- `compose.test.yaml` — runs the test suite in a dedicated container, no published ports.
- `compose.test.watch.yaml` — runs the test suite in watch mode.

```bash
npm run docker:up        # dev stack: apha API + MongoDB + Floci on 3001/27017/4566
npm run docker:debug     # dev stack with the Node inspector on 9229
npm run docker:test      # one-shot test run, isolated project, no port clashes with dev
npm run docker:test:watch
```

The test stack runs under its own Compose project name
(`apha-risk-insights-backend-test`) so it can run alongside the dev stack
without clashing on ports, container names, or Mongo data.

Mock AWS resources can be created when Floci starts up by editing the scripts in `./compose/floci/start.d/`.
MongoDB records can also be created when Mongo starts by editing the scripts in `./compose/mongo/`.

### Dependabot

We have added an example dependabot configuration file to the repository. You can enable it by renaming
the [.github/example.dependabot.yml](.github/example.dependabot.yml) to `.github/dependabot.yml`

### SonarCloud

Instructions for setting up SonarCloud can be found in [sonar-project.properties](./sonar-project.properties)

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
