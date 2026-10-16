# Authenticate to Bedrock with a bearer token, not the pod's IAM role

## Status

Accepted (prototype only)

## Context

CDP's documented, governed route to Bedrock attaches an IAM role to the service's pod. That role's
policy only allows `InvokeModel` via the service's own inference profile ARN, and only with a
guardrail attached; direct model ids, cross-region inference profile ids, and calls with no
guardrail are refused with `AccessDeniedException`. Getting that set up requires platform team
approval for Bedrock access, an inference profile, and a guardrail.

A related prototype, `apha-incubator-backend-llm`, instead authenticates with a Bedrock API key
(a bearer token, set via `AWS_BEARER_TOKEN_BEDROCK`) tied to a different IAM principal, and calls
`InvokeModel` directly with a plain model id and no guardrail. This worked when deployed to CDP.
This is simpler to set up than the governed route, since it needs no inference profile or
guardrail, only a single secret.

The risk PDF ingestion script is a working prototype, run manually and infrequently (around once a
month). Given that, the team accepts the simpler, less governed route for now.

## Decision

We authenticate to Bedrock with a bearer token, following the same pattern as
`apha-incubator-backend-llm`:

- `src/scripts/ingest-risk-pdf.js` constructs the `BedrockRuntimeClient` with `token: { token }`,
  not the default IAM credential chain.
- The token is read from `AWS_BEARER_TOKEN_BEDROCK` (`bedrock.apiKey` in `src/config.js`), held as
  a CDP Portal secret in deployed environments and in a local `.env` file for local runs. It is
  never given a default value or stored in `cdp-app-config`.
- `bedrock.region` and `bedrock.modelId` take a plain AWS region and model id, not a CDP inference
  profile ARN.

## Consequences

- No CDP platform team approval, inference profile, or guardrail is needed to call Bedrock.
- Calls bypass CDP's mandatory content-safety guardrail, and Bedrock usage is not attributed to
  this service through CDP's standard cost-tracking mechanism, since it does not go through the
  service's inference profile.
- The bearer token is a long-lived secret bound to whatever IAM principal issued it, not scoped or
  rotated by CDP the way the pod's IAM role is.
- Before this ingestion moves beyond a manually-run prototype (automated, more frequent runs, or
  production use), revisit this decision and move to CDP's governed inference-profile/guardrail
  route instead.
