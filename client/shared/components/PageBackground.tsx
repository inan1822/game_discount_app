import { BackgroundGradientAnimation } from "./BackgroundGradientAnimation"

/**
 * Standard two-layer app background:
 *  1. Animated gradient blobs (BackgroundGradientAnimation)
 *  2. Top SVG overlay at z-index 2
 *
 * Place once at the top of any page. Page content should sit at z-index >= 3.
 */
export default function PageBackground() {
  return (
    <>
      <BackgroundGradientAnimation />
      <img
        src="/icons/auth-bg-top.svg"
        aria-hidden
        className="absolute inset-0 w-full h-full pointer-events-none object-cover"
        style={{ zIndex: 2  }}
      />
    </>
  )
}
