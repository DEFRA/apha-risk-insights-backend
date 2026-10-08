# Integration tests

Test several modules together against real dependencies.

- Use the real MongoDB container. Do not use in-memory Mongo.
- Run with `npm run docker:test`.
- Name files `*.test.js`. Keep tests narrow: one flow per file.
- Clean up all data that a test creates.
