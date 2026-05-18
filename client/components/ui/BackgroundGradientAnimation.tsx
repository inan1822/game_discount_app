"use client"

import { cn } from "@/lib/utils"
import { useEffect, useRef, useState } from "react"

export const BackgroundGradientAnimation = ({
  className,
  containerClassName,
  interactive = true,
}: {
  className?: string
  containerClassName?: string
  interactive?: boolean
}) => {
  const interactiveRef = useRef<HTMLDivElement>(null)

  // Pointer-blob smooth tracking
  const [curX, setCurX] = useState(0)
  const [curY, setCurY] = useState(0)
  const [tgX, setTgX] = useState(0)
  const [tgY, setTgY] = useState(0)

  // Background parallax offset
  const [bgOffset, setBgOffset] = useState({ x: 0, y: 0 })

  // ─── DisLow design tokens ───────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.setProperty("--gradient-background-start", "rgb(30, 37, 50)")
    document.body.style.setProperty("--gradient-background-end",   "rgb(24, 29, 40)")
    document.body.style.setProperty("--first-color",   "174, 59, 214")
    document.body.style.setProperty("--second-color",  "100, 117, 209")
    document.body.style.setProperty("--third-color",   "42, 183, 230")
    document.body.style.setProperty("--fourth-color",  "153, 159, 250")
    document.body.style.setProperty("--fifth-color",   "132, 29, 128")
    document.body.style.setProperty("--pointer-color", "72, 79, 230")
    document.body.style.setProperty("--size",          "70%")
    document.body.style.setProperty("--blending-value","hard-light")
  }, [])

  // ─── Smooth pointer-blob lerp ───────────────────────────────────────────────
  useEffect(() => {
    if (!interactiveRef.current) return
    setCurX(c => c + (tgX - c) / 20)
    setCurY(c => c + (tgY - c) / 20)
    interactiveRef.current.style.transform =
      `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`
  }, [tgX, tgY])

  // ─── Mouse handler — drives both parallax and pointer blob ─────────────────
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Parallax: normalised −0.5 → 0.5, scaled to ±20px / ±15px
    const x = (e.clientX / window.innerWidth  - 0.5) * 40
    const y = (e.clientY / window.innerHeight - 0.5) * 30
    setBgOffset({ x, y })

    // Pointer blob tracking (ref lives outside the parallax layer)
    if (interactive && interactiveRef.current) {
      const rect = interactiveRef.current.getBoundingClientRect()
      setTgX(e.clientX - rect.left)
      setTgY(e.clientY - rect.top)
    }
  }

  const [isSafari, setIsSafari] = useState(false)
  useEffect(() => {
    setIsSafari(/^((?!chrome|android).)*safari/i.test(navigator.userAgent))
  }, [])

  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden",
        "bg-[linear-gradient(40deg,var(--gradient-background-start),var(--gradient-background-end))]",
        containerClassName,
      )}
      style={{ background: "linear-gradient(40deg, #1E2532, #181D28)" }}
      onMouseMove={handleMouseMove}
    >
      {/* SVG gooey filter */}
      <svg className="hidden">
        <defs>
          <filter id="blurMe">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur" mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <div className={cn("", className)} />

      {/* ── Animated blobs — inside parallax wrapper ─────────────────────────── */}
      <div
        style={{
          position: "absolute",
          inset: "-40px",           // oversized so edges stay hidden during shift
          transform: `translate(${bgOffset.x}px, ${bgOffset.y}px)`,
          transition: "transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          willChange: "transform",
        }}
      >
        <div
          className={cn(
            "w-full h-full",
            isSafari ? "blur-2xl" : "[filter:url(#blurMe)_blur(10px)]",
          )}
        >
          {/* Blob 1 — purple */}
          <div className="absolute animate-bg-first opacity-30
            [background:radial-gradient(circle_at_center,rgba(174,59,214,0.8)_0,rgba(174,59,214,0)_50%)_no-repeat]
            [mix-blend-mode:hard-light]
            w-[70%] h-[70%]
            top-[calc(50%-35%)] left-[calc(50%-35%)]" />

          {/* Blob 2 — blue */}
          <div className="absolute animate-bg-second opacity-30
            [background:radial-gradient(circle_at_center,rgba(100,117,209,0.8)_0,rgba(100,117,209,0)_50%)_no-repeat]
            [mix-blend-mode:hard-light]
            w-[70%] h-[70%]
            top-[calc(50%-35%)] left-[calc(50%-35%)]
            [transform-origin:calc(50%-400px)]" />

          {/* Blob 3 — cyan */}
          <div className="absolute animate-bg-third opacity-30
            [background:radial-gradient(circle_at_center,rgba(42,183,230,0.8)_0,rgba(42,183,230,0)_50%)_no-repeat]
            [mix-blend-mode:hard-light]
            w-[70%] h-[70%]
            top-[calc(50%-35%)] left-[calc(50%-35%)]
            [transform-origin:calc(50%+400px)]" />

          {/* Blob 4 — purple-light */}
          <div className="absolute animate-bg-fourth opacity-30
            [background:radial-gradient(circle_at_center,rgba(153,159,250,0.8)_0,rgba(153,159,250,0)_50%)_no-repeat]
            [mix-blend-mode:hard-light]
            w-[70%] h-[70%]
            top-[calc(50%-35%)] left-[calc(50%-35%)]
            [transform-origin:calc(50%-200px)]" />

          {/* Blob 5 — deep purple */}
          <div className="absolute animate-bg-fifth opacity-30
            [background:radial-gradient(circle_at_center,rgba(132,29,128,0.8)_0,rgba(132,29,128,0)_50%)_no-repeat]
            [mix-blend-mode:hard-light]
            w-[70%] h-[70%]
            top-[calc(50%-35%)] left-[calc(50%-35%)]
            [transform-origin:calc(50%-800px)_calc(50%+800px)]" />

          {/* Blob 6 — green #44d62c */}
          <div className="absolute animate-bg-first opacity-30
            [background:radial-gradient(circle_at_center,rgba(68,214,44,0.8)_0,rgba(68,214,44,0)_50%)_no-repeat]
            [mix-blend-mode:hard-light]
            w-[70%] h-[70%]
            top-[calc(50%-35%)] left-[calc(50%-35%)]
            [transform-origin:calc(50%+600px)_calc(50%-600px)]" />
        </div>
      </div>

      {/* ── Pointer blob — outside parallax wrapper so tracking stays accurate ── */}
      {interactive && (
        <div
          ref={interactiveRef}
          className="absolute opacity-60
            [background:radial-gradient(circle_at_center,rgba(72,79,230,0.8)_0,rgba(72,79,230,0)_50%)_no-repeat]
            [mix-blend-mode:hard-light]
            w-full h-full -top-1/2 -left-1/2"
        />
      )}
    </div>
  )
}
