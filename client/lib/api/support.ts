import api from "./axios"
import axios from "axios"
import type { Ticket, TicketsPage, TicketSubject } from "@/types/support"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// ── Feedback / Bug (existing) ─────────────────────────────────────────────────

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

// ── Support Tickets ───────────────────────────────────────────────────────────

export async function createTicket(data: {
  orderId:     string
  subject:     TicketSubject
  description: string
}): Promise<Ticket> {
  const { data: res } = await axios.post(
    `${API_URL}/api/v1/support/tickets`,
    data,
    { withCredentials: true },
  )
  return res.data as Ticket
}

export async function fetchMyTickets(page = 1): Promise<TicketsPage> {
  const { data } = await axios.get(
    `${API_URL}/api/v1/support/tickets?page=${page}`,
    { withCredentials: true },
  )
  return data.data as TicketsPage
}

export async function fetchMyTicket(id: string): Promise<Ticket> {
  const { data } = await axios.get(
    `${API_URL}/api/v1/support/tickets/${id}`,
    { withCredentials: true },
  )
  return data.data as Ticket
}

export async function addTicketMessage(ticketId: string, body: string): Promise<Ticket> {
  const { data } = await axios.post(
    `${API_URL}/api/v1/support/tickets/${ticketId}/messages`,
    { body },
    { withCredentials: true },
  )
  return data.data as Ticket
}

// ── Key reveal ────────────────────────────────────────────────────────────────

export async function fetchOrderKey(orderId: string): Promise<string | null> {
  try {
    const { data } = await axios.get(
      `${API_URL}/api/v1/checkout/orders/${orderId}/key`,
      { withCredentials: true },
    )
    return (data?.data?.code as string) ?? null
  } catch {
    return null
  }
}
