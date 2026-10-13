# Ingestion

Python workload for data ingestion and processing. It is separate from the Node.js API. See `adr/python-ingestion-kept-separate.adr.md`.

## Status

No Python code, Dockerfile, or Compose file exists yet. `scripts/` holds a mongosh loader and a dev seed script.

## Planned

- `Dockerfile` based on `python:3.12-slim`.
- `requirements.txt` and `src/main.py`.
- Standalone Compose file with project name `apha-risk-insights-ingestion`. It joins the external `apha-risk` network to reach `mongodb`.
- Not part of CI/CD.

## Seed the dev database

`ingestion/scripts/seed-dev.sh` replaces everything in `disease_risks` with the dummy data in `test/mocks/disease-risks.json`. The tests use the same file. It is not real APHA data.

```sh
npm run docker:up:d          # the API must start first, to apply the collection validator
ingestion/scripts/seed-dev.sh
```

To load a different Extended JSON file (an object with the documents under `documents`), pass its path relative to the repo root: `ingestion/scripts/seed-dev.sh path/to/file.json`.

The script runs `ingestion/scripts/load-disease-risks.js` with mongosh in a throwaway `mongo` container on the `apha-risk` network. It clears the collection with `deleteMany({})`, not `drop()`, so the validator stays in place. It refuses to load into a collection with no validator. Invalid documents fail with `MongoServerError` code `121`.
