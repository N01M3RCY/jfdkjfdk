---
name: Express TS7030 not all code paths return
description: How to satisfy TypeScript strict mode in Express async route handlers
---

TypeScript TS7030 "Not all code paths return a value" fires on Express async handlers when `return res.json()` is used in some branches but not the catch block.

**Rule:** Use one of two patterns:
1. Early return with block: `if (!row) { res.status(404).json({ error }); return; }`
2. Void cast in catch: `return void res.status(500).json({ error });`

**Why:** `res.json()` returns `Response` not `void`, so mixing `return res.json()` and bare `res.json()` in the same function confuses the TypeScript return-path checker.

**How to apply:** All Express route handlers in `artifacts/api-server/src/routes/*.ts`.
