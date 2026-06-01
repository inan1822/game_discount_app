"use client"

import React, { useState, useEffect, useRef, HTMLAttributes } from "react"

const cn = (...classes: (string | undefined | null | false)[]) =>
  classes.filter(Boolean).join(" ")

export interface GalleryItem {
  common: string
  binomial: string
  photo: {
    url: string
    text: string
    pos?: string
    by: string
  }
}

interface CircularGalleryProps extends HTMLAttributes<HTMLDivElement> {
  items: GalleryItem[]
  /** How far items sit from the centre (depth). */
  radius?: number
  /** Auto-rotation speed in degrees per frame. */
  autoRotateSpeed?: number
  /** Show the text overlay on each card. */
  showOverlay?: boolean
}

const CircularGallery = React.forwardRef<HTMLDivElement, CircularGalleryProps>(
  (
    {
      items,
      className,
      radius = 600,
      autoRotateSpeed = 0.02,
      showOverlay = true,
      ...props
    },
    ref,
  ) => {
    const [rotation, setRotation] = useState(0)
    const [isScrolling, setIsScrolling] = useState(false)
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const animationFrameRef = useRef<number | null>(null)

    // Scroll → rotation
    useEffect(() => {
      const handleScroll = () => {
        setIsScrolling(true)
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
        const scrollableH = document.documentElement.scrollHeight - window.innerHeight
        const progress = scrollableH > 0 ? window.scrollY / scrollableH : 0
        setRotation(progress * 360)
        scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 150)
      }
      window.addEventListener("scroll", handleScroll, { passive: true })
      return () => {
        window.removeEventListener("scroll", handleScroll)
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
      }
    }, [])

    // Auto-rotation when not scrolling
    useEffect(() => {
      const tick = () => {
        if (!isScrolling) setRotation(prev => prev + autoRotateSpeed)
        animationFrameRef.current = requestAnimationFrame(tick)
      }
      animationFrameRef.current = requestAnimationFrame(tick)
      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      }
    }, [isScrolling, autoRotateSpeed])

    const anglePerItem = 360 / items.length

    return (
      <div
        ref={ref}
        role="region"
        aria-label="Circular 3D Gallery"
        className={cn("relative w-full h-full flex items-center justify-center", className)}
        style={{ perspective: "1400px" }}
        {...props}
      >
        <div
          className="relative w-full h-full"
          style={{
            transform: `rotateY(${rotation}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          {items.map((item, i) => {
            const itemAngle = i * anglePerItem
            const totalRotation = rotation % 360
            const relativeAngle = (itemAngle + totalRotation + 360) % 360
            const normalizedAngle = Math.abs(relativeAngle > 180 ? 360 - relativeAngle : relativeAngle)
            // quadratic falloff — back cards fade out much faster
            const opacity = Math.max(0.08, Math.pow(1 - normalizedAngle / 180, 2.2))
            // depth-of-field: front card sharp, back cards blurred up to 6px
            const blur = (normalizedAngle / 180) * 6

            return (
              <div
                key={`${item.photo.url}-${i}`}
                role="group"
                aria-label={item.common}
                className="absolute"
                style={{
                  width: 160,
                  height: 240,          /* 2:3 — matches Steam 600×900 portrait */
                  transform: `rotateY(${itemAngle}deg) translateZ(${radius}px)`,
                  left: "50%",
                  top: "50%",
                  marginLeft: "-80px",
                  marginTop: "-120px",
                  opacity: opacity * 0.7,
                  transition: "opacity 0.3s linear",
                }}
              >
                <div
                  style={{
                    width: 160,
                    height: 240,
                    borderRadius: 10,
                    overflow: "hidden",
                    backgroundImage: `url(${item.photo.url})`,
                    backgroundSize: "cover",
                    backgroundPosition: item.photo.pos ?? "center",
                    opacity: 0.7,
                    filter: blur > 0 ? `blur(${blur.toFixed(1)}px)` : undefined,
                    transform: blur > 0 ? "scale(1.08)" : undefined,
                    backgroundColor: "rgba(28,30,42,0.8)",
                  }}
                >

                  {showOverlay && item.common && (
                    <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                      <h2 className="text-lg font-bold leading-tight">{item.common}</h2>
                      {item.binomial && (
                        <em className="text-sm italic opacity-70">{item.binomial}</em>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  },
)

CircularGallery.displayName = "CircularGallery"
export { CircularGallery }
