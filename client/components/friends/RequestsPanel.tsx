"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "react-toastify"
import { listRequests, acceptRequest, declineRequest, unfollow } from "@/features/profile/services/users"
import type { FollowRequestUser } from "@/shared/types/user"
import FriendRow, { ActionButton } from "./FriendRow"
import FriendSearchBar from "./FriendSearchBar"
import { ListSkeleton, EmptyState } from "./PanelChrome"

export default function RequestsPanel({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const [data, setData] = useState<{ incoming: FollowRequestUser[]; outgoing: FollowRequestUser[] } | null>(null)
  const [filter, setFilter] = useState("")

  useEffect(() => {
    let cancelled = false
    listRequests()
      .then(d => {
        if (cancelled) return
        setData(d)
        onCountChange?.(d.incoming.length)
      })
      .catch(() => { if (!cancelled) setData({ incoming: [], outgoing: [] }) })
    return () => { cancelled = true }
  }, [onCountChange])

  const removeIncoming = useCallback((id: string) => {
    setData(prev => {
      if (!prev) return prev
      const next = { ...prev, incoming: prev.incoming.filter(u => u._id !== id) }
      onCountChange?.(next.incoming.length)
      return next
    })
  }, [onCountChange])

  const removeOutgoing = useCallback((id: string) => {
    setData(prev => prev ? { ...prev, outgoing: prev.outgoing.filter(u => u._id !== id) } : prev)
  }, [])

  const handleAccept = useCallback(async (id: string) => {
    removeIncoming(id)
    try { await acceptRequest(id) }
    catch {
      toast.error("Couldn't accept. Try again.")
      // Refetch on error to restore correct state
      listRequests().then(setData).catch(() => {})
    }
  }, [removeIncoming])

  const handleDecline = useCallback(async (id: string) => {
    removeIncoming(id)
    try { await declineRequest(id) }
    catch {
      toast.error("Couldn't decline. Try again.")
      listRequests().then(setData).catch(() => {})
    }
  }, [removeIncoming])

  const handleCancel = useCallback(async (id: string) => {
    removeOutgoing(id)
    try { await unfollow(id) }  // unfollow endpoint also cancels outgoing requests
    catch {
      toast.error("Couldn't cancel. Try again.")
      listRequests().then(setData).catch(() => {})
    }
  }, [removeOutgoing])

  const filterFn = useCallback((u: FollowRequestUser) => {
    const q = filter.trim().toLowerCase()
    if (q.length < 1) return true
    return u.displayName.toLowerCase().includes(q)
  }, [filter])

  const incoming = useMemo(() => (data?.incoming ?? []).filter(filterFn), [data, filterFn])
  const outgoing = useMemo(() => (data?.outgoing ?? []).filter(filterFn), [data, filterFn])

  if (data === null) return <ListSkeleton />
  if (data.incoming.length === 0 && data.outgoing.length === 0) {
    return <EmptyState title="No pending requests" />
  }

  return (
    <div className="flex flex-col gap-3">
      <FriendSearchBar value={filter} onChange={setFilter} />

      {data.incoming.length > 0 && (
        <>
          <p className="text-[10px] font-bold tracking-widest mt-2 mb-1 px-1" style={{ color: "#6475D1" }}>
            INCOMING — {data.incoming.length}
          </p>
          {incoming.map(u => (
            <FriendRow
              key={u._id}
              id={u._id}
              displayName={u.displayName}
              avatarUrl={u.avatarUrl}
              actions={
                <>
                  <ActionButton variant="primary" onClick={() => handleAccept(u._id)}>Accept</ActionButton>
                  <ActionButton variant="muted"   onClick={() => handleDecline(u._id)}>Decline</ActionButton>
                </>
              }
            />
          ))}
        </>
      )}

      {data.outgoing.length > 0 && (
        <>
          <p className="text-[10px] font-bold tracking-widest mt-4 mb-1 px-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            OUTGOING — {data.outgoing.length}
          </p>
          {outgoing.map(u => (
            <FriendRow
              key={u._id}
              id={u._id}
              displayName={u.displayName}
              avatarUrl={u.avatarUrl}
              actions={
                <ActionButton variant="muted" onClick={() => handleCancel(u._id)}>
                  Cancel Request
                </ActionButton>
              }
            />
          ))}
        </>
      )}
    </div>
  )
}
