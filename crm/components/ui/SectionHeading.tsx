"use client"

import { motion } from "framer-motion"

export function SectionHeading({
  title,
  onSeeAll,
  delay = 0,
  right,
}: {
  title:      string
  onSeeAll?:  () => void
  delay?:     number
  right?:     React.ReactNode
}) {
  return (
    <div style={{ perspective: 600, overflow: "visible" }}>
    <motion.div
      className="flex items-end justify-between"
      style={{ paddingTop: 12, paddingBottom: 4, marginBottom: 20, overflow: "visible" }}
      initial={{ opacity: 0, y: 18, rotateX: -22, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,  rotateX: 0,   scale: 1    }}
      transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div>
        {/* Title with glow via text-shadow — never clipped by parent overflow */}
        <h2
          className="text-white font-bold"
          style={{
            fontSize:   26,
            lineHeight: 1.2,
            textShadow: "0 0 18px #6174D9, 0 0 36px #6174D9, 0 0 60px #6174D9",
          }}
        >
          {title}
        </h2>
      </div>

      {/* Right slot — "See all" or custom content */}
      {onSeeAll && (
        <motion.button
          onClick={onSeeAll}
          whileHover={{ x: 4, color: "rgba(255,255,255,0.8)" }}
          whileTap={{ scale: 0.97 }}
          style={{ color: "rgba(255,255,255,0.35)", fontSize: 15, marginBottom: 2 }}
        >
          See all →
        </motion.button>
      )}
      {right}
    </motion.div>
    </div>
  )
}
