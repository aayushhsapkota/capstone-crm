import { Link } from 'react-router-dom';

const EFFECTIVE_DATE = 'August 17, 2026';
const CONTACT_EMAIL = 'contact@capstonecrm.au';

function Section({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      <div className="mt-2 space-y-3 text-sm text-slate-600 leading-relaxed">{children}</div>
    </section>
  );
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link to="/" className="text-sm text-blue-600 hover:underline">
          ← Back to Capstone CRM
        </Link>

        <div className="flex items-center gap-2.5 mt-6">
          <img src="/logo.png" alt="" className="w-8 h-8 rounded-lg" />
          <span className="text-base font-semibold text-slate-800">Capstone CRM</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mt-6">Terms of Service</h1>
        <p className="text-xs text-slate-400 mt-1">Effective {EFFECTIVE_DATE}</p>

        <p className="mt-4 text-sm text-slate-600 leading-relaxed">
          These Terms of Service ("Terms") govern your use of Capstone CRM ("Capstone," "we,"
          "us"), an outreach tool that helps a business find leads and send outreach emails from
          the user's own Gmail account. By using Capstone, you agree to these Terms. Also see our{' '}
          <Link to="/privacy" className="text-blue-600 hover:underline">
            Privacy Policy
          </Link>
          , which explains what data we collect and how it's used.
        </p>

        <Section title="The Service">
          <p>
            Capstone lets you search for and store information about businesses, generate
            outreach email content, and send that email through a Gmail account you connect and
            control. Capstone sends email only when you initiate a send — it does not send email
            on its own, and it does not read, monitor, or manage your inbox.
          </p>
        </Section>

        <Section title="Your Account and Connected Gmail">
          <p>
            When you connect a Gmail account, you're granting Capstone permission to send email
            as you, using Google's <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">gmail.send</code>{' '}
            scope. You're responsible for the emails sent through your connected account,
            including their content and recipients. You can disconnect Gmail at any time from
            Integrations settings, or revoke access directly from your Google Account's{' '}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
            >
              Third-party apps & services
            </a>{' '}
            settings.
          </p>
        </Section>

        <Section title="Acceptable Use">
          <p>You agree not to use Capstone to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Send unsolicited bulk email, spam, or misleading content;</li>
            <li>
              Violate applicable anti-spam or electronic marketing laws (such as CAN-SPAM or
              equivalent laws in your jurisdiction), or Google's own{' '}
              <a
                href="https://support.google.com/mail/answer/81126"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                Gmail sending policies
              </a>
              ;
            </li>
            <li>Scrape or contact websites or businesses in violation of their own terms of use or applicable law;</li>
            <li>Harass, impersonate, or attempt to deceive any recipient; or</li>
            <li>Attempt to interfere with or disrupt the service or the systems it depends on.</li>
          </ul>
          <p>
            You're solely responsible for complying with the laws that apply to your outreach —
            Capstone is a tool you use to send email you compose and approve; it does not vet
            recipients or content on your behalf.
          </p>
        </Section>

        <Section title="Data You Provide">
          <p>
            You retain ownership of the business, lead, and profile information you add to
            Capstone. We store and process it only to provide the service, as described in the{' '}
            <Link to="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </Section>

        <Section title="Service Availability">
          <p>
            Capstone is provided "as is," without warranties of any kind, express or implied,
            including any warranty of merchantability, fitness for a particular purpose, or
            uninterrupted availability. We may modify, suspend, or discontinue any part of the
            service at any time.
          </p>
        </Section>

        <Section title="Limitation of Liability">
          <p>
            To the fullest extent permitted by law, Capstone and its operators are not liable for
            any indirect, incidental, or consequential damages arising from your use of the
            service, including damages resulting from emails sent through your connected Gmail
            account.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            You may stop using Capstone and disconnect your Gmail account at any time. We may
            suspend or terminate access for use that violates these Terms.
          </p>
        </Section>

        <Section title="Changes to These Terms">
          <p>
            We may update these Terms from time to time. Material changes will be reflected by
            updating the effective date above.
          </p>
        </Section>

        <Section title="Contact Us">
          <p>
            Questions about these Terms can be sent to{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}
