"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { motion } from "framer-motion"

const CIRCLE_PATH =
  "M43 21.5C43 33.3741 33.3741 43 21.5 43C9.62588 43 0 33.3741 0 21.5C0 9.62588 9.62588 0 21.5 0C33.3741 0 43 9.62588 43 21.5Z"

const ARROW_PATH =
  "M30.0387 20.2229L17.9159 7.73316C17.6898 7.50025 17.4215 7.31551 17.1261 7.18946C16.8307 7.06341 16.5142 6.99854 16.1945 6.99854C15.5488 6.99854 14.9296 7.26279 14.473 7.73316C14.247 7.96606 14.0677 8.24256 13.9453 8.54687C13.823 8.85117 13.76 9.17732 13.76 9.5067C13.76 10.1719 14.0165 10.8099 14.473 11.2802L24.8986 21.9964L14.473 32.7126C14.2458 32.9448 14.0654 33.2211 13.9423 33.5255C13.8192 33.8299 13.7559 34.1564 13.7559 34.4861C13.7559 34.8159 13.8192 35.1424 13.9423 35.4468C14.0654 35.7512 14.2458 36.0274 14.473 36.2596C14.6984 36.4938 14.9666 36.6796 15.262 36.8064C15.5575 36.9332 15.8744 36.9985 16.1945 36.9985C16.5145 36.9985 16.8314 36.9332 17.1269 36.8064C17.4224 36.6796 17.6905 36.4938 17.9159 36.2596L30.0387 23.7699C30.2659 23.5377 30.4463 23.2615 30.5694 22.9571C30.6925 22.6527 30.7559 22.3262 30.7559 21.9964C30.7559 21.6666 30.6925 21.3402 30.5694 21.0358C30.4463 20.7314 30.2659 20.4551 30.0387 20.2229Z"

function NavBtn({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  const filterId = `scrollrow-glow-${dir}`

  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileTap={{ scale: 0.88 }}
      animate={{ scale: hovered ? 1.28 : 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="absolute top-1/2 -translate-y-1/2 z-20"
      style={{
        [dir === "next" ? "right" : "left"]: -8,
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        transformOrigin: "center",
        position: "absolute",
      }}
    >
      {/* Glass circle background */}
      <div style={{
        position:             "absolute",
        inset:                0,
        borderRadius:         "50%",
        background:           "rgba(52, 82, 230, 0.25)",
        backdropFilter:       "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }} />

      {/* Hover glow ring */}
      <motion.div
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.22 }}
        style={{
          position:     "absolute",
          inset:        -4,
          borderRadius: "50%",
          background:   "radial-gradient(circle, rgba(53,148,226,0.35) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <svg
        width="43" height="43" viewBox="0 0 43 43" fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ transform: dir === "prev" ? "scaleX(-1)" : undefined, display: "block", position: "relative", overflow: "visible" }}
      >
        {/* Trail ghost 2 — furthest behind, most faded */}
        <motion.path
          d={ARROW_PATH}
          fill="#3396E6"
          animate={{ x: hovered ? -5 : 0, opacity: hovered ? 0.12 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, opacity: { duration: 0.15 } }}
        />
        {/* Trail ghost 1 — middle */}
        <motion.path
          d={ARROW_PATH}
          fill="#3396E6"
          animate={{ x: hovered ? -2.5 : 0, opacity: hovered ? 0.28 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, opacity: { duration: 0.15 } }}
        />
        {/* Main arrow — moves forward on hover */}
        <motion.path
          d={ARROW_PATH}
          fill="#3396E6"
          animate={{ x: hovered ? 3 : 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />
      </svg>
    </motion.button>
  )
}

export default function ScrollableRow({
  children,
  gap = 36,
  paddingTop = 0,
  paddingBottom = 12,
  paddingLeft = 0,
  paddingRight = 0,
}: {
  children:       React.ReactNode
  gap?:           number
  paddingTop?:    number
  paddingBottom?: number
  paddingLeft?:   number
  paddingRight?:  number
}) {
  const scrollRef                         = useRef<HTMLDivElement>(null)
  const [canScrollLeft,  setCanLeft]      = useState(false)
  const [canScrollRight, setCanRight]     = useState(true)

  const update = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 10)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    el.addEventListener("scroll", update, { passive: true })
    return () => { el.removeEventListener("scroll", update); ro.disconnect() }
  }, [update])

  const scroll = useCallback((dir: "prev" | "next") => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === "next" ? el.clientWidth * 0.7 : -el.clientWidth * 0.7, behavior: "smooth" })
  }, [])

  return (
    <div className="relative">
      {canScrollLeft  && <NavBtn dir="prev" onClick={() => scroll("prev")} />}
      {canScrollRight && <NavBtn dir="next" onClick={() => scroll("next")} />}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto"
        style={{
          gap,
          paddingTop,
          paddingBottom,
          paddingLeft,
          paddingRight,
          scrollbarWidth: "none",
        }}
      >
        {children}
      </div>
    </div>
  )
}
