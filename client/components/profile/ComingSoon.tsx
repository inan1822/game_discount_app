import Link from "next/link"

export default function ComingSoon({ title, phase }: { title: string; phase: number }) {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "#1E2532" }}
    >
      <div
        className="max-w-sm w-full text-center px-6 py-10"
        style={{
          background: "rgba(28,30,42,0.70)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 14,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <h1 className="text-white text-xl font-bold mb-2">{title}</h1>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
          Coming soon — Phase {phase}
        </p>
        <Link
          href="/profile"
          className="inline-block px-4 py-2 text-sm font-medium"
          style={{
            background: "rgba(72,188,249,0.13)",
            color: "#48BCF9",
            border: "1px solid rgba(72,188,249,0.2)",
            borderRadius: 10,
          }}
        >
          ← Back to Profile
        </Link>
      </div>
    </main>
  )
}
