"use client"

import { forwardRef, useState } from "react"
import { cn } from "@/shared/utils/utils"

interface SparkleButtonProps {
  label?: string
  onClick?: () => void
  className?: string
  type?: "button" | "submit" | "reset"
  disabled?: boolean
  loading?: boolean
}

export const SparkleButton = forwardRef<HTMLButtonElement, SparkleButtonProps>(
  ({ label = "Login", onClick, className, type = "button", disabled, loading }, ref) => {
    const [isClicked, setIsClicked] = useState(false)

    const handleClick = () => {
      if (disabled || loading) return
      setIsClicked(true)
      setTimeout(() => setIsClicked(false), 200)
      onClick?.()
    }

    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        disabled={disabled || loading}
        className={cn("glow-btn", className)}
        onClick={type === "button" ? handleClick : undefined}
        data-state={isClicked ? "clicked" : undefined}
      >
        <span className="flex items-center justify-center gap-2">
          {loading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Loading...
            </>
          ) : (
            label
          )}
        </span>
      </button>
    )
  }
)

SparkleButton.displayName = "SparkleButton"
