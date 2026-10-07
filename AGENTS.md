# AGENTS.md

Instructions for AI agents working on apha-risk-insights-backend.

## Service

- Hapi.js API, MongoDB, Node `type: module`
- Reference repo for conventions: `fcp-sfd-object-processor` (same org, same stack)

## Naming conventions

- Dev Compose project name: `apha-risk-insights-backend`
- Test Compose project name: `apha-risk-insights-backend-test` (always pass `-p` explicitly)
- Docker network: `apha-risk` (pinned, shared by dev and test)
- Container names: `apha-risk-insights-backend-development` (dev), `apha-risk-insights-backend-test` (test)

## Standing decisions — do not re-litigate

- Keep current `src/` layout (`common/helpers`, `plugins`, `routes`, `services`); add `data/`, `repos/`, `mappers/` only as needed.
- Only `floci` carried over from object-processor's AWS stack (future S3/SNS). No `redis`, `cdp-uploader`, messaging/outbox.
- MongoDB always runs as a real container, for app and tests. No in-memory Mongo, ever.
- OpenAPI docs are hand-rolled (no `hapi-swagger`), served via `/documentation`.
- Python ingestion/processing lives in top-level `ingestion/`, dockerised separately, not part of the Node build.
- Prettier stays. Husky removed. `.pre-commit-config.yaml` used instead. `.snyk` skipped.

## ADRs

Record significant, hard-to-reverse decisions (architecture, data model,
cross-cutting conventions, dependency choices, security boundaries,
error-handling strategy) in `adr/`.

- One file per decision: `adr/<kebab-case-verb-phrase>.adr.md`
- Sections in order: Status, Context, Decision (active voice), Consequences
- Check `adr/` first before writing a new one — update/reference existing, or
  supersede explicitly (mark old one `Status: Superseded`, cross-link).
