import ProfileSubLayout from "@/components/profile/ProfileSubLayout"

const cardStyle = {
  background: "rgba(28,30,42,0.70)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 10,
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  padding: "28px 28px",
} as const

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[14px] font-bold text-white mt-6 mb-2 first:mt-0">{children}</h2>
  )
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.55)" }}>{children}</p>
}
function Li({ children }: { children: React.ReactNode }) {
  return <li className="text-[12px] leading-relaxed mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>{children}</li>
}

export default function PrivacyPage() {
  return (
    <ProfileSubLayout title="Privacy Policy" backHref="/profile">
      <div style={cardStyle}>
        <p className="text-[11px] mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>
          Last updated: 21 May 2026
        </p>

        <H2>1. Who we are</H2>
        <P>
          DisLow is a game deal finder that aggregates pricing and event data from third-party
          sources. "We", "us", and "our" refer to the DisLow service. Questions about this policy
          can be sent to <span className="text-brand-blue">support@dislow.app</span>.
        </P>

        <H2>2. What data we collect</H2>
        <P>When you create an account we collect:</P>
        <ul className="list-disc pl-5 mb-3 space-y-1">
          <Li>Your name and email address</Li>
          <Li>A hashed copy of your password (we never store it in plain text)</Li>
          <Li>Your avatar (either a preset path or a Cloudinary CDN URL)</Li>
          <Li>OAuth identifiers — Google ID, Discord ID, or Steam ID — if you choose to link those accounts</Li>
        </ul>
        <P>When you use the app we collect:</P>
        <ul className="list-disc pl-5 mb-3 space-y-1">
          <Li>Your wishlist — the games you've saved as favorites</Li>
          <Li>Your notification preferences (events on/off, discounts on/off)</Li>
          <Li>Notification records (title, body, read status) — auto-deleted after 30 days</Li>
          <Li>Feedback and bug reports you submit (optionally linked to your account)</Li>
        </ul>
        <P>
          We do not collect browsing history, payment information, or device fingerprints.
          We do not run analytics scripts or third-party ad trackers.
        </P>

        <H2>3. Why we collect it</H2>
        <ul className="list-disc pl-5 mb-3 space-y-1">
          <Li>To authenticate you and keep your session secure</Li>
          <Li>To personalise your experience (Favorites, "For You" recommendations)</Li>
          <Li>To send deal and event alerts for games on your wishlist</Li>
          <Li>To improve the app based on your feedback</Li>
        </ul>

        <H2>4. Third-party services</H2>
        <P>DisLow integrates with the following external services. Each receives only what is necessary.</P>
        <ul className="list-disc pl-5 mb-3 space-y-1">
          <Li><strong className="text-white">RAWG</strong> — game metadata (name, cover, genres). We send search queries. No personal data is shared.</Li>
          <Li><strong className="text-white">CheapShark</strong> — PC store prices. We send game titles. No personal data is shared.</Li>
          <Li><strong className="text-white">IsThereAnyDeal (ITAD)</strong> — cross-platform prices and historical lows. No personal data is shared.</Li>
          <Li><strong className="text-white">Cloudinary</strong> — avatar image storage. Custom avatar images are uploaded to and served from Cloudinary's CDN.</Li>
          <Li><strong className="text-white">Google OAuth</strong> — if you sign in with Google, your Google ID and public profile name are shared with us by Google.</Li>
          <Li><strong className="text-white">Discord OAuth</strong> — if you sign in with Discord, your Discord ID, username, and email are shared with us by Discord.</Li>
          <Li><strong className="text-white">Steam OpenID</strong> — if you sign in with Steam, your Steam ID and public profile name are shared with us by Steam.</Li>
          <Li><strong className="text-white">nodemailer / Gmail SMTP</strong> — used to send email verification and password reset codes. Your email address is used as the recipient only.</Li>
        </ul>

        <H2>5. Cookies and sessions</H2>
        <P>
          We use a single <code className="text-brand-blue">dislow_token</code> httpOnly cookie to
          maintain your login session. This cookie is:
        </P>
        <ul className="list-disc pl-5 mb-3 space-y-1">
          <Li>HttpOnly — not readable by JavaScript</Li>
          <Li>Secure in production — sent only over HTTPS</Li>
          <Li>SameSite=Lax — protects against CSRF</Li>
          <Li>Valid for 2 hours — reissued on each login</Li>
        </ul>
        <P>We do not use third-party tracking cookies or advertising cookies.</P>

        <H2>6. Your rights</H2>
        <ul className="list-disc pl-5 mb-3 space-y-1">
          <Li><strong className="text-white">Access</strong> — Profile → Export My Data downloads a JSON file of everything we hold.</Li>
          <Li><strong className="text-white">Correction</strong> — Profile → Edit Profile lets you update your name and email at any time.</Li>
          <Li><strong className="text-white">Deletion</strong> — Profile → Delete Account permanently removes your account, wishlist, and notifications. Feedback and bug reports are anonymised (the userId reference is removed, not the report itself).</Li>
          <Li><strong className="text-white">Portability</strong> — the exported JSON is machine-readable and can be imported into any compatible system.</Li>
        </ul>

        <H2>7. Data retention</H2>
        <ul className="list-disc pl-5 mb-3 space-y-1">
          <Li>Account data — kept until you delete your account</Li>
          <Li>Notifications — auto-deleted after 30 days via a MongoDB TTL index</Li>
          <Li>Feedback / bug reports — kept indefinitely (anonymised on account deletion)</Li>
        </ul>

        <H2>8. Security</H2>
        <P>
          Passwords are hashed with bcrypt (cost factor 12). OTP and reset codes are stored as
          SHA-256 hashes, never in plain text. All API routes are rate-limited. JWT tokens are
          stored in httpOnly cookies, not localStorage. Connections to MongoDB and all external
          APIs use TLS.
        </P>

        <H2>9. Children</H2>
        <P>
          DisLow is not directed at children under 13. We do not knowingly collect data from
          anyone under 13. If you believe a child has created an account, contact us and we will
          delete it.
        </P>

        <H2>10. Changes to this policy</H2>
        <P>
          We may update this policy. Material changes will be communicated via an in-app
          notification. Continued use of DisLow after the update constitutes acceptance of the
          revised policy.
        </P>

        <H2>11. Contact</H2>
        <P>
          Questions, requests, or complaints: <span className="text-brand-blue">support@dislow.app</span>
        </P>
      </div>
    </ProfileSubLayout>
  )
}
