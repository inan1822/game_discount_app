import type { Metadata } from "next"
import { Nunito } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/context/AuthContext"
import { WishlistProvider } from "@/context/WishlistContext"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
  variable: "--font-nunito"
})

export const metadata: Metadata = {
  title: "DisLow — Find the Best Game Deals",
  description: "Compare game prices across Steam, Epic, GOG, and more.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${nunito.variable} font-sans antialiased bg-[#12131a] text-white`}>
        <AuthProvider>
          <WishlistProvider>
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
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
