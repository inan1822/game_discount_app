import api from "./axios"

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

export async function updateNotificationPrefs(prefs: { events?: boolean; discounts?: boolean }): Promise<void> {
  await api.patch("/users/me/notification-prefs", prefs)
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
