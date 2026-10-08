# Keep floci only from the AWS stack

## Status

Accepted

## Context

The reference service `fcp-sfd-object-processor` uses a local AWS stack: floci, redis, and cdp-uploader. This service has no file upload and no messaging need now. It will probably need S3 and SNS later.

## Decision

We keep `floci` in the local Compose stack. We use it to mock S3 and SNS in future work. We do not carry over `redis` or `cdp-uploader`. We add them only if a real need appears.

## Consequences

- Local stack stays small and starts fast.
- S3 and SNS code can be developed locally without AWS access.
- No upload or messaging features exist now. We must add the supporting services when those features start.
