---
name: TanStack Query v5 queryKey in orval hooks
description: How to pass options to orval-generated hooks with TanStack Query v5
---

In TanStack v5, `UseQueryOptions` requires `queryKey` — it's no longer optional. Orval-generated hooks wrap options as `{ query?: UseQueryOptions, request?: ... }`.

**Rule:** Always import the query key helper and include it explicitly:
```ts
import { useGetAllProgress, getGetAllProgressQueryKey } from '@workspace/api-client-react';

useGetAllProgress(userId, {
  query: { enabled: !!userId, queryKey: getGetAllProgressQueryKey(userId) }
});
```

**Why:** TypeScript TS2741 error: "Property 'queryKey' is missing in type '{ enabled: boolean }' but required in type 'UseQueryOptions<...>'". The generated `getGet*QueryOptions` helper provides the default queryKey fallback at runtime, but TypeScript's structural check still demands it at the call site.

**How to apply:** Every `useGet*` call that passes a `query: {}` object must include `queryKey: getGet*QueryKey(args)`.
