// Admin LLM chat — streaming SSE via native fetch (keeps auth cookie).
// The response is a text/event-stream; each line is `data: {...JSON...}`.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export type LLMContext = "game-links" | "products" | "analytics"

export interface LLMEvent {
    type:     "delta" | "tool_call" | "done" | "error"
    text?:    string
    name?:    string           // tool name when type="tool_call"
    history?: { role: string; content: unknown }[]
    message?: string           // error message when type="error"
}

/**
 * Send a message to the admin AI assistant and stream the response.
 * Calls `onEvent` for each SSE event; resolves when the stream closes.
 */
const API_URL_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

/** Analyze a store URL with Claude and return structured game link data. */
export async function analyzeStoreLink(url: string): Promise<{
  rawgId:           number | null
  rawgName:         string | null
  label:            string
  platform:         string
  price:            number | null
  storeIcon:        string
  subscriptionName: string | null
  discountExpiresAt: string | null
  note:             string
}> {
  const res = await fetch(`${API_URL_BASE}/api/v1/admin/llm/analyze-link`, {
    method:      "POST",
    credentials: "include",
    headers:     { "Content-Type": "application/json" },
    body:        JSON.stringify({ url }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  const body = await res.json() as { data: ReturnType<typeof analyzeStoreLink> extends Promise<infer T> ? T : never }
  return body.data
}

export async function streamAdminChat(params: {
    message:   string
    context:   LLMContext
    history?:  { role: string; content: unknown }[]
    onEvent:   (event: LLMEvent) => void
    signal?:   AbortSignal
}): Promise<void> {
    const response = await fetch(`${API_URL}/api/v1/admin/llm/chat`, {
        method:      "POST",
        credentials: "include",   // send httpOnly admin cookie
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({
            message: params.message,
            context: params.context,
            history: params.history ?? [],
        }),
        signal: params.signal,
    })

    if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `HTTP ${response.status}`)
    }

    if (!response.body) throw new Error("No response body")

    const reader  = response.body.getReader()
    const decoder = new TextDecoder()
    let   buffer  = ""

    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // SSE format: each event is `data: {...}\n\n`
        const parts = buffer.split("\n\n")
        buffer = parts.pop() ?? ""   // keep incomplete last chunk

        for (const part of parts) {
            const line = part.trim()
            if (!line.startsWith("data: ")) continue
            try {
                const event = JSON.parse(line.slice(6)) as LLMEvent
                params.onEvent(event)
            } catch { /* skip malformed chunks */ }
        }
    }
}
