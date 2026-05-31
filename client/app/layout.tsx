import type { Metadata } from "next"
import { Nunito } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/context/AuthContext"
import { ReduxProvider } from "@/store/ReduxProvider"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
  variable: "--font-nunito"
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:  "DisLow — Find the Best Game Deals",
    template: "%s — DisLow",
  },
  description:
    "Compare game prices across Steam, Epic, GOG, PlayStation, Xbox and more. Track discounts, in-game events, and never miss a deal.",
  keywords: [
    "game deals", "game prices", "cheap games", "Steam deals", "Epic Games deals",
    "GOG discounts", "price comparison", "game discounts", "DisLow",
  ],
  applicationName: "DisLow",
  openGraph: {
    type:        "website",
    siteName:    "DisLow",
    title:       "DisLow — Find the Best Game Deals",
    description: "Compare game prices across every major store and track discounts in real time.",
    url:         SITE_URL,
  },
  twitter: {
    card:        "summary_large_image",
    title:       "DisLow — Find the Best Game Deals",
    description: "Compare game prices across every major store and track discounts in real time.",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${nunito.variable} font-sans antialiased bg-[#12131a] text-white`}>
        <AuthProvider>
          <ReduxProvider>
            <div className="min-h-screen">
              {children}
            </div>
            <ToastContainer
              position="bottom-center"
              autoClose={3000}
              theme="dark"
              toastStyle={{
                background: "#1c1e2a",
                border: "1px solid rgba(188,188,201,0.25)",
                color: "#fff",
                borderRadius: "12px"
              }}
            />
          </ReduxProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
