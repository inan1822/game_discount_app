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
    <motion.div
      className="flex items-end justify-between"
      style={{ paddingTop: 12, marginBottom: 20, perspective: 600 }}
      initial={{ opacity: 0, y: 18, rotateX: -22, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,  rotateX: 0,   scale: 1    }}
      transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div style={{ transformStyle: "preserve-3d" }}>
        {/* Title */}
        <h2 className="text-white font-bold" style={{ fontSize: 22, lineHeight: 1.2, marginBottom: 8 }}>
          {title}
        </h2>

        {/* Underline */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: delay + 0.18, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{
            height:          3,
            width:           "100%",
            borderRadius:    2,
            originX:         0,
            background:      "linear-gradient(to right, #48BCF9, #AE3BD6, transparent)",
          }}
        />
      </div>

      {/* Right slot — "See all" or custom content */}
      {onSeeAll && (
        <motion.button
          onClick={onSeeAll}
          whileHover={{ x: 4, color: "rgba(255,255,255,0.8)" }}
          whileTap={{ scale: 0.97 }}
          style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, marginBottom: 2 }}
        >
          See all →
        </motion.button>
      )}
      {right}
    </motion.div>
  )
}
