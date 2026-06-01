"use client"

import React, { useRef, useState, MouseEvent, ReactNode } from "react"

interface ButtonProps {
  children:         ReactNode
  onClick?:         () => void
  className?:       string
  disabled?:        boolean
  glowColor?:       string
  backgroundColor?: string
  textColor?:       string
  hoverTextColor?:  string
  style?:           React.CSSProperties
}

const HoverButton: React.FC<ButtonProps> = ({
  children,
  onClick,
  className = "",
  disabled = false,
  glowColor      = "#48BCF9",
  backgroundColor = "transparent",
  textColor      = "rgba(255,255,255,0.45)",
  hoverTextColor = "#48BCF9",
  style,
}) => {
  const buttonRef                     = useRef<HTMLButtonElement>(null)
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 })
  const [isHovered,    setIsHovered]    = useState(false)

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setGlowPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
  }

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative border-none cursor-pointer overflow-hidden transition-colors duration-300 ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      style={{
        backgroundColor,
        color: isHovered ? hoverTextColor : textColor,
        ...style,
      }}
    >
      {/* Tracking glow */}
      <div
        className="absolute rounded-full pointer-events-none transition-all duration-300"
        style={{
          left:      glowPosition.x,
          top:       glowPosition.y,
          width:     160,
          height:    160,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${glowColor} 10%, transparent 70%)`,
          opacity:   isHovered ? 0.18 : 0,
          zIndex:    0,
        }}
      />
      {/* Content above glow */}
      <span className="relative z-10 flex items-center gap-3 w-full">{children}</span>
    </button>
  )
}

export { HoverButton }
export default HoverButton
