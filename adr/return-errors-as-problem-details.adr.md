# Return errors as problem details

## Status

Accepted

## Context

The OpenAPI contract in `docs/openapi/v1.yaml` defines every error response (400, 404, 429 and 500) as `application/problem+json` using a `Problem` schema (RFC 9457). Hapi returns Boom errors as `application/json` with a `{ statusCode, error, message }` body by default, which does not match the contract. Formatting errors in each route handler would repeat the same code and miss errors Hapi raises itself, such as validation failures and unknown routes.

## Decision

We convert every Boom error response to problem details in one place: the `problem-details` plugin in `src/plugins/problem-details.js`, registered as an `onPreResponse` extension.

- `type` is `about:blank`, `title` is the HTTP reason phrase, `status` is the status code and `instance` is the request path.
- `detail` holds the Boom message for 4xx errors only. We never return details of 5xx errors, so internal error messages do not leak to clients.
- Headers set on the Boom error, such as `WWW-Authenticate`, are copied to the response.

Route handlers report errors by throwing Boom errors, for example `Boom.notFound()`.

## Consequences

- Every error matches the contract, including Joi validation failures, unknown routes and unhandled exceptions, with no per-route code.
- Clients get one error format across the API.
- This changes the body of errors that existed before, such as a 404 for an unknown route.
- Responses a handler builds itself with an error status code are not Boom errors, so they are not converted. Handlers must throw Boom errors to get the standard format. The existing `/documentation/{asset}` 404 is one of these.
- 5xx responses carry no `detail`. Diagnose these from the server logs.
