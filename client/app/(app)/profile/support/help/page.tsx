"use client"

import { useState } from "react"
import ProfileSubLayout from "@/components/profile/ProfileSubLayout"

const cardStyle = {
  background: "rgba(28,30,42,0.70)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 10,
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
} as const

interface QA { q: string; a: string }
interface Section { title: string; items: QA[] }

const FAQ: Section[] = [
  {
    title: "Getting started",
    items: [
      { q: "What is DisLow?", a: "DisLow is a game deal tracker that monitors prices across Steam, Epic, GOG, PlayStation Store, and Xbox Store. Add games to your Favorites and we'll notify you when the price drops or an in-game event goes live." },
      { q: "Do I need an account?", a: "You can browse deals as a guest. To save favorites, receive notifications, and export your data, you need a free account." },
      { q: "How do I sign in with Google or Discord?", a: "On the login page, tap the Google or Discord button. We'll create an account automatically on your first sign-in. You can link those accounts later from Profile → Linked Accounts." },
      { q: "Is DisLow free?", a: "Yes, completely free. We aggregate publicly available price data — there's nothing to pay." },
    ],
  },
  {
    title: "Wishlist & deals",
    items: [
      { q: "How do I add a game to my Favorites?", a: "Open any game's detail page and tap the ★ star in the top-right corner of the cover image. The star turns purple when the game is saved." },
      { q: "Where does the price data come from?", a: "PC prices come from CheapShark (aggregating Steam, Epic, GOG, Humble, and others). Console prices come from IsThereAnyDeal (ITAD). DisLow does not guarantee accuracy — always confirm the price on the store's checkout page before purchasing." },
      { q: "How current is the pricing information?", a: "Prices are cached for up to 24 hours. For the very latest price, click 'Visit Game Store' on the game detail page." },
      { q: "What does 'Lowest Price Ever' mean?", a: "It's the historical lowest recorded price from ITAD's database. The deal may no longer be available — it's informational only." },
    ],
  },
  {
    title: "Notifications",
    items: [
      { q: "Why am I not receiving notifications?", a: "Check Profile → Notification Preferences and make sure the Events and/or Discounts toggles are on. Notifications are only generated for games in your Favorites list." },
      { q: "Can I turn off discount notifications and keep event ones?", a: "Yes. Profile → Notification Preferences has separate toggles for Events (purple) and Discounts (green)." },
      { q: "How do I clear the notification badge?", a: "Open the Notifications page and tap 'Mark all read'. The sidebar dot disappears once all notifications are read." },
    ],
  },
  {
    title: "Account & privacy",
    items: [
      { q: "How do I change my email address?", a: "Go to Profile → Edit Profile, enter your new email and current password. We'll send a 6-digit code to the new address — enter it to confirm the change." },
      { q: "Can I change my password?", a: "Yes — Profile → Change Password. You'll need your current password. After a successful change you'll be logged out of all sessions." },
      { q: "How do I delete my account?", a: "Profile → Delete Account. You must confirm your email and password. Deletion is permanent: your wishlist and notifications are removed immediately." },
      { q: "What data does DisLow store about me?", a: "Your name, email, avatar, wishlist, notification preferences, and notification history. See the Privacy Policy for the full list." },
    ],
  },
  {
    title: "Troubleshooting",
    items: [
      { q: "The app shows 'No price found' for a game.", a: "Some games — very new releases, free-to-play titles, or region-locked games — have no pricing data from our sources. Try checking the store directly." },
      { q: "I'm stuck on a loading screen.", a: "Hard-refresh the page (Ctrl+Shift+R / Cmd+Shift+R). If the problem persists, try logging out and back in. If it still happens, use Report a Bug." },
      { q: "My avatar didn't update after uploading.", a: "Wait a few seconds and refresh. Cloudinary CDN delivery can take a moment on first upload. If it still shows the old avatar after 30 seconds, try uploading again." },
    ],
  },
]

function FAQItem({ q, a }: QA) {
  const [open, setOpen] = useState(false)
  return (
    <details
      open={open}
      onToggle={e => setOpen((e.target as HTMLDetailsElement).open)}
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      <summary
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none list-none"
        style={{ color: open ? "white" : "rgba(255,255,255,0.8)" }}
      >
        <span className="text-[13px] font-medium pr-4">{q}</span>
        <span
          className="flex-shrink-0 text-[18px] leading-none"
          style={{ color: "#6475D1", transform: open ? "rotate(45deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}
        >+</span>
      </summary>
      <p className="px-4 pb-4 text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
        {a}
      </p>
    </details>
  )
}

export default function HelpPage() {
  return (
    <ProfileSubLayout title="Help Center" backHref="/profile">
      <div className="space-y-6">
        {FAQ.map(section => (
          <section key={section.title}>
            <h2 className="text-[10px] font-bold tracking-[0.18em] uppercase mb-3 px-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              {section.title}
            </h2>
            <div style={cardStyle} className="overflow-hidden">
              {section.items.map(item => <FAQItem key={item.q} {...item} />)}
            </div>
          </section>
        ))}
      </div>
    </ProfileSubLayout>
  )
}
