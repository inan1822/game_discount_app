"use client"

import { useCallback, useEffect, useState, use, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Lock } from "lucide-react"
import { toast } from "react-toastify"
import { useAuth } from "@/features/auth/state/AuthContext"
import Avatar from "@/components/friends/Avatar"
import { ActionButton } from "@/components/friends/FriendRow"
import { SectionHeading } from "@/shared/components/SectionHeading"
import { getFriendProfile, follow, unfollow, acceptRequest } from "@/features/profile/services/users"
import { getGameById } from "@/features/products/services/games"
import { useChat } from "@/features/chat/state/ChatContext"
import { useCardPrice } from "@/features/products/utils/useCardPrice"
import type { FriendProfile, FriendProfileFavorite, Relationship } from "@/shared/types/user"
import type { Game } from "@/shared/types/game"

function platformLabel(p: string): string {
  const s = p.toLowerCase()
  if (s.includes("playstation") || s.includes("ps5") || s.includes("ps4") || s.includes("ps3")) return "PS"
  if (s.includes("xbox"))       return "Xbox"
  if (s.includes("nintendo") || s.includes("switch")) return "Switch"
  if (s.includes("pc") || s.includes("windows") || s.includes("linux") || s.includes("mac")) return "PC"
  if (s.includes("ios") || s.includes("iphone") || s.includes("ipad")) return "iOS"
  if (s.includes("android"))    return "Android"
  return p.slice(0, 5)
}

function FriendFavCard({ fav, onClick }: { fav: FriendProfileFavorite; onClick: () => void }) {
  const [fullGame, setFullGame] = useState<Game | null>(null)

  useEffect(() => {
    getGameById(fav.gameId)
      .then(g => setFullGame(g))
      .catch(() => {})
  }, [fav.gameId])

  const game = useMemo<Game>(() => ({
    id:         Number(fav.gameId),
    slug:       fav.gameSlug,
    name:       fav.gameName,
    cover:      fav.gameCover,
    rating:     fullGame?.rating     ?? 0,
    genres:     fullGame?.genres     ?? [],
    platforms:  fullGame?.platforms  ?? [],
    released:   fullGame?.released   ?? "",
    metacritic: fullGame?.metacritic ?? null,
    steamAppId: fullGame?.steamAppId,
  }), [fav.gameId, fav.gameName, fav.gameCover, fav.gameSlug, fullGame])

  const price     = useCardPrice(game)
  const platforms = fullGame
    ? [...new Set((fullGame.platforms as string[])
        .filter((p): p is string => typeof p === "string")
        .map(platformLabel))].slice(0, 4)
    : []

  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden text-left"
      style={{
        borderRadius: 15,
        border:       "1px solid rgba(31,37,57,0.6)",
        background:   "rgba(28,30,42,0.70)",
        width:        420,
        height:       240,
        flexShrink:   0,
        cursor:       "pointer",
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
        <div className="w-full h-full flex items-center justify-center" style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
          No cover
        </div>
      )}

      {/* Frosted glass overlay — design spec: rgba(28,30,42,0.70) + blur(8px) + 0 0 15px 15px radius */}
      <div
        className="absolute bottom-0 left-0 right-0 px-3 py-2"
        style={{
          background:           "rgba(28,30,42,0.70)",
          backdropFilter:       "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderRadius:         "0 0 15px 15px",
        }}
      >
        {/* Game name */}
        <p style={{ color: "white", fontSize: 13, fontWeight: 700, lineHeight: 1.2 }} className="truncate">
          {fav.gameName}
        </p>

        {/* Platform pills — muted, never brand colors (rule #14) */}
        {platforms.length > 0 && (
          <div className="flex gap-1 flex-wrap" style={{ marginTop: 4 }}>
            {platforms.map(pl => (
              <span
                key={pl}
                style={{
                  background:   "rgba(255,255,255,0.08)",
                  color:        "rgba(255,255,255,0.55)",
                  borderRadius: 4,
                  fontSize:     10,
                  fontWeight:   500,
                  padding:      "1px 5px",
                }}
              >
                {pl}
              </span>
            ))}
          </div>
        )}

        {/* Lowest price — 4-state orchestrator spec */}
        <p
          style={{
            marginTop:  5,
            fontSize:   13,
            fontWeight: 700,
            color:      price === undefined ? "rgba(255,255,255,0.18)"
                      : price === null      ? "rgba(255,255,255,0.30)"
                      : price.isFree        ? "#48BCF9"
                      : "#5BDE8A",
          }}
        >
          {price === undefined ? "···"
           : price === null    ? "—"
           : price.isFree      ? "Free"
           : `$${price.price.toFixed(2)}`}
          {price && price.cut > 0 && (
            <span
              style={{
                marginLeft:   6,
                background:   "rgba(68,214,44,0.12)",
                color:        "#44d62c",
                borderRadius: 4,
                fontSize:     10,
                fontWeight:   700,
                padding:      "1px 5px",
              }}
            >
              -{price.cut}%
            </span>
          )}
        </p>
      </div>
    </button>
  )
}

