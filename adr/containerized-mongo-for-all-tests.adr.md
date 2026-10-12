# Containerized Mongo for all tests

## Status

Accepted

## Context

In-memory Mongo servers differ from the real database in behaviour, version, and features. Tests that pass on them can fail in production. Developers also need to run dev and test stacks at the same time.

## Decision

We run a real MongoDB container for the application and for all tests. We never use in-memory Mongo. We isolate stacks with Compose project names: dev uses `apha-risk-insights-backend`, test uses `apha-risk-insights-backend-test`. Always pass `-p` explicitly. Both stacks share the pinned Docker network `apha-risk`.

## Consequences

- Tests match production behaviour.
- Dev and test stacks run together without name or volume clashes.
- Tests need Docker. Startup is slower than with in-memory Mongo.
- Mongo-backed tests run only through `npm run docker:test`. Running `npm test` on the host would hit the dev Mongo and is not supported.
- `test/setup.js` opens one Mongo connection per test file, not per test. In October 2026 the suite (7 files, 25 tests) ran in about 1.8s, with about 100ms of setup per file. Cost grows with the number of test files: roughly 5s of extra setup at 50 files.
- When per-file setup becomes a noticeable share of the run, set Vitest `isolate: false` so that workers, and one Mongo connection, are reused across files. Before doing that, make the per-file cleanup independent of module state, because files would then share `src/data/db.js` state. Record the change as a new ADR that supersedes this one.
