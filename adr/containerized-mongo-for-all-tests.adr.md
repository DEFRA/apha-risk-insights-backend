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
