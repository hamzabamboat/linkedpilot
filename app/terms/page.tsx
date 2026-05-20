export const metadata = { title: 'Terms of Service – Personalink', description: 'Terms governing use of the Personalink platform.' };

export default function TermsPage() {
  return (
    <main style={{ background: '#050813', color: '#e2e8f0', minHeight: '100vh', padding: 'clamp(64px,8vw,96px) clamp(16px,5vw,80px)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, marginBottom: 8, color: '#fff' }}>Terms of Service</h1>
        <p style={{ color: '#94a3b8', marginBottom: 48 }}>Last updated: May 2025</p>

        <Section title="1. Acceptance">
          By creating an account or using Personalink you agree to these Terms. If you do not agree, do not use the service.
        </Section>

        <Section title="2. The Service">
          Personalink provides AI-assisted LinkedIn content creation, profile optimisation, and scheduling tools. Features and plans may change with reasonable notice.
        </Section>

        <Section title="3. Accounts">
          <ul>
            <li>You must provide accurate information when registering.</li>
            <li>You are responsible for all activity under your account.</li>
            <li>Notify us immediately at <a href="mailto:support@personalink.in" style={{ color: '#6366f1' }}>support@personalink.in</a> if you suspect unauthorised access.</li>
            <li>One account per person. Sub-accounts for agencies are available under our Agency plan.</li>
          </ul>
        </Section>

        <Section title="4. Acceptable Use">
          You agree <strong>not</strong> to:
          <ul>
            <li>Use Personalink to post spam, misleading content, or content that violates LinkedIn's own terms.</li>
            <li>Resell or sublicense access to Personalink without our written consent.</li>
            <li>Reverse-engineer or scrape our platform.</li>
            <li>Use the service for any unlawful purpose.</li>
          </ul>
        </Section>

        <Section title="5. Subscriptions & Billing">
          <ul>
            <li>Paid plans are billed monthly or annually in advance.</li>
            <li>All fees are non-refundable except where required by law or explicitly stated in our refund policy.</li>
            <li>We may change prices with 30 days' notice. Continued use after the notice period constitutes acceptance.</li>
            <li>Indian users are billed in INR via Razorpay; international users are billed in USD via Stripe.</li>
          </ul>
        </Section>

        <Section title="6. Intellectual Property">
          Personalink and its original content are our property. Content you create using Personalink belongs to you. By using the service you grant us a limited licence to process your content solely to provide the service.
        </Section>

        <Section title="7. AI-Generated Content">
          Our AI tools assist you in drafting content — you are solely responsible for reviewing and publishing it. We do not guarantee the accuracy, originality, or appropriateness of AI outputs.
        </Section>

        <Section title="8. Disclaimer of Warranties">
          The service is provided <strong>"as is"</strong> without warranties of any kind. We do not guarantee uninterrupted availability or specific results from using our tools.
        </Section>

        <Section title="9. Limitation of Liability">
          To the maximum extent permitted by law, Personalink's total liability for any claim arising from use of the service is limited to the amount you paid us in the 3 months preceding the claim.
        </Section>

        <Section title="10. Termination">
          We may suspend or terminate accounts that violate these Terms. You may cancel your subscription at any time from your account settings; cancellation takes effect at the end of the current billing period.
        </Section>

        <Section title="11. Governing Law">
          These Terms are governed by the laws of India. Disputes will be resolved in courts located in Mumbai, Maharashtra.
        </Section>

        <Section title="12. Changes">
          We may update these Terms. We will give at least 7 days' notice of material changes via email or in-app notice.
        </Section>

        <Section title="13. Contact">
          Questions? Email <a href="mailto:support@personalink.in" style={{ color: '#6366f1' }}>support@personalink.in</a>.
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 12 }}>{title}</h2>
      <div style={{ lineHeight: 1.7, color: '#cbd5e1' }}>{children}</div>
    </section>
  );
}
