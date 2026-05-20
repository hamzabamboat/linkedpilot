export const metadata = { title: 'Privacy Policy – Personalink', description: 'How Personalink collects, uses, and protects your data.' };

export default function PrivacyPage() {
  return (
    <main style={{ background: '#050813', color: '#e2e8f0', minHeight: '100vh', padding: 'clamp(64px,8vw,96px) clamp(16px,5vw,80px)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, marginBottom: 8, color: '#fff' }}>Privacy Policy</h1>
        <p style={{ color: '#94a3b8', marginBottom: 48 }}>Last updated: May 2025</p>

        <Section title="1. Who We Are">
          Personalink ("we", "us", "our") is a LinkedIn growth tool operated by Personalink Technologies. Our contact email is{' '}
          <a href="mailto:support@personalink.in" style={{ color: '#6366f1' }}>support@personalink.in</a>.
        </Section>

        <Section title="2. What We Collect">
          <ul>
            <li><strong>Account data</strong> – name, email address, and password (hashed) when you sign up.</li>
            <li><strong>LinkedIn data</strong> – profile information you choose to import or sync via OAuth.</li>
            <li><strong>Usage data</strong> – pages visited, features used, and timestamps, collected automatically.</li>
            <li><strong>Payment data</strong> – handled entirely by our payment processors (Stripe / Razorpay). We never store card numbers.</li>
            <li><strong>Cookies</strong> – session cookies for authentication and preference cookies (e.g. your country for pricing).</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Data">
          <ul>
            <li>To provide and improve Personalink features.</li>
            <li>To send transactional emails (receipts, password resets).</li>
            <li>To send product updates — you can unsubscribe at any time.</li>
            <li>To detect and prevent fraud or abuse.</li>
          </ul>
          We do <strong>not</strong> sell your personal data to third parties.
        </Section>

        <Section title="4. Data Sharing">
          We share data only with:
          <ul>
            <li><strong>Service providers</strong> – cloud hosting (Supabase / Vercel), analytics, and email delivery.</li>
            <li><strong>Payment processors</strong> – Stripe and Razorpay, each under their own privacy policies.</li>
            <li><strong>Legal obligations</strong> – when required by law or to protect our rights.</li>
          </ul>
        </Section>

        <Section title="5. Data Retention">
          We keep your data for as long as your account is active. You may request deletion at any time by emailing us. We will delete or anonymise your data within 30 days of a verified request.
        </Section>

        <Section title="6. Your Rights">
          Depending on your jurisdiction you may have the right to access, correct, port, or delete your personal data. Email{' '}
          <a href="mailto:support@personalink.in" style={{ color: '#6366f1' }}>support@personalink.in</a> to exercise any of these rights.
        </Section>

        <Section title="7. Security">
          We use industry-standard encryption (TLS in transit, AES-256 at rest) and regularly review our security practices. No system is 100% secure — please use a strong, unique password.
        </Section>

        <Section title="8. Children">
          Personalink is not directed at children under 16. We do not knowingly collect data from minors.
        </Section>

        <Section title="9. Changes">
          We may update this policy. We will notify you by email or in-app notice at least 7 days before material changes take effect.
        </Section>

        <Section title="10. Contact">
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
