# Ingestion

Python workload for data ingestion and processing. It is separate from the Node.js API. See `adr/python-ingestion-kept-separate.adr.md`.

## Status

Placeholder. No code, Dockerfile, or Compose file exists yet.

## Planned

- `Dockerfile` based on `python:3.12-slim`.
- `requirements.txt` and `src/main.py`.
- Standalone Compose file with project name `apha-risk-insights-ingestion`. It joins the external `apha-risk` network to reach `mongodb`.
- Not part of CI/CD.
