# Bridge locally-ingested risk data to CDP via mongodump/mongorestore

## Status

Accepted (prototype only)

## Context

`npm run ingest:risk-pdf` needs Node.js, this repo's code, and network access to an S3 bucket,
Bedrock, and MongoDB. The README's existing instructions assume step 2 (running the script) can
happen "from a CDP terminal session", but CDP Terminal is a separate, curated container, not a
shell on the running service: it ships only Mongo/Redis/AWS CLIs, curl and jq, has no Node.js, npm,
or this repo's code, and cannot install packages. So the script cannot actually run inside a CDP
Terminal session as written.

CDP's hosted MongoDB also has no address reachable from a developer laptop (it sits on a private
network), so pointing a local run's `MONGO_URI` at a CDP environment is not possible either. There
is currently no way to run this script with write access to a CDP-hosted MongoDB.

## Decision

Until the script runs somewhere inside the cluster itself (for example as part of the deployed
service, or by the planned Python ingestion workload), to get prototype data into a CDP-hosted
MongoDB for testing:

1. Run `npm run ingest:risk-pdf` locally, against the local Docker Compose Mongo/Floci stack, as
   documented above.
2. `mongodump` the resulting local database to a gzip archive on the developer's machine.
3. Launch a CDP Terminal session for the target **non-production** environment, upload the archive
   via its Files tab, and run `mongorestore --uri="$MONGO_URI"` inside the terminal to load it.

## Consequences

- Entirely manual and one-off, audited only by CDP Terminal's own session logging; nothing records
  that data in a CDP environment came from this route.
- Depends on a developer's local run being correct and complete, and on remembering to restore
  within the terminal's 2-hour, ephemeral session window.
- `mongorestore` is not explicitly documented as available in CDP Terminal (only `mongodump` and
  `mongoexport` are); check `mongorestore --version` in the session before relying on it.
- Use only to seed non-production environments with test data, never production.
- Once the ingestion script (or its Python successor) runs inside the cluster itself, with direct
  write access to the real MongoDB, this bridge is unnecessary; supersede this ADR at that point.
