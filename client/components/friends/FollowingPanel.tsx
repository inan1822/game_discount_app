"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "react-toastify"
import { listFollowing, unfollow } from "@/features/profile/services/users"
import { useChat } from "@/features/chat/state/ChatContext"
import type { FriendListItem } from "@/shared/types/user"
import FriendRow, { ActionButton } from "./FriendRow"
import FriendSearchBar from "./FriendSearchBar"
import { ListSkeleton, EmptyState, GroupHeader } from "./PanelChrome"

export default function FollowingPanel() {
  const [items, setItems] = useState<FriendListItem[] | null>(null)
  const [filter, setFilter] = useState("")
  const { openChat } = useChat()

  useEffect(() => {
    let cancelled = false
    listFollowing()
      .then(data => { if (!cancelled) setItems(data) })
      .catch(() => { if (!cancelled) setItems([]) })
    return () => { cancelled = true }
  }, [])

  const handleUnfollow = useCallback(async (id: string) => {
    setItems(prev => prev ? prev.filter(u => u._id !== id) : prev)
    try {
      await unfollow(id)
    } catch {
      // Refetch — safer than restoring a stale snapshot, which could put the
      // row back in the wrong position if other mutations happened in between.
      toast.error("Couldn't unfollow. Try again.")
      listFollowing().then(setItems).catch(() => {})
    }
  }, [])

  const filtered = useMemo(() => {
    if (!items) return null
    const q = filter.trim().toLowerCase()
    if (q.length < 1) return items
    return items.filter(u => u.displayName.toLowerCase().includes(q))
  }, [items, filter])

  const online  = useMemo(() => (filtered ?? []).filter(u => u.isOnline), [filtered])
  const offline = useMemo(() => (filtered ?? []).filter(u => !u.isOnline), [filtered])

  if (items === null) return <ListSkeleton />
  if (items.length === 0) {
    return (
      <EmptyState
        title="You're not following anyone yet"
        hint="Try the Add Friend tab to find people."
      />
    )
  }

  const renderRow = (u: FriendListItem) => (
    <FriendRow
      key={u._id}
      id={u._id}
      displayName={u.displayName}
      avatarUrl={u.avatarUrl}
      online={u.isOnline}
      meta={`${u.sharedGamesCount} shared games · ${u.sharedFriendsCount} shared friends`}
      actions={
        <>
          <ActionButton variant="default" ariaLabel={`Message ${u.displayName}`} onClick={() => openChat(u._id)}>
            Message
          </ActionButton>
          <ActionButton variant="muted" ariaLabel={`Unfollow ${u.displayName}`} onClick={() => handleUnfollow(u._id)}>
            ×
          </ActionButton>
        </>
      }
    />
  )

  return (
    <div className="flex flex-col gap-3">
      <FriendSearchBar value={filter} onChange={setFilter} />
      {online.length > 0 && <GroupHeader label="Online" count={online.length} color="#44d62c" />}
      {online.map(renderRow)}
      {offline.length > 0 && <GroupHeader label="Offline" count={offline.length} color="rgba(255,255,255,0.45)" />}
      {offline.map(renderRow)}
      {filtered && filtered.length === 0 && (
        <p className="text-center text-[12px] py-6" style={{ color: "rgba(255,255,255,0.35)" }}>
          No matches for "{filter}"
        </p>
      )}
    </div>
  )
}
