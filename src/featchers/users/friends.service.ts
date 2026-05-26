import mongoose from "mongoose"
import userModel, { IUser } from "./User.model.js"
import WishlistModel from "../wishlist/Wishlist.model.js"
import { AppError } from "../../shared/utils/AppError.js"

// Users are "online" if seen within this window.
const ONLINE_WINDOW_MS = 2 * 60 * 1000

export type Relationship =
    | "self"
    | "following"
    | "requested"           // me → them (pending)
    | "they-requested-me"   // them → me (pending)
    | "follows-me"
    | "friends"             // mutual follow
    | "none"

export interface FriendListItem {
    _id: string
    displayName: string
    avatarUrl: string | null
    isOnline: boolean
    sharedGamesCount: number
    sharedFriendsCount: number
}

export interface FollowRequestUser {
    _id: string
    displayName: string
    avatarUrl: string | null
}

export interface PublicProfile {
    _id: string
    displayName: string
    avatarUrl: string | null
    isPrivate: boolean
    isOnline: boolean
    followingCount: number
    followersCount: number
    sharedFriendsCount: number
    sharedGamesCount: number
    relationship: Relationship
    favorites: Array<{
        gameId: string
        gameName: string
        gameCover: string | null
        gameSlug: string
    }> | null
}

export interface UserSearchResult {
    _id: string
    displayName: string
    avatarUrl: string | null
    isPrivate: boolean
    relationship: Relationship
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isOnline(lastSeenAt: Date | undefined | null): boolean {
    if (!lastSeenAt) return false
    return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS
}

function toStr(id: mongoose.Types.ObjectId | string): string {
    return typeof id === "string" ? id : id.toString()
}

function arrayHas(arr: mongoose.Types.ObjectId[] | undefined, id: string): boolean {
    if (!arr) return false
    return arr.some(x => toStr(x) === id)
}

/**
 * Compute relationship from me's perspective toward target.
 * Single source of truth — used by search, profile, and list endpoints.
 */
export function computeRelationship(me: IUser, targetId: string): Relationship {
    const meId = toStr(me._id)
    if (meId === targetId) return "self"

    const iFollowThem    = arrayHas(me.following, targetId)
    const theyFollowMe   = arrayHas(me.followers, targetId)
    const iRequestedThem = arrayHas(me.followRequests?.outgoing, targetId)
    const theyRequestedMe = arrayHas(me.followRequests?.incoming, targetId)

    if (iFollowThem && theyFollowMe) return "friends"
    if (iFollowThem)                  return "following"
    if (iRequestedThem)               return "requested"
    if (theyRequestedMe)              return "they-requested-me"
    if (theyFollowMe)                 return "follows-me"
    return "none"
}

/**
 * For a given "me" + list of friend ids, compute sharedGames per friend in a
 * single aggregation. Returns a Map<friendId, count>.
 *
 * Relies on Wishlist's existing { userId: 1, gameId: 1 } unique index.
 */
async function computeSharedGames(
    meId: string,
    friendIds: string[],
): Promise<Map<string, number>> {
    if (friendIds.length === 0) return new Map()

    const myGames = await WishlistModel
        .find({ userId: meId })
        .select("gameId")
        .lean()
    const mySet = new Set(myGames.map(g => g.gameId))
    if (mySet.size === 0) return new Map(friendIds.map(id => [id, 0]))

    const rows = await WishlistModel.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
        { $match: {
            userId: { $in: friendIds.map(id => new mongoose.Types.ObjectId(id)) },
            gameId: { $in: Array.from(mySet) },
        }},
        { $group: { _id: "$userId", count: { $sum: 1 } } },
    ])

    const out = new Map<string, number>(friendIds.map(id => [id, 0]))
    rows.forEach(r => out.set(toStr(r._id), r.count))
    return out
}

function sharedFriendsCount(me: IUser, other: IUser): number {
    const mine = new Set((me.following ?? []).map(toStr))
    let count = 0
    for (const id of other.following ?? []) {
        if (mine.has(toStr(id))) count++
    }
    return count
}

function toListItem(
    other: IUser,
    sharedGames: number,
    sharedFriends: number,
): FriendListItem {
    return {
        _id:                toStr(other._id),
        displayName:        other.name,
        avatarUrl:          other.avatar ?? null,
        isOnline:           isOnline(other.lastSeenAt),
        sharedGamesCount:   sharedGames,
        sharedFriendsCount: sharedFriends,
    }
}

