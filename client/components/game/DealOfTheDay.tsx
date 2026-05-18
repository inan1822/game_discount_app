"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import type { DealOfDay } from "@/lib/api/games"
import { SectionHeading } from "@/components/ui/SectionHeading"

// ─── Countdown ────────────────────────────────────────────────────────────────

function useCountdown() {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 })

  useEffect(() => {
    const tick = () => {
      const now      = new Date()
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)
      const diff = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000))
      setTime({
        h: Math.floor(diff / 3600),
        m: Math.floor((diff % 3600) / 60),
        s: diff % 60,
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return time
}

function Digit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="flex items-center justify-center font-bold text-white text-[22px] tabular-nums"
        style={{
          width: 52, height: 52,
          background:   "rgba(174,59,214,0.15)",
          border:       "1px solid rgba(174,59,214,0.30)",
          borderRadius: 10,
        }}
      >
        {String(value).padStart(2, "0")}
      </div>
      <span className="text-[9px] mt-1 font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
        {label}
      </span>
    </div>
  )
}

// ─── DealOfTheDay ─────────────────────────────────────────────────────────────

export default function DealOfTheDay({
  deal, delay = 0,
}: {
  deal:   DealOfDay
  delay?: number
}) {
  const router = useRouter()
  const time   = useCountdown()

  const savingsPct = Math.round(deal.savings)

  return (
    <motion.section
      data-section="Deal of Day"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
    >
      {/* Header */}
      <SectionHeading
        title="Deal of the Day"
        delay={delay}
        right={
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] font-bold px-2 py-0.5" style={{
              background: "rgba(91,222,138,0.15)",
              color:      "#5BDE8A",
              border:     "1px solid rgba(91,222,138,0.25)",
              borderRadius: 6,
            }}>
              -{savingsPct}% OFF
            </span>
            {/* Countdown */}
            <div className="flex items-center gap-2">
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Resets in</span>
              <div className="flex items-center gap-1.5">
                <Digit value={time.h} label="hrs" />
                <span className="text-white font-bold text-[18px] mb-4">:</span>
                <Digit value={time.m} label="min" />
                <span className="text-white font-bold text-[18px] mb-4">:</span>
                <Digit value={time.s} label="sec" />
              </div>
            </div>
          </div>
        }
      />

      {/* Hero card */}
      <motion.div
        whileHover={{ scale: 1.008 }}
        transition={{ duration: 0.2 }}
        className="relative overflow-hidden cursor-pointer"
        style={{ height: 220, borderRadius: 16 }}
        onClick={() => deal.gameId
          ? router.push(`/game/${deal.gameId}`)
          : window.open(deal.dealLink, "_blank")
        }
      >
        {/* Cover */}
        {deal.cover ? (
          <img src={deal.cover} alt={deal.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#1c2a3a,#2a1c3a)" }} />
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.30) 50%, transparent 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.60) 0%, transparent 60%)" }} />

        {/* Left content */}
        <div className="absolute left-6 top-0 bottom-0 flex flex-col justify-center" style={{ maxWidth: 340 }}>
          <p className="text-white font-bold text-[24px] leading-tight mb-2">{deal.title}</p>

          <div className="flex items-center gap-3 mb-4">
            <span className="font-bold text-[28px]" style={{ color: "#5BDE8A" }}>${deal.salePrice}</span>
            <span className="font-semibold text-[16px] line-through" style={{ color: "rgba(255,255,255,0.35)" }}>
              ${deal.normalPrice}
            </span>
          </div>

          {/* Store badge + Buy button */}
          <div className="flex items-center gap-3">
            {deal.storeIcon && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5" style={{
                background:   "rgba(255,255,255,0.10)",
                borderRadius: 8,
                border:       "1px solid rgba(255,255,255,0.12)",
              }}>
                <img src={deal.storeIcon} alt={deal.storeName} loading="lazy" style={{ width: 14, height: 14 }} />
                <span className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.75)" }}>{deal.storeName}</span>
              </div>
            )}

            <motion.a
              href={deal.dealLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 font-bold text-[12px] text-white px-4 py-2"
              style={{
                background:   "#AE3BD6",
                borderRadius: 8,
                boxShadow:    "0 4px 16px rgba(174,59,214,0.40)",
              }}
            >
              Get Deal →
            </motion.a>
          </div>
        </div>

        {/* Savings badge — top right */}
        <div
          className="absolute top-4 right-4 flex flex-col items-center justify-center font-black"
          style={{
            width: 64, height: 64,
            background:   "linear-gradient(135deg, #5BDE8A, #48BCF9)",
            borderRadius: "50%",
            boxShadow:    "0 4px 20px rgba(91,222,138,0.45)",
          }}
        >
          <span className="text-[10px] text-white leading-none">SAVE</span>
          <span className="text-[20px] text-white leading-none">{savingsPct}%</span>
        </div>
      </motion.div>
    </motion.section>
  )
}
