import ProfileSubLayout from "@/components/profile/ProfileSubLayout"

const cardStyle = {
  background: "rgba(28,30,42,0.70)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 14,
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  padding: "28px 28px",
} as const

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[14px] font-bold text-white mt-6 mb-2 first:mt-0">{children}</h2>
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.55)" }}>{children}</p>
}
function Li({ children }: { children: React.ReactNode }) {
  return <li className="text-[12px] leading-relaxed mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>{children}</li>
}

export default function TermsPage() {
  return (
    <ProfileSubLayout title="Terms of Service" backHref="/profile">
      <div style={cardStyle}>
        <p className="text-[11px] mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>
          Last updated: 21 May 2026
        </p>

        <H2>1. Acceptance</H2>
        <P>
          By creating an account or using DisLow you agree to these Terms. If you do not agree,
          do not use the service. These Terms form the entire agreement between you and DisLow.
        </P>

        <H2>2. What DisLow is</H2>
        <P>
          DisLow aggregates publicly available game pricing and event data from third-party
          sources (RAWG, CheapShark, IsThereAnyDeal, Steam). We display this information as a
          convenience. We are not a retailer — we do not sell games, process payments, or fulfil
          orders. All purchases happen directly on the respective store's platform.
        </P>

        <H2>3. Acceptable use</H2>
        <P>You may use DisLow to:</P>
        <ul className="list-disc pl-5 mb-3 space-y-1">
          <Li>Browse, search, and track game prices</Li>
          <Li>Save games to your personal favorites list</Li>
          <Li>Receive notifications about price drops and in-game events</Li>
          <Li>Share deal links with friends via the native share sheet</Li>
        </ul>
        <P>You may not use DisLow to:</P>
        <ul className="list-disc pl-5 mb-3 space-y-1">
          <Li>Scrape, crawl, or automated-fetch data in bulk from our servers</Li>
          <Li>Reverse-engineer or attempt to extract our backend API keys</Li>
          <Li>Submit abusive, harassing, or illegal content in feedback or bug reports</Li>
          <Li>Create accounts using false identities or for the purpose of spam</Li>
          <Li>Attempt to circumvent rate limits or authentication mechanisms</Li>
        </ul>

        <H2>4. Accuracy of price data</H2>
        <P>
          Prices displayed on DisLow are sourced from third parties and may be delayed by up to
          24 hours. DisLow makes no warranty that any price shown is accurate, current, or
          available in your region. <strong className="text-white">Always confirm the final
          price on the store's checkout page before purchasing.</strong> DisLow is not
          responsible for any loss arising from reliance on displayed prices.
        </P>

        <H2>5. User accounts</H2>
        <P>
          You are responsible for keeping your account credentials secure. You must notify us
          immediately if you suspect unauthorised access. We may suspend or terminate accounts
          that violate these Terms without prior notice.
        </P>

        <H2>6. Intellectual property</H2>
        <P>
          Game names, cover images, and trademarks displayed on DisLow are property of their
          respective publishers. DisLow does not claim ownership of any game content. Our own
          branding, code, and UI are protected by copyright.
        </P>

        <H2>7. No warranty</H2>
        <P>
          DisLow is provided "as is" without warranty of any kind — express or implied. We do
          not guarantee uninterrupted availability, data accuracy, or fitness for any particular
          purpose. Third-party data sources may be unavailable, inaccurate, or change without notice.
        </P>

        <H2>8. Limitation of liability</H2>
        <P>
          To the maximum extent permitted by applicable law, DisLow and its operators shall not
          be liable for any indirect, incidental, consequential, or punitive damages arising from
          your use of the service, including but not limited to missed deals, incorrect pricing,
          or data loss.
        </P>

        <H2>9. Termination</H2>
        <P>
          You may delete your account at any time via Profile → Delete Account. We may terminate
          or suspend access to any account for violations of these Terms. Upon termination, your
          data will be handled as described in our Privacy Policy.
        </P>

        <H2>10. Governing law</H2>
        <P>
          These Terms are governed by the laws of the State of Israel, without regard to
          conflict-of-law principles. Any disputes shall be resolved in the courts of Tel Aviv,
          Israel, unless otherwise required by applicable consumer protection law in your
          jurisdiction.
        </P>

        <H2>11. Changes to these Terms</H2>
        <P>
          We may update these Terms. Material changes will be communicated via an in-app
          notification at least 7 days before taking effect. Continued use after the effective
          date constitutes acceptance.
        </P>

        <H2>12. Contact</H2>
        <P>
          Questions about these Terms: <span className="text-brand-blue">support@dislow.app</span>
        </P>
      </div>
    </ProfileSubLayout>
  )
}
