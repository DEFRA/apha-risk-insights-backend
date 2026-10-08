# Python ingestion kept separate

## Status

Accepted

## Context

The project needs data ingestion and processing. Python suits this work. The API is Node.js and Hapi.

## Decision

We keep ingestion in the top-level `ingestion/` folder. It is a separate Python workload. We dockerise it independently. It is not part of the Node API build, image, or dependencies.

## Consequences

- Node and Python dependencies do not mix.
- Each workload builds, releases, and scales on its own.
- The ingestion workload needs its own build and run steps. It is not in CI/CD yet.
