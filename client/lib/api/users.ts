import api from "./axios"
import type {
  FriendListItem,
  FollowRequestUser,
  UserSearchResult,
  FriendProfile,
  FriendWithGame,
} from "@/types/user"

export interface MyStats {
  following: number
  followers: number
  favorites: number
}

export async function getMyStats(): Promise<MyStats> {
  const { data } = await api.get("/users/me/stats")
  return data.data as MyStats
}

export async function getAvatarGallery(): Promise<string[]> {
  const { data } = await api.get("/users/me/avatar-gallery")
  return data.data as string[]
}

export async function updateNotificationPrefs(prefs: {
  events?: boolean
  discounts?: boolean
  discountThreshold?: number
}): Promise<void> {
  await api.patch("/users/me/notification-prefs", prefs)
}

export async function updatePrivacy(isPrivate: boolean): Promise<void> {
  await api.patch("/users/me/privacy", { isPrivate })
}

export interface EditProfilePayload {
  name?: string
  email?: string
  currentPassword: string
}

export interface EditProfileResult {
  emailChangePending?: boolean
  user?: import("@/types/user").User
}

export async function editProfile(payload: EditProfilePayload): Promise<EditProfileResult> {
  const { data } = await api.patch("/users/me/profile", payload)
  return data.data as EditProfileResult
}

export async function confirmPendingEmail(code: string): Promise<import("@/types/user").User> {
  const { data } = await api.post("/users/me/confirm-email", { code })
  return data.data as import("@/types/user").User
}

export async function changePassword(payload: {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}): Promise<void> {
  await api.patch("/users/me/password", payload)
}

export async function disconnectProvider(provider: "google" | "discord" | "steam"): Promise<void> {
  await api.delete(`/users/me/providers/${provider}`)
}

export async function deleteAccount(payload: {
  password: string
  confirmPhrase: string
}): Promise<void> {
  await api.delete("/users/me/account", { data: payload })
}

// ─── Friends system ─────────────────────────────────────────────────────────

export async function listFollowing(): Promise<FriendListItem[]> {
  const { data } = await api.get("/users/me/following")
  return data.data as FriendListItem[]
}

export async function listFollowers(): Promise<FriendListItem[]> {
  const { data } = await api.get("/users/me/followers")
  return data.data as FriendListItem[]
}

export async function listRequests(): Promise<{
  incoming: FollowRequestUser[]
  outgoing: FollowRequestUser[]
}> {
  const { data } = await api.get("/users/me/requests")
  return data.data as { incoming: FollowRequestUser[]; outgoing: FollowRequestUser[] }
}

export async function follow(userId: string): Promise<{ status: "following" | "requested" }> {
  const { data } = await api.post(`/users/${userId}/follow`)
  return data.data as { status: "following" | "requested" }
}

export async function unfollow(userId: string): Promise<void> {
  await api.delete(`/users/${userId}/follow`)
}

export async function acceptRequest(requesterId: string): Promise<void> {
  await api.post(`/users/requests/${requesterId}/accept`)
}

export async function declineRequest(requesterId: string): Promise<void> {
  await api.delete(`/users/requests/${requesterId}/decline`)
}

export async function searchUsers(q: string, signal?: AbortSignal): Promise<UserSearchResult[]> {
  const { data } = await api.get("/users/search", { params: { q }, signal })
  return data.data as UserSearchResult[]
}

export async function listFriendsWithGame(gameId: string): Promise<FriendWithGame[]> {
  const { data } = await api.get(`/wishlist/friends/${gameId}`)
  return data.data as FriendWithGame[]
}

export async function getFriendProfile(userId: string): Promise<FriendProfile> {
  const { data } = await api.get(`/users/${userId}/profile`)
  return data.data as FriendProfile
}

export async function updateAvatar(payload: { avatarUrl?: string; file?: File }): Promise<string> {
  const form = new FormData()
  if (payload.file) {
    form.append("avatar", payload.file)
  } else if (payload.avatarUrl) {
    form.append("avatarUrl", payload.avatarUrl)
  }
  const { data } = await api.patch("/users/me/avatar", form, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return (data.data as { avatarUrl: string }).avatarUrl
}
