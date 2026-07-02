---
name: React Query 401 retry fix
description: React Query retries 3x by default, causing blank pages on auth-check failures
---

## Rule
Configure the QueryClient `defaultOptions.queries.retry` to return `false` for HTTP 401 and 403 status codes.

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});
```

**Why:** Without this, `useGetMe()` returning 401 triggers 3 retries. During retries `isLoading` is true, so auth-gated pages that `return null` while loading show a blank screen for several seconds.

**How to apply:** Set this in App.tsx (or wherever QueryClientProvider is configured) for any app that uses auth-check hooks on page load.
