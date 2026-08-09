import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Steel Scale Systems",
  description: "How Steel Scale Systems collects, uses, and protects your information, including SMS/text messaging.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 3, 2026">
      <p>
        This Privacy Policy explains how <strong>Steel Scale Systems</strong> (&ldquo;Steel Scale,&rdquo;
        &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, and protects information when you visit
        our website, request a quote or mockup, or communicate with us by email or text message. By using our
        website or providing your information, you agree to this Policy.
      </p>

      <h2>1. Who we are</h2>
      <p>
        Steel Scale Systems is a web design and marketing agency that builds branded websites and provides a
        lead-management (CRM) platform for local service businesses. You can reach us at{" "}
        <a href="mailto:support@steelscale.xyz">support@steelscale.xyz</a>.
      </p>

      <h2>2. Information we collect</h2>
      <ul>
        <li>
          <strong>Information you provide:</strong> your name, business name, email address, phone number, mailing
          address, and any details you submit through our contact, quote, or onboarding forms.
        </li>
        <li>
          <strong>Customer information (on behalf of our clients):</strong> when we operate websites and CRM tools
          for our business clients, we process contact details that their customers submit (name, phone, email,
          message, and service interest) so those leads can be delivered to the business.
        </li>
        <li>
          <strong>Usage information:</strong> basic technical data such as IP address, browser type, and pages
          visited, collected automatically to keep our services secure and working.
        </li>
      </ul>

      <h2>3. How we use information</h2>
      <ul>
        <li>To respond to inquiries and provide quotes, mockups, and services.</li>
        <li>To build, host, and maintain websites and deliver leads to the appropriate business.</li>
        <li>To send service-related communications, including email and, where you have consented, text messages.</li>
        <li>To improve our services and keep them secure.</li>
        <li>To comply with legal obligations.</li>
      </ul>

      <h2>4. SMS / text messaging</h2>
      <p>
        If you provide your mobile number and opt in, you may receive text messages (SMS) from us or from a
        business we serve — for example, appointment or quote follow-ups and requests to leave a review after a
        completed job.
      </p>
      <ul>
        <li>
          <strong>Consent:</strong> we only send text messages to people who have provided their phone number and
          agreed to be contacted. Consent to receive text messages is not a condition of any purchase.
        </li>
        <li><strong>Message frequency</strong> varies and depends on your interaction with us and our clients.</li>
        <li><strong>Message and data rates may apply</strong>, depending on your mobile carrier and plan.</li>
        <li>
          <strong>Opt out at any time</strong> by replying <strong>STOP</strong> to any message. Reply{" "}
          <strong>HELP</strong> for help. You may also contact us at{" "}
          <a href="mailto:support@steelscale.xyz">support@steelscale.xyz</a>.
        </li>
      </ul>
      <p>
        <strong>
          No mobile information (including phone numbers and text-messaging opt-in/consent) will be sold, rented,
          or shared with third parties or affiliates for their own marketing or promotional purposes.
        </strong>{" "}
        Text-messaging originator opt-in data and consent are never shared with any third parties, and this
        exclusion applies to all categories of sharing described in this Policy. We share this information only with
        service providers (such as our SMS delivery provider) strictly to send the messages you requested.
      </p>

      <h2>5. How we share information</h2>
      <p>We do not sell your personal information. We share information only as follows:</p>
      <ul>
        <li>
          <strong>Service providers:</strong> trusted vendors that help us operate, such as Twilio (text messaging),
          Resend (email), Supabase (database/authentication), and Vercel (hosting). They may only use the
          information to perform services for us.
        </li>
        <li>
          <strong>Our business clients:</strong> leads submitted through a client&rsquo;s website are shared with that
          business so they can respond to you.
        </li>
        <li>
          <strong>Legal reasons:</strong> when required by law, or to protect our rights, users, or the public.
        </li>
      </ul>

      <h2>6. Cookies</h2>
      <p>
        We use minimal cookies and similar technologies to keep our site functioning and secure. You can control
        cookies through your browser settings.
      </p>

      <h2>7. Data retention</h2>
      <p>
        We keep information for as long as needed to provide our services and for legitimate business or legal
        purposes, then delete or de-identify it.
      </p>

      <h2>8. Security</h2>
      <p>
        We use reasonable technical and organizational measures to protect information. No method of transmission or
        storage is 100% secure, so we cannot guarantee absolute security.
      </p>

      <h2>9. Your choices and rights</h2>
      <ul>
        <li>Opt out of text messages by replying STOP.</li>
        <li>Unsubscribe from marketing emails using the link in the email.</li>
        <li>
          Request access to, correction of, or deletion of your personal information by emailing{" "}
          <a href="mailto:support@steelscale.xyz">support@steelscale.xyz</a>.
        </li>
      </ul>

      <h2>10. Children</h2>
      <p>Our services are intended for businesses and adults. We do not knowingly collect information from children under 13.</p>

      <h2>11. Third-party links</h2>
      <p>Our site may link to third-party sites we do not control and whose privacy practices we are not responsible for.</p>

      <h2>12. Changes to this Policy</h2>
      <p>
        We may update this Policy from time to time. The &ldquo;Last updated&rdquo; date above reflects the latest
        version, and continued use of our services means you accept the updated Policy.
      </p>

      <h2>13. Contact us</h2>
      <p>
        Questions about this Policy? Email{" "}
        <a href="mailto:support@steelscale.xyz">support@steelscale.xyz</a>.
      </p>
    </LegalPage>
  );
}
