import api from "./axios"

export async function submitFeedback(payload: { text: string; email?: string }): Promise<void> {
  await api.post("/support/feedback", payload)
}

export async function submitBug(payload: {
  steps: string
  expected: string
  device: string
  email?: string
}): Promise<void> {
  await api.post("/support/bug", payload)
}

export async function exportMyData(): Promise<void> {
  const response = await api.get("/support/export", { responseType: "blob" })
  const url  = URL.createObjectURL(new Blob([response.data], { type: "application/json" }))
  const link = document.createElement("a")
  link.href  = url
  const disposition = response.headers["content-disposition"] as string | undefined
  const match = disposition?.match(/filename="(.+)"/)
  link.download = match?.[1] ?? `dislow-data-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
