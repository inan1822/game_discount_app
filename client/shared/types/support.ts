export type TicketSubject =
  | "key_not_working"
  | "key_already_used"
  | "wrong_region"
  | "bought_by_mistake"
  | "wrong_product"
  | "missing_key"
  | "other"

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed"

export interface TicketMessage {
  senderRole: "user" | "admin"
  senderId:   string
  body:       string
  createdAt:  string
}

export interface Ticket {
  _id:         string
  userId:      string
  userEmail:   string
  orderId:     string
  orderRef:    string
  productName: string
  subject:     TicketSubject
  description: string
  status:      TicketStatus
  messages:    TicketMessage[]
  createdAt:   string
  updatedAt:   string
}

export interface TicketsPage {
  tickets: Ticket[]
  total:   number
  page:    number
  pages:   number
}

export const SUBJECT_LABELS: Record<TicketSubject, string> = {
  key_not_working:  "Key not working",
  key_already_used: "Key already used",
  wrong_region:     "Wrong region",
  bought_by_mistake:"Bought by mistake",
  wrong_product:    "Wrong product",
  missing_key:      "Missing key",
  other:            "Other issue",
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open:        "Open",
  in_progress: "In Progress",
  resolved:    "Resolved",
  closed:      "Closed",
}

export const STATUS_COLORS: Record<TicketStatus, string> = {
  open:        "#6475D1",
  in_progress: "#F59E0B",
  resolved:    "#44d62c",
  closed:      "#9fa0a1",
}
