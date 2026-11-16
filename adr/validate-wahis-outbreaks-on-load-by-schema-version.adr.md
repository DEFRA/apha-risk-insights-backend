# Validate WAHIS outbreaks on load by schema version

## Status

Proposed. The MVP covers a manual load only: `npm run load:wahis` stores records from files, and MongoDB rejects any that do not match the schema. The SQS message, the schema version check and an S3 loader are deferred while the WAHIS transform in `apha-insights-ingestion` is a spike.

## Context

`apha-insights-ingestion` transforms WAHIS reports into one record per outbreak and writes them to S3. It owns the outbreak schema and validates records before writing them (see `validate-wahis-outbreaks-before-publishing.adr.md` in that repo). It will send an SQS message that includes the schema version. This service will then load the records from S3 into MongoDB.

S3 sits between the two services. Records in a bucket may have been written by an older version of the transform, or by something other than the transform. Validation in the ingestion service does not prove what this service reads.

`validate-with-mongo-jsonschema-only.adr.md` keeps one `$jsonSchema` file per collection in `src/data/schemas/` and applies it at start-up through `applyCollectionValidators()` in `src/data/collections.js`.

## Decision

We keep the WAHIS outbreak `$jsonSchema` in `src/data/schemas/wahis-outbreak.schema.json` and apply it to the outbreak collection at start-up, the same way as other collections. It is the MongoDB form of the JSON Schema that `apha-insights-ingestion` validates against, plus the `_id` that MongoDB adds. This follows `validate-with-mongo-jsonschema-only.adr.md`.

For the MVP, `npm run load:wahis` reads record files given on the command line and stores each one, replacing the stored record for the same `source.outbreakId`. MongoDB rejects a record that fails the validator, and the command reports the field and rule and exits with code 1. The `wahis_outbreaks` collection has a unique index on `source.outbreakId`.

When SQS is added, we declare the schema version this service supports. An SQS message's schema version is checked before reading from S3. If we do not support the version, we do not load the records and we leave the message to be retried or dead-lettered.

## Consequences

- MongoDB enforces the schema on every write, whatever the ingestion service did.
- The schema lives in two repos, in two formats. The version check stops a mismatched version loading, but it cannot catch two files with the same version and different content. Follow-up: a contract test or a check of the file's hash against the ingestion repo.
- A schema change needs a release of this service with the new copy before ingestion publishes records with the new version. Until then those messages wait or go to the dead-letter queue.
- Supporting more than one version at once is not covered. We will decide that when we first need it.
- Follow-up: define the SQS message shape and dead-letter handling, and decide whether the loader also checks each record's `processing.schemaVersion`.
