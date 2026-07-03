import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — Steel Scale Systems",
  description: "The terms governing use of Steel Scale Systems' website and services, including SMS/text messaging.",
};

export default function TermsOfServicePage() {
  return (
    <LegalPage title="Terms of Service" updated="July 3, 2026">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the website and services
        provided by <strong>Steel Scale Systems</strong> (&ldquo;Steel Scale,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo;
        or &ldquo;our&rdquo;). By using our website or services, you agree to these Terms. If you do not agree, please
        do not use our services.
      </p>

      <h2>1. Our services</h2>
      <p>
        Steel Scale Systems is a web design and marketing agency that builds branded websites and provides a
        lead-management (CRM) platform for local service businesses. Features may include website hosting, lead
        capture, a pipeline dashboard, email notifications, and text-message (SMS) review requests.
      </p>

      <h2>2. Eligibility</h2>
      <p>You must be at least 18 years old and able to form a binding contract to use our services.</p>

      <h2>3. Accounts</h2>
      <p>
        If you are given access to a client dashboard, you are responsible for maintaining the confidentiality of
        your login and for all activity under your account. Notify us promptly of any unauthorized use.
      </p>

      <h2>4. Text messaging (SMS) program terms</h2>
      <p>
        By providing your mobile number and opting in, you agree to receive text messages from us or from a business
        we serve, such as quote follow-ups and requests to review a completed job.
      </p>
      <ul>
        <li><strong>Consent is not a condition of purchase.</strong></li>
        <li><strong>Message frequency varies.</strong></li>
        <li><strong>Message and data rates may apply.</strong></li>
        <li>Reply <strong>STOP</strong> to opt out at any time. Reply <strong>HELP</strong> for help.</li>
        <li>Carriers are not liable for delayed or undelivered messages.</li>
      </ul>
      <p>
        For details on how we handle mobile information, see our{" "}
        <a href="/privacy">Privacy Policy</a>. Mobile opt-in data and consent are never shared with third parties for
        their own marketing purposes.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the services for unlawful, fraudulent, or abusive purposes.</li>
        <li>Send unsolicited or unlawful messages, or violate any anti-spam or telemarketing laws.</li>
        <li>Interfere with, disrupt, or attempt to gain unauthorized access to our systems.</li>
        <li>Infringe the intellectual property or privacy rights of others.</li>
      </ul>

      <h2>6. Client responsibilities</h2>
      <p>
        If you are a business using our platform, you are responsible for the content you provide, for obtaining
        valid consent before contacting your customers by text or email, and for complying with all applicable laws
        (including the TCPA, CAN-SPAM, and carrier requirements).
      </p>

      <h2>7. Intellectual property</h2>
      <p>
        Our website, software, and branding are owned by Steel Scale Systems and protected by law. Content you
        provide remains yours; you grant us the rights needed to build and operate your website and services.
      </p>

      <h2>8. Third-party services</h2>
      <p>
        Our services rely on third-party providers (for example, Twilio, Resend, Supabase, and Vercel). Your use of
        those features may also be subject to their terms, and we are not responsible for third-party services.
      </p>

      <h2>9. Fees</h2>
      <p>
        Where fees apply, they will be described in a separate agreement or order. Unless stated otherwise, fees are
        non-refundable and recurring charges continue until cancelled.
      </p>

      <h2>10. Disclaimers</h2>
      <p>
        Our services are provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind,
        express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We do
        not guarantee any specific results, lead volume, or rankings.
      </p>

      <h2>11. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Steel Scale Systems will not be liable for any indirect, incidental,
        special, or consequential damages, or for lost profits or revenue, arising from your use of the services.
        Our total liability for any claim will not exceed the amount you paid us in the three months before the
        claim.
      </p>

      <h2>12. Indemnification</h2>
      <p>
        You agree to indemnify and hold Steel Scale Systems harmless from claims arising out of your content, your
        use of the services, or your violation of these Terms or applicable law.
      </p>

      <h2>13. Termination</h2>
      <p>
        We may suspend or terminate access to the services at any time for violation of these Terms or as required
        by law. You may stop using the services at any time.
      </p>

      <h2>14. Governing law</h2>
      <p>
        These Terms are governed by the laws of the Commonwealth of Pennsylvania, USA, without regard to its
        conflict-of-laws rules.
      </p>

      <h2>15. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. The &ldquo;Last updated&rdquo; date above reflects the latest
        version, and continued use of the services means you accept the updated Terms.
      </p>

      <h2>16. Contact us</h2>
      <p>
        Questions about these Terms? Email{" "}
        <a href="mailto:support@steelscale.xyz">support@steelscale.xyz</a>.
      </p>
    </LegalPage>
  );
}
