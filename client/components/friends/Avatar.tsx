import OnlineDot from "./OnlineDot"

interface Props {
  name: string
  url: string | null
  online?: boolean
  size?: number
}

// Stable per-name gradient so the placeholder color is consistent.
function hashHue(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return Math.abs(h) % 360
}

export default function Avatar({ name, url, online = false, size = 44 }: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || "?"
  const hue = hashHue(name)

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {url ? (
        <img
          src={url}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          aria-hidden
          className="rounded-full flex items-center justify-center font-semibold text-white"
          style={{
            width: size,
            height: size,
            fontSize: size * 0.38,
            background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 60) % 360} 70% 45%))`,
          }}
        >
          {initial}
        </div>
      )}
      <OnlineDot online={online} />
    </div>
  )
}
