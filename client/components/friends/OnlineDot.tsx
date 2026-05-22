export default function OnlineDot({ online }: { online: boolean }) {
  if (!online) return null
  return (
    <span
      aria-hidden
      className="absolute"
      style={{
        right: -2,
        bottom: -2,
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: "#44d62c",
        border: "2px solid #1E2532",
      }}
    />
  )
}
