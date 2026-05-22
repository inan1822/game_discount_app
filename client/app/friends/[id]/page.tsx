"use client"

import { useCallback, useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Home, BellRing, Search as SearchIcon, Users, User, ArrowLeft, Lock, LogIn,
} from "lucide-react"
import { toast } from "react-toastify"
import { useAuth } from "@/context/AuthContext"
import PageBackground from "@/components/ui/PageBackground"
import NotificationDot from "@/components/ui/NotificationDot"
import { useUnreadCount } from "@/hooks/useUnreadCount"
import Avatar from "@/components/friends/Avatar"
import { ActionButton } from "@/components/friends/FriendRow"
import { getFriendProfile, follow, unfollow, acceptRequest } from "@/lib/api/users"
import type { FriendProfile, Relationship } from "@/types/user"

const NAV = [
  { icon: Home,        label: "Home",          href: "/"              },
  { icon: BellRing,    label: "Notifications", href: "/notifications" },
  { icon: SearchIcon,  label: "Search",        href: "/search"        },
  { icon: Users,       label: "Friends",       href: "/friends"       },
  { icon: User,        label: "Profile",       href: "/profile"       },
] as const

const glassStyle = {
  background: "rgba(30, 38, 51, 0.70)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
} as const

function ActionRow({
  relationship, isPrivate, onPrimary,
}: { relationship: Relationship; isPrivate: boolean; onPrimary: () => void }) {
  switch (relationship) {
    case "friends":
    case "following":
      return (
        <div className="flex gap-2">
          <ActionButton variant="muted"   onClick={onPrimary} ariaLabel="Unfollow">Unfollow</ActionButton>
          <ActionButton variant="default" onClick={() => toast.info("Messaging coming soon")}>Message</ActionButton>
        </div>
      )
    case "requested":
      return <ActionButton variant="muted" onClick={onPrimary}>Cancel Request</ActionButton>
    case "they-requested-me":
      return <ActionButton variant="primary" onClick={onPrimary}>Accept</ActionButton>
    case "follows-me":
      return (
        <div className="flex gap-2">
          <ActionButton variant="primary" onClick={onPrimary}>Follow Back</ActionButton>
          <ActionButton variant="default" onClick={() => toast.info("Messaging coming soon")}>Message</ActionButton>
        </div>
      )
    default:
      return (
        <ActionButton variant="primary" onClick={onPrimary}>
          {isPrivate ? "Request" : "Follow"}
        </ActionButton>
      )
  }
}

