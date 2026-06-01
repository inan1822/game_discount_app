"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "react-toastify"
import { listFollowing, listFollowers, follow } from "@/features/profile/services/users"
import type { FriendListItem } from "@/shared/types/user"
import FriendRow, { ActionButton } from "./FriendRow"
import FriendSearchBar from "./FriendSearchBar"
import { ListSkeleton, EmptyState, GroupHeader } from "./PanelChrome"

export default function FollowersPanel() {
  const [items, setItems] = useState<FriendListItem[] | null>(null)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([listFollowers(), listFollowing()])
      .then(([followers, following]) => {
        if (cancelled) return
        setItems(followers)
        setFollowingIds(new Set(following.map(u => u._id)))
      })
      .catch(() => { if (!cancelled) setItems([]) })
    return () => { cancelled = true }
  }, [])

  const handleFollowBack = useCallback(async (id: string) => {
    setFollowingIds(prev => new Set(prev).add(id))
    try {
      await follow(id)
    } catch {
      // Refetch the truth instead of guessing — covers cases where the server
      // already changed state for other reasons (e.g. they unfollowed us).
      toast.error("Couldn't follow. Try again.")
      listFollowing().then(list => setFollowingIds(new Set(list.map(u => u._id)))).catch(() => {})
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
    return <EmptyState title="No followers yet" hint="Share your profile to get started." />
  }

  const renderRow = (u: FriendListItem) => {
    const isFollowing = followingIds.has(u._id)
    return (
      <FriendRow
        key={u._id}
        id={u._id}
        displayName={u.displayName}
        avatarUrl={u.avatarUrl}
        online={u.isOnline}
        meta={`${u.sharedGamesCount} shared games · ${u.sharedFriendsCount} shared friends`}
        actions={
          isFollowing ? (
            <ActionButton variant="muted" disabled>Friends</ActionButton>
          ) : (
            <ActionButton variant="primary" onClick={() => handleFollowBack(u._id)}>
              Follow Back
            </ActionButton>
          )
        }
      />
    )
  }

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