const BTN16: React.CSSProperties = { fontSize: 16, padding: "8px 20px" }

function ActionRow({
  relationship, isPrivate, onPrimary, onMessage,
}: { relationship: Relationship; isPrivate: boolean; onPrimary: () => void; onMessage: () => void }) {
  switch (relationship) {
    case "friends":
    case "following":
      return (
        <div className="flex gap-2">
          <ActionButton variant="muted"   onClick={onPrimary} ariaLabel="Unfollow" style={BTN16}>Unfollow</ActionButton>
          <ActionButton variant="default" onClick={onMessage} style={BTN16}>Message</ActionButton>
        </div>
      )
    case "requested":
      return <ActionButton variant="muted" onClick={onPrimary} style={BTN16}>Cancel Request</ActionButton>
    case "they-requested-me":
      return <ActionButton variant="primary" onClick={onPrimary} style={BTN16}>Accept</ActionButton>
    case "follows-me":
      return (
        <div className="flex gap-2">
          <ActionButton variant="primary" onClick={onPrimary} style={BTN16}>Follow Back</ActionButton>
          <ActionButton variant="default" onClick={onMessage} style={BTN16}>Message</ActionButton>
        </div>
      )
    default:
      return (
        <ActionButton variant="primary" onClick={onPrimary} style={BTN16}>
          {isPrivate ? "Request" : "Follow"}
        </ActionButton>
      )
  }
}

export default function FriendProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user: me, isLoading } = useAuth()
  const { openChat } = useChat()
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
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-[18px] font-semibold mb-2">User not found</p>
          <button
            onClick={() => router.push("/friends")}
            className="text-[13px] underline"
            style={{ color: "#6475D1" }}
          >
            Back to friends
          </button>
        </div>
      </div>
    )
  }

  if (isLoading || !isLoggedIn || !profile) return null

  const canSeeFavorites = profile.favorites !== null
  const isFollowing = profile.relationship === "following" || profile.relationship === "friends"

  return (
    // Shell (sidebar + background) provided by (app)/layout.tsx
    <div
      style={{
        width:        "min(calc(100% - 192px), 1600px)",
        marginInline: "auto",
        paddingBlock: 40,
      }}
    >
            {/* Header banner — back button lives inside */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative flex flex-col items-center text-center px-6 pt-6 pb-7 mb-6"
              style={{
                background: "radial-gradient(circle at 50% 0%, rgba(174,59,214,0.30), transparent 70%), rgba(28,30,42,0.70)",
                border: "1px solid rgba(31,37,57,0.6)",
                borderRadius: 10,
                backdropFilter: "blur(8px)",
              }}
            >
              {/* Back button — top-left inside banner */}
              <button
                onClick={() => router.push("/friends")}
                className="absolute inline-flex items-center gap-2 px-3 py-1.5 text-[13px]"
                style={{
                  top: 14, left: 14,
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

              <Avatar
                name={profile.displayName}
                url={profile.avatarUrl}
                online={profile.isOnline}
                size={96}
              />
              <h1 className="text-white text-[22px] font-bold mt-3">{profile.displayName}</h1>
              <p className="mt-1" style={{ color: "rgba(255,255,255,0.45)", fontSize: 18 }}>
                {profile.sharedFriendsCount} shared friends · {profile.sharedGamesCount} shared games
              </p>

              {/* Following / Followers stats */}
              <div className="flex gap-10 mt-5">
                {[
                  { n: profile.followingCount, l: "FOLLOWING" },
                  { n: profile.followersCount, l: "FOLLOWERS" },
                ].map(s => (
                  <div key={s.l} className="flex flex-col items-center">
                    <span className="text-white font-bold" style={{ fontSize: 20 }}>{s.n}</span>
                    <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, letterSpacing: "0.1em", marginTop: 2 }}>
                      {s.l}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action buttons below the stats */}
              <div className="mt-4">
                <ActionRow
                  relationship={profile.relationship}
                  isPrivate={profile.isPrivate}
                  onPrimary={handlePrimary}
                  onMessage={() => openChat(profile._id)}
                />
              </div>
            </motion.div>

            {/* Favorites */}
            <SectionHeading title={`${profile.displayName}'s Favorites`} />
            {!canSeeFavorites ? (
              <div
                className="flex flex-col items-center justify-center text-center py-12 mb-12"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px dashed rgba(31,37,57,0.6)",
                  borderRadius: 10,
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
              <div className="flex flex-wrap pb-12" style={{ gap: 36 }}>
                {profile.favorites!.map(fav => (
                  <FriendFavCard
                    key={fav.gameId}
                    fav={fav}
                    onClick={() => router.push(`/game/${fav.gameId}`)}
                  />
                ))}
              </div>
            )}
    </div>
  )
}
