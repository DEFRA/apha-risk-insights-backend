# Validate with Mongo $jsonSchema only

## Status

Accepted. Supersedes `dual-layer-mongo-schema-validation.adr.md`.

## Context

`dual-layer-mongo-schema-validation.adr.md` planned Joi validation in Node repositories plus a MongoDB `$jsonSchema` validator. For this proof of concept, no data is written through the Node API. The Python workload in `ingestion/` extracts the data, and a mongosh script loads it into MongoDB. A Joi schema would have no caller, could drift from the `$jsonSchema` unnoticed, and would be designed before we know the needs of the planned upload form.

## Decision

We validate documents only with MongoDB `$jsonSchema` validators. The schema for each collection lives in `src/data/schemas/` as JSON. The `mongodb` plugin applies it at API start up through `applyCollectionValidators()` in `src/data/collections.js`. It creates the collection with the validator, or updates the validator with `collMod` if the collection exists. We set `validationLevel: strict` and `validationAction: error`.

We add Node-side validation when a Node write path exists, such as the upload form. We will then consider validating against the same JSON schema file (for example with `ajv`) rather than a separate Joi schema, to keep one source of truth.

## Consequences

- One schema definition per collection, so nothing to keep aligned.
- The API must start before ingestion runs, so the validator exists when data is loaded.
- Ingestion must clear a collection with `deleteMany({})`, not `drop()`. Dropping removes the validator until the API next starts.
- `collMod` does not re-check documents already stored. Data loaded before a schema change can break the new schema.
- Rejections are `MongoServerError` with code `121`, and `errInfo` says which rule failed. These messages are less readable than Joi's. That is acceptable for a scripted load, but not for a user-facing form.
- Integration tests prove the validator against the real Mongo container.