// ─── List endpoints ───────────────────────────────────────────────────────────

async function listSocialField(
    userId: string,
    field: "following" | "followers",
): Promise<FriendListItem[]> {
    const me = await userModel.findById(userId).lean<IUser>()
    if (!me) throw new AppError("User not found", 404)

    const ids = (me[field] ?? []).map(toStr)
    if (ids.length === 0) return []

    const others = await userModel
        .find({ _id: { $in: ids } })
        .select("_id name avatar lastSeenAt following")
        .lean<IUser[]>()

    const sharedGames = await computeSharedGames(userId, ids)

    return others.map(o =>
        toListItem(o, sharedGames.get(toStr(o._id)) ?? 0, sharedFriendsCount(me, o)),
    )
}

export const listFollowingService = (userId: string) => listSocialField(userId, "following")
export const listFollowersService = (userId: string) => listSocialField(userId, "followers")

export const listRequestsService = async (userId: string): Promise<{
    incoming: FollowRequestUser[]
    outgoing: FollowRequestUser[]
}> => {
    const me = await userModel.findById(userId).lean<IUser>()
    if (!me) throw new AppError("User not found", 404)

    const incomingIds = (me.followRequests?.incoming ?? []).map(toStr)
    const outgoingIds = (me.followRequests?.outgoing ?? []).map(toStr)
    const allIds = Array.from(new Set([...incomingIds, ...outgoingIds]))
    if (allIds.length === 0) return { incoming: [], outgoing: [] }

    const users = await userModel
        .find({ _id: { $in: allIds } })
        .select("_id name avatar")
        .lean<IUser[]>()
    const byId = new Map<string, IUser>(users.map(u => [toStr(u._id), u]))

    const shape = (id: string): FollowRequestUser | null => {
        const u = byId.get(id)
        if (!u) return null
        return { _id: id, displayName: u.name, avatarUrl: u.avatar ?? null }
    }
    return {
        incoming: incomingIds.map(shape).filter((x): x is FollowRequestUser => x !== null),
        outgoing: outgoingIds.map(shape).filter((x): x is FollowRequestUser => x !== null),
    }
}

// ─── Follow / Unfollow ────────────────────────────────────────────────────────

export const followService = async (
    meId: string,
    targetId: string,
): Promise<{ status: "following" | "requested" }> => {
    if (meId === targetId) throw new AppError("Cannot follow yourself", 400)

    const target = await userModel.findById(targetId)
    if (!target) throw new AppError("User not found", 404)

    const me = await userModel.findById(meId)
    if (!me) throw new AppError("User not found", 404)

    if (arrayHas(me.following, targetId)) {
        // Already following — return current state, no error
        return { status: "following" }
    }

    if (target.isPrivate) {
        if (arrayHas(target.followRequests?.incoming, meId)) {
            return { status: "requested" }
        }
        await Promise.all([
            userModel.updateOne(
                { _id: targetId },
                { $addToSet: { "followRequests.incoming": me._id } },
            ),
            userModel.updateOne(
                { _id: meId },
                { $addToSet: { "followRequests.outgoing": target._id } },
            ),
        ])
        return { status: "requested" }
    }

    await Promise.all([
        userModel.updateOne(
            { _id: meId },
            { $addToSet: { following: target._id } },
        ),
        userModel.updateOne(
            { _id: targetId },
            { $addToSet: { followers: me._id } },
        ),
    ])
    return { status: "following" }
}

/** Handles both unfollow and cancel-outgoing-request. Always idempotent. */
export const unfollowService = async (
    meId: string,
    targetId: string,
): Promise<void> => {
    if (meId === targetId) return  // no-op, don't leak via error

    const meObjId     = new mongoose.Types.ObjectId(meId)
    const targetObjId = new mongoose.Types.ObjectId(targetId)

    await Promise.all([
        userModel.updateOne(
            { _id: meId },
            {
                $pull: {
                    following:                    targetObjId,
                    "followRequests.outgoing":    targetObjId,
                },
            },
        ),
        userModel.updateOne(
            { _id: targetId },
            {
                $pull: {
                    followers:                    meObjId,
                    "followRequests.incoming":    meObjId,
                },
            },
        ),
    ])
}

