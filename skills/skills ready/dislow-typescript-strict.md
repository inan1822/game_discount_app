---
name: dislow-typescript-strict
description: >
  Enables real TypeScript safety across the DisLow three-app stack (client/, crm/, src/).
  Use this skill whenever the user wants to: enable strict TypeScript, remove ignoreBuildErrors,
  fix 'any' types, add proper error handling types, or harden the TypeScript config.
  Also trigger on: "fix TypeScript errors", "make TypeScript strict", "remove any types",
  "type safety", "catch (err: any)", or any request to improve type correctness in DisLow.
  Run this skill before any major feature work — a strict codebase catches bugs before deployment.
---

# DisLow TypeScript Strict Mode

You are systematically enabling strict TypeScript safety across the DisLow codebase.
Work through all three steps in order. Do not skip ahead — each step builds on the last.

---

## Step 1 — Enable strict mode in tsconfig files

Update these two files. Add `"strict": true` to the `compilerOptions` block:

- `client/tsconfig.json`
- `crm/tsconfig.json`

The backend (`src/`) uses `tsx` for dev and `tsc` for build. Check `tsconfig.json` at the repo root too.

---

## Step 2 — Remove build error suppression

In `client/next.config.ts` and `crm/next.config.ts`, find and remove:
```ts
typescript: { ignoreBuildErrors: true }
```

Without this flag, `next build` will now fail on type errors instead of silently shipping them.

---

## Step 3 — Surface errors and fix them

Run the build in each app to see what breaks:
```bash
cd client && pnpm build
cd crm && pnpm build
cd .. && pnpm build   # backend tsc
```

Fix errors in priority order:

### Pattern A — catch variables (most common)
```ts
// BEFORE (unsafe — err could be anything)
} catch (err: any) {
  toast.error(err?.response?.data?.message ?? "Failed")
}

// AFTER (safe)
} catch (err: unknown) {
  const message = err instanceof Error ? err.message
    : (err as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? "Failed"
  toast.error(message)
}
```

For Axios errors specifically, use the type guard:
```ts
import axios from "axios"

} catch (err: unknown) {
  if (axios.isAxiosError(err)) {
    toast.error(err.response?.data?.message ?? "Request failed")
  } else {
    toast.error("An unexpected error occurred")
  }
}
```

### Pattern B — API response types
Replace loose `any` on API responses with proper interfaces.
Look in `client/shared/types/` and `client/features/*/services/` for existing types to reuse.

```ts
// BEFORE
const data: any = await apiClient.get("/games/search")

// AFTER
interface SearchResponse { results: Game[]; count: number }
const { data } = await apiClient.get<SearchResponse>("/games/search")
```

### Pattern C — as any escape hatches
```ts
// BEFORE
(nextConfig as any).turbopack = { ... }

// AFTER — use the actual Next.js config type or a specific cast
import type { NextConfig } from "next"
const nextConfig: NextConfig = { ... }
```

### Pattern D — missing return types on exported functions
Add explicit return types to functions in services/ and utils/:
```ts
// BEFORE
export async function getPopularGames(page: number) { ... }

// AFTER
export async function getPopularGames(page: number): Promise<Game[]> { ... }
```

### Pattern E — React component prop types
Components that accept `React.ElementType` or `icon` props:
```ts
// BEFORE
function NavItem({ icon: Icon }: { icon: any }) {

// AFTER
function NavItem({ icon: Icon }: { icon: React.ElementType }) {
```

---

## Rules

- Fix errors file by file. Don't change logic — only types.
- If a type fix requires a significant logic change, mark it with `// TODO: strict` and move on.
- Never use `@ts-ignore` or `@ts-expect-error` as a fix — that just relocates the problem.
- When unsure of the correct type, use `unknown` instead of `any`. `unknown` forces you to check before using; `any` skips all checks.
- After fixing, run the build again to confirm zero errors before marking complete.

---

## Done when

- `pnpm build` in `client/` exits with 0 errors
- `pnpm build` in `crm/` exits with 0 errors  
- `pnpm build` at the root exits with 0 errors
- No `ignoreBuildErrors` remains in any Next.js config
- No unguarded `catch (err: any)` remains in the codebase
