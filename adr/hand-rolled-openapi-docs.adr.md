# Hand-rolled OpenAPI docs

## Status

Accepted

## Context

API consumers need documentation. `hapi-swagger` generates docs from route definitions, but it adds a dependency and couples the docs to route configuration. The API is small.

## Decision

We do not use `hapi-swagger`. We maintain `docs/openapi/v1.yaml` by hand. The `/documentation` route serves this file through `@hapi/inert`.

## Consequences

- Fewer dependencies and full control of the document.
- Developers must update the YAML when they change a route. Review must check this.
- The docs can drift from the code. Contract tests can reduce this risk later.