// ─── Accept / Decline incoming request ────────────────────────────────────────

export const acceptRequestService = async (
    meId: string,
    requesterId: string,
): Promise<void> => {
    const me = await userModel.findById(meId)
    if (!me) throw new AppError("User not found", 404)
    if (!arrayHas(me.followRequests?.incoming, requesterId)) {
        throw new AppError("No pending request from this user", 404)
    }

    const meObjId   = new mongoose.Types.ObjectId(meId)
    const reqObjId  = new mongoose.Types.ObjectId(requesterId)

    // Two atomic updates. The follow graph is symmetric: we accept partial
    // failure recovery on retry — re-running these ops with $addToSet/$pull
    // is safe and converges.
    await Promise.all([
        userModel.updateOne(
            { _id: meId },
            {
                $pull: { "followRequests.incoming": reqObjId },
                $addToSet: { followers: reqObjId },
            },
        ),
        userModel.updateOne(
            { _id: requesterId },
            {
                $pull: { "followRequests.outgoing": meObjId },
                $addToSet: { following: meObjId },
            },
        ),
    ])
}

export const declineRequestService = async (
    meId: string,
    requesterId: string,
): Promise<void> => {
    const meObjId  = new mongoose.Types.ObjectId(meId)
    const reqObjId = new mongoose.Types.ObjectId(requesterId)

    await Promise.all([
        userModel.updateOne(
            { _id: meId },
            { $pull: { "followRequests.incoming": reqObjId } },
        ),
        userModel.updateOne(
            { _id: requesterId },
            { $pull: { "followRequests.outgoing": meObjId } },
        ),
    ])
}

// ─── Search users ─────────────────────────────────────────────────────────────

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export const searchUsersService = async (
    meId: string,
    q: string,
    limit: number,
): Promise<UserSearchResult[]> => {
    const me = await userModel.findById(meId).lean<IUser>()
    if (!me) throw new AppError("User not found", 404)

    const pattern = new RegExp("^" + escapeRegExp(q))
    const users = await userModel
        .find({
            _id:  { $ne: me._id },
            name: { $regex: pattern },
        })
        .collation({ locale: "en", strength: 2 })  // match the index
        .select("_id name avatar isPrivate")
        .limit(limit)
        .lean<IUser[]>()

    return users.map(u => {
        const id = toStr(u._id)
        return {
            _id:          id,
            displayName:  u.name,
            avatarUrl:    u.avatar ?? null,
            isPrivate:    !!u.isPrivate,
            relationship: computeRelationship(me, id),
        }
    })
}

// ─── Public profile ───────────────────────────────────────────────────────────

export const getPublicProfileService = async (
    meId: string,
    targetId: string,
): Promise<PublicProfile> => {
    const me = await userModel.findById(meId).lean<IUser>()
    if (!me) throw new AppError("User not found", 404)
    const target = await userModel.findById(targetId).lean<IUser>()
    if (!target) throw new AppError("User not found", 404)

    const relationship = computeRelationship(me, targetId)
    const targetIsFollowing =
        relationship === "following" || relationship === "friends"

    const sharedFriends = sharedFriendsCount(me, target)
    const sharedMap = await computeSharedGames(meId, [targetId])
    const sharedGames = sharedMap.get(targetId) ?? 0

    let favorites: PublicProfile["favorites"] = null
    const canSeeFavorites = !target.isPrivate || targetIsFollowing || relationship === "self"
    if (canSeeFavorites) {
        const items = await WishlistModel
            .find({ userId: targetId })
            .select("gameId gameName gameCover gameSlug")
            .lean()
        favorites = items.map(i => ({
            gameId:    i.gameId,
            gameName:  i.gameName,
            gameCover: i.gameCover,
            gameSlug:  i.gameSlug,
        }))
    }

    return {
        _id:                targetId,
        displayName:        target.name,
        avatarUrl:          target.avatar ?? null,
        isPrivate:          !!target.isPrivate,
        isOnline:           isOnline(target.lastSeenAt),
        followingCount:     (target.following ?? []).length,
        followersCount:     (target.followers ?? []).length,
        sharedFriendsCount: sharedFriends,
        sharedGamesCount:   sharedGames,
        relationship,
        favorites,
    }
}
