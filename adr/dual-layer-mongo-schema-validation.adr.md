# Dual-layer Mongo schema validation

## Status

Superseded by `validate-with-mongo-jsonschema-only.adr.md`.

## Context

MongoDB does not enforce a schema by default. Bad data can enter through the application or through other writers, such as ingestion scripts.

## Decision

We validate data in two layers:

1. Joi schemas at the repository layer, before any write.
2. MongoDB `$jsonSchema` validators on collections, as a database-level safety net.

## Consequences

- Invalid data is rejected early with clear errors (Joi).
- Writers that bypass the application, such as ingestion, are still checked (`$jsonSchema`).
- We must keep two schema definitions aligned when a data model changes.
