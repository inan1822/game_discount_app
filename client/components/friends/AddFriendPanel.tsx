"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Search } from "@/shared/icons"
import { toast } from "react-toastify"
import { useDebouncedCallback } from "use-debounce"
import { searchUsers, follow, acceptRequest } from "@/features/profile/services/users"
import type { UserSearchResult, Relationship } from "@/shared/types/user"
import FriendRow, { ActionButton } from "./FriendRow"

function ActionForRelationship({
  relationship,
  isPrivate,
  onFollow,
}: {
  relationship: Relationship
  isPrivate: boolean
  onFollow: () => void
}) {
  switch (relationship) {
    case "following":
    case "friends":
      return <ActionButton variant="muted" disabled>Following</ActionButton>
    case "requested":
      return <ActionButton variant="muted" disabled>Requested</ActionButton>
    case "they-requested-me":
      return <ActionButton variant="primary" onClick={onFollow}>Accept</ActionButton>
    case "follows-me":
      return <ActionButton variant="primary" onClick={onFollow}>Follow Back</ActionButton>
    default:
      return (
        <ActionButton variant="primary" onClick={onFollow}>
          {isPrivate ? "Request" : "Follow"}
        </ActionButton>
      )
  }
}

export default function AddFriendPanel() {
  const [query, setQuery]     = useState("")
  const [results, setResults] = useState<UserSearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const runSearch = useDebouncedCallback(async (q: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const data = await searchUsers(q, controller.signal)
      if (!controller.signal.aborted) setResults(data)
    } catch (err) {
      const e = err as { name?: string; code?: string }
      if (e?.name === "CanceledError" || e?.code === "ERR_CANCELED") return
      setResults([])
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, 250)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults(null)
      setLoading(false)
      abortRef.current?.abort()
      return
    }
    setLoading(true)
    runSearch(trimmed)
  }, [query, runSearch])

  useEffect(() => () => abortRef.current?.abort(), [])

  const handleFollow = useCallback(async (user: UserSearchResult) => {
    // "they-requested-me" → accept their pending request (the button label is "Accept").
    // Calling follow() here would create a new follow in the wrong direction and
    // leave their incoming request stale. Accepting is what the user actually means.
    const isAccept = user.relationship === "they-requested-me"

    const optimistic: Relationship = isAccept
      ? "follows-me"                                    // accepting → they now follow me
      : (user.isPrivate ? "requested" : "following")
    setResults(prev => prev?.map(u => u._id === user._id ? { ...u, relationship: optimistic } : u) ?? null)
    try {
      if (isAccept) {
        await acceptRequest(user._id)
        // optimistic state already correct
      } else {
        const res = await follow(user._id)
        const finalRel: Relationship = res.status === "requested" ? "requested" : "following"
        setResults(prev => prev?.map(u => u._id === user._id ? { ...u, relationship: finalRel } : u) ?? null)
      }
    } catch {
      setResults(prev => prev?.map(u => u._id === user._id ? { ...u, relationship: user.relationship } : u) ?? null)
      toast.error("Couldn't complete. Try again.")
    }
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex items-center gap-2 px-3 py-2.5"
        style={{
          background: "rgba(28,30,42,0.70)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 12,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <Search size={15} style={{ color: "rgba(255,255,255,0.4)" }} />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Look for my friend..."
          aria-label="Search users"
          className="flex-1 bg-transparent text-[14px] outline-none text-white placeholder:text-white/30"
        />
      </div>

      {query.trim().length < 2 && (
        <p className="text-center text-[12px] py-8" style={{ color: "rgba(255,255,255,0.35)" }}>
          Type at least 2 characters to search.
        </p>
      )}

      {loading && (
        <p className="text-center text-[12px] py-4" style={{ color: "rgba(255,255,255,0.45)" }}>
          Searching...
        </p>
      )}

      {results && !loading && results.length === 0 && (
        <p className="text-center text-[12px] py-6" style={{ color: "rgba(255,255,255,0.35)" }}>
          No users found.
        </p>
      )}

      {results && results.map(u => (
        <FriendRow
          key={u._id}
          id={u._id}
          displayName={u.displayName}
          avatarUrl={u.avatarUrl}
          actions={
            <ActionForRelationship
              relationship={u.relationship}
              isPrivate={u.isPrivate}
              onFollow={() => handleFollow(u)}
            />
          }
        />
      ))}
    </div>
  )
}
