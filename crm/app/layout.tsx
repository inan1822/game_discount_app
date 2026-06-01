import type { Metadata } from "next"
import { Nunito } from "next/font/google"
import "./globals.css"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import PageBackground from "@/components/ui/PageBackground"

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
  variable: "--font-nunito",
})

export const metadata: Metadata = {
  title:       "DisLow Admin",
  description: "DisLow CRM — internal admin panel",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${nunito.variable} font-sans antialiased`}
        style={{ background: "#1E2532", color: "#fff" }}
      >
        {/* Same atmospheric background as the storefront */}
        <div className="relative min-h-screen overflow-hidden">
          <PageBackground />
          <div className="relative" style={{ zIndex: 3 }}>
            {children}
          </div>
        </div>
        <ToastContainer
          position="bottom-center"
          autoClose={3000}
          theme="dark"
          toastStyle={{
            background:   "#1c1e2a",
            border:       "1px solid rgba(188,188,201,0.25)",
            color:        "#fff",
            borderRadius: "12px",
          }}
        />
      </body>
    </html>
  )
}
