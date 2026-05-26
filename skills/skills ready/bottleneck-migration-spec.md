# Bottleneck Migration Spec — Replace Manual CheapShark Semaphore

> Self-briefing. Read before writing code. Do not start until user approves.

## Why

We currently throttle CheapShark API calls with a hand-rolled semaphore
(`acquireCs`, `releaseCs`, `csInflight`, `csQueue` — roughly 40 lines in
`src/featchers/games/games.service.ts`). It works but:

- No daily-budget reservoir (we can burn through all daily calls in a minute)
- No automatic 429 backoff (we retry with exponential delay manually)
- No priority queue (background SWR refreshes compete with user-blocking calls)
- No telemetry hooks (can't easily log queue depth or wait times)
- Easy to forget to call `releaseCs()` in a new error path (silent leak)

`bottleneck` is the industry-standard library for this exact problem. It's
small (~40 KB), zero dependencies, MIT licensed, used by libraries like
`@octokit/rest`.

## Non-goals

- Do NOT change CheapShark request shapes or response handling
- Do NOT change the public surface of `getCardPricesService` or any caller
- Do NOT touch ITAD or RAWG calls (ITAD is batched; RAWG has no current limiter)
- Do NOT introduce other rate-limiting features (reservoir, retries, priority)
  in this migration — just achieve parity with the manual semaphore first

## Scope

**File:** `src/featchers/games/games.service.ts` only.

**Replace:**
- `CS_MAX_CONCURRENT` constant
- `csInflight` counter
- `csQueue` array
- `acquireCs(timeoutMs)` function
- `releaseCs()` function
- The comment block titled `─── CheapShark concurrency semaphore ───`

**Migrate all callers that currently use the semaphore:**

Search for `acquireCs(` and `releaseCs()` to find them. As of writing, they
appear in:
- `getGamePriceService` (the legacy CheapShark single-price lookup)
- `getGameDealsService` Path B
- Implicit calls inside `runCheapSharkPipelineAll` via `checkCheapSharkPrice`

Each caller pattern:
```ts
const acquired = await acquireCs()
if (!acquired) return null   // queue timed out
try {
  // axios.get(...)
} finally {
  releaseCs()
}
```

Becomes:
```ts
return csLimiter.schedule(() => axios.get(...))
```

For callers that need timeout-on-queue (so we don't stall forever when the
queue is deep), use `csLimiter.schedule({ expiration: 3000 }, () => ...)`.
Bottleneck throws `BottleneckError` with name `BSExpired` when the job exceeds
its expiration; catch it and return `null` to preserve current behavior.

## Configuration

```ts
import Bottleneck from "bottleneck"

const csLimiter = new Bottleneck({
    maxConcurrent: 2,    // match current CS_MAX_CONCURRENT
    minTime: 200,        // ≤ 5 req/sec — gentler than current burst behavior
})
```

Do NOT add `reservoir` (daily cap) in this migration — that's a separate
decision and changes behavior. Parity-only here.

## Install

```bash
npm install bottleneck
```

In repo root (not `client/`). Bottleneck is for the backend Express server.

## Migration steps

1. `npm install bottleneck`
2. Add `import Bottleneck from "bottleneck"` at the top of
   `src/featchers/games/games.service.ts` (alphabetical with other imports)
3. Add the `csLimiter` const right above the existing
   `─── CheapShark concurrency semaphore ───` block
4. Find every `await acquireCs()` + `try/finally releaseCs()` pattern.
   Rewrite each as `csLimiter.schedule(...)`.
5. For each rewritten caller: if the original had a queue-timeout fallback
   (`if (!acquired) return null`), preserve that behavior by passing
   `{ expiration: 3000 }` and catching `BSExpired` errors.
6. Delete the original semaphore section:
   - `CS_MAX_CONCURRENT`
   - `csInflight`
   - `csQueue`
   - `acquireCs`
   - `releaseCs`
   - The comment block
7. Run `npx tsc --noEmit` from repo root — must pass clean
8. Manual smoke test:
   - Start backend (`npm run dev` or equivalent)
   - Load home page → confirm prices populate normally
   - Open a game detail page that hits Path B → confirm deals load
   - Tail logs — no semaphore-related errors

## Verification checklist

- [ ] No remaining references to `acquireCs`, `releaseCs`, `csInflight`,
      `csQueue`, `CS_MAX_CONCURRENT` (grep confirms)
- [ ] Every CheapShark `axios.get`/`axios.post` is wrapped in
      `csLimiter.schedule(...)` (no raw axios calls to cheapshark.com)
- [ ] Backend typechecks clean
- [ ] Queue-timeout callers correctly handle `BSExpired` (return `null`/`[]`
      as before, do not propagate the error)
- [ ] No new package added beyond `bottleneck` itself
- [ ] `package.json` and `package-lock.json` show the dependency added

## Risks

- **Behavior change risk:** Bottleneck's `minTime` introduces a 200 ms gap
  between successive CheapShark calls. The current semaphore has no such gap
  — concurrent calls can fire instantly up to `CS_MAX_CONCURRENT`. This is
  intentional (gentler on CheapShark) but may make some cold-start fetches
  marginally slower. Acceptable trade-off.

- **Forgotten caller risk:** If a CheapShark call isn't migrated, it bypasses
  the limiter entirely and may trigger 429s. The grep check above catches
  this.

- **Error-handling regression:** `BSExpired` thrown by bottleneck is not the
  same as the old `return false` from `acquireCs`. Callers MUST catch it
  explicitly. Forgetting to catch will surface a real error to the user that
  previously was silenced.

## When done

- This migration is a precursor to the Option B implementation
  (`option-b-spec.md`). The SWR background-refresh pipeline will use
  `csLimiter.schedule()` with low priority so background work doesn't block
  user-facing requests. That priority work is part of Option B, not this
  migration.

- Commit message suggestion:
  `refactor: replace manual CheapShark semaphore with bottleneck library`