export default function FriendProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user: me, logout, isLoading } = useAuth()
  const { counts } = useUnreadCount()
  const isLoggedIn = !!me

  const [profile,  setProfile]  = useState<FriendProfile | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [pending,  setPending]  = useState(false)

  useEffect(() => {
    if (!isLoading && !isLoggedIn) router.replace("/login")
  }, [isLoading, isLoggedIn, router])

  useEffect(() => {
    if (!isLoggedIn) return
    let cancelled = false
    getFriendProfile(id)
      .then(p => {
        if (cancelled) return
        if (p.relationship === "self") {
          router.replace("/profile")
          return
        }
        setProfile(p)
      })
      .catch(err => {
        if (cancelled) return
        if (err?.response?.status === 404) setNotFound(true)
      })
    return () => { cancelled = true }
  }, [id, isLoggedIn, router])

  const handlePrimary = useCallback(async () => {
    if (!profile || pending) return
    setPending(true)
    const prev = profile.relationship
    const isUnfollowAction =
      prev === "following" || prev === "friends" || prev === "requested"
    // "they-requested-me" → accept their request (NOT a follow). Accepting only
    // makes THEM follow me; if I want to follow them back, that's a second step.
    const isAcceptAction = prev === "they-requested-me"
    try {
      if (isUnfollowAction) {
        await unfollow(profile._id)
        setProfile(p => p ? {
          ...p,
          relationship: prev === "friends" ? "follows-me" : "none",
        } : p)
      } else if (isAcceptAction) {
        await acceptRequest(profile._id)
        setProfile(p => p ? { ...p, relationship: "follows-me" } : p)
      } else {
        const res = await follow(profile._id)
        const finalRel: Relationship = res.status === "requested"
          ? "requested"
          : (prev === "follows-me" ? "friends" : "following")
        setProfile(p => p ? { ...p, relationship: finalRel } : p)
      }
    } catch {
      toast.error("Couldn't update. Try again.")
    } finally {
      setPending(false)
    }
  }, [profile, pending])

  if (notFound) {
    return (
      <main className="relative w-screen h-screen flex items-center justify-center" style={{ background: "#1E2532" }}>
        <div className="text-center">
          <p className="text-white text-[18px] font-semibold mb-2">User not found</p>
          <button
            onClick={() => router.push("/friends")}
            className="text-[13px] underline"
            style={{ color: "#48BCF9" }}
          >
            Back to friends
          </button>
        </div>
      </main>
    )
  }

  if (isLoading || !isLoggedIn || !profile) return null

  const canSeeFavorites = profile.favorites !== null
  const isFollowing = profile.relationship === "following" || profile.relationship === "friends"

  return (
    <main className="relative w-screen h-screen overflow-hidden" style={{ background: "#1E2532" }}>
      <PageBackground />

      <div className="relative flex h-full" style={{ zIndex: 3 }}>
        {/* SIDEBAR */}
        <aside
          className="flex flex-col flex-shrink-0 h-full"
          style={{ width: 240, ...glassStyle, borderRight: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-3 px-5 pt-6 pb-5">
            <img src="/icons/logo.svg" alt="" style={{ width: 30, height: 30 }} />
            <span className="text-white font-bold text-[17px] tracking-wide">DisLow</span>
          </div>
          <div className="px-3 mb-1">
            <p className="text-[9px] font-bold tracking-[0.12em] px-3 mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>MENU</p>
            {NAV.map(({ icon: Icon, label, href }) => {
              const active = label === "Friends"
              return (
                <button
                  key={label}
                  onClick={() => router.push(href)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 mb-0.5 text-[16px] font-medium relative"
                  style={{
                    borderRadius: 10,
                    color: active ? "#48BCF9" : "rgba(255,255,255,0.45)",
                    background: active ? "rgba(52,82,229,0.13)" : "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {active && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2"
                      style={{ width: 3, height: 20, background: "#48BCF9", borderRadius: "0 4px 4px 0" }}
                    />
                  )}
                  <Icon size={15} />
                  <span className="flex-1 text-left">{label}</span>
                  {label === "Notifications" && (
                    <NotificationDot events={counts.events} discounts={counts.discounts} />
                  )}
                </button>
              )
            })}
          </div>
          <div className="flex-1" />
          {isLoggedIn ? (
            <button
              onClick={logout}
              className="flex items-center gap-3 px-8 py-5 text-[16px] font-medium"
              style={{ color: "rgba(255,255,255,0.35)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B4A]" />log out
            </button>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="flex items-center gap-3 px-8 py-5 text-[16px] font-semibold"
              style={{ color: "#48BCF9", borderTop: "1px solid rgba(255,255,255,0.05)" }}
            >
              <LogIn size={15} />Log in
            </button>
          )}
        </aside>

        {/* RIGHT */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto" style={{ paddingLeft: 20, paddingRight: 80, paddingTop: 20, scrollbarWidth: "none" }}>

            {/* Back button — glassmorphism per design rules */}
            <button
              onClick={() => router.push("/friends")}
              className="inline-flex items-center gap-2 px-3 py-1.5 mb-5 text-[13px]"
              style={{
                background: "rgba(28,30,42,0.60)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                borderRadius: 10,
                color: "#b3bade",
                border: "none",
                cursor: "pointer",
              }}
              aria-label="Back to friends"
            >
              <ArrowLeft size={14} /> Back
            </button>

            {/* Header banner */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative flex flex-col items-center text-center px-6 pt-10 pb-7 mb-6"
              style={{
                background: "radial-gradient(circle at 50% 0%, rgba(174,59,214,0.30), transparent 70%), rgba(28,30,42,0.70)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 14,
                backdropFilter: "blur(8px)",
              }}
            >
              <Avatar
                name={profile.displayName}
                url={profile.avatarUrl}
                online={profile.isOnline}
                size={96}
              />
              <h1 className="text-white text-[22px] font-bold mt-3">{profile.displayName}</h1>
              <p className="text-[12px] mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                {profile.sharedFriendsCount} shared friends · {profile.sharedGamesCount} shared games
              </p>
              <div className="mt-4">
                <ActionRow
                  relationship={profile.relationship}
                  isPrivate={profile.isPrivate}
                  onPrimary={handlePrimary}
                />
              </div>
            </motion.div>

            {/* Stats row */}
            <div
              className="grid grid-cols-2 gap-3 mb-6"
            >
              {[
                { n: profile.followingCount, l: "Following" },
                { n: profile.followersCount, l: "Followers" },
              ].map(s => (
                <div
                  key={s.l}
                  className="flex flex-col items-center py-4"
                  style={{
                    background: "rgba(28,30,42,0.70)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 14,
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <span className="text-white text-[20px] font-bold">{s.n}</span>
                  <span className="text-[10px] tracking-widest mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {s.l.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>

            {/* Favorites */}
            <h2 className="text-white text-[16px] font-bold mb-3">
              {profile.displayName}&apos;s favorites
            </h2>
            {!canSeeFavorites ? (
              <div
                className="flex flex-col items-center justify-center text-center py-12 mb-12"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px dashed rgba(255,255,255,0.08)",
                  borderRadius: 14,
                }}
              >
                <Lock size={28} className="mb-2" style={{ color: "rgba(255,255,255,0.3)" }} />
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                  This account is private.
                </p>
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {isFollowing ? "Loading their games..." : "Follow to see their games."}
                </p>
              </div>
            ) : profile.favorites!.length === 0 ? (
              <p className="text-[12px] py-6 text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
                No favorites yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pb-12">
                {profile.favorites!.map(fav => (
                  <button
                    key={fav.gameId}
                    onClick={() => router.push(`/game/${fav.gameId}`)}
                    className="relative overflow-hidden text-left"
                    style={{
                      borderRadius: 15,
                      border: "1px solid rgba(255,255,255,0.05)",
                      background: "rgba(28,30,42,0.70)",
                      aspectRatio: "3 / 4",
                      cursor: "pointer",
                    }}
                  >
                    {fav.gameCover ? (
                      <img
                        src={fav.gameCover}
                        alt={fav.gameName}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30 text-[12px]">
                        No cover
                      </div>
                    )}
                    <div
                      className="absolute bottom-0 left-0 right-0 px-3 py-2"
                      style={{
                        background: "rgba(28,30,42,0.70)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                      }}
                    >
                      <p className="text-white text-[12px] font-semibold truncate">{fav.gameName}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
