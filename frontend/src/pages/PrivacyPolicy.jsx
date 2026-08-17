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

export default function PrivacyPolicy() {
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

        <h1 className="text-2xl font-bold text-slate-900 mt-6">Privacy Policy</h1>
        <p className="text-xs text-slate-400 mt-1">Effective {EFFECTIVE_DATE}</p>

        <p className="mt-4 text-sm text-slate-600 leading-relaxed">
          Capstone CRM ("Capstone," "we," "us") is an outreach tool that helps a business find
          leads, gather information about them, and send outreach emails from the user's own
          Gmail account. This policy explains what information Capstone collects, how it's used,
          and — since Capstone connects to your Google Account — specifically how it handles data
          obtained through Google APIs.
        </p>

        <Section title="Information We Collect">
          <p>
            <strong className="text-slate-700">From your Google Account (via Google Sign-In / Gmail integration):</strong>{' '}
            when you connect Gmail, Google shares your email address with us, and grants us
            permission to send email through the Gmail API on your behalf. We request only the{' '}
            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">gmail.send</code> scope —
            the narrowest Gmail permission that exists. It allows sending mail as you; it does not
            allow us to read, search, view, or modify your inbox, contacts, calendar, or any other
            Google data.
          </p>
          <p>
            <strong className="text-slate-700">Business and lead data:</strong> information you
            enter yourself, or that Capstone finds and extracts from public websites at your
            direction (business names, locations, contact details, services offered), and the
            content of outreach emails Capstone generates or sends through your account.
          </p>
          <p>
            <strong className="text-slate-700">Your profile information:</strong> your company
            name, sender name, email signature, and similar details you provide to personalize
            outreach sent through Capstone.
          </p>
        </Section>

        <Section title="How We Use Your Information">
          <p>
            We use the information above solely to operate Capstone's core functionality:
            finding and organizing leads, generating outreach content, and sending that outreach
            through the Gmail account you connected — only when you initiate a send. We do not
            use your Google Account data for advertising, and we do not sell your data to anyone.
          </p>
        </Section>

        <Section title="Google User Data — Limited Use Disclosure">
          <p>
            Capstone's use and transfer of information received from Google APIs to any other app
            will adhere to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. Google Account data obtained through the
            Gmail integration is used exclusively to send outreach emails you initiate — it is
            never used to build advertising profiles, never transferred to third parties except
            as required to provide this core functionality (e.g. sending the request to Google's
            own Gmail API), and never used to train generalized AI/ML models.
          </p>
        </Section>

        <Section title="Data Storage and Security">
          <p>
            Data is stored in a managed PostgreSQL database (hosted by Supabase). Gmail OAuth
            access and refresh tokens are encrypted at rest (AES-256-GCM) before being stored —
            they are never stored or transmitted in plain text, and are only decrypted in memory
            at the moment an email is sent.
          </p>
        </Section>

        <Section title="Other Third-Party Services">
          <p>
            Capstone uses a small number of other services to provide its functionality:{' '}
            <strong className="text-slate-700">Firecrawl</strong> to scrape publicly available
            website content for lead research, and{' '}
            <strong className="text-slate-700">Google Gemini</strong> to extract structured
            information from that content and draft outreach email copy. Neither service receives
            your Google Account credentials or Gmail data — they only process the business/lead
            information described above.
          </p>
        </Section>

        <Section title="Data Retention and Deletion">
          <p>
            We retain your data for as long as you continue to use Capstone. You may disconnect
            your Gmail account at any time from within the app (Profile menu → Integrations →
            Disconnect), which immediately deletes the stored access and refresh tokens. You can
            also revoke Capstone's access entirely at any time from your Google Account's{' '}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
            >
              Third-party apps & services
            </a>{' '}
            settings. To request deletion of any other data associated with your use of Capstone,
            contact us using the details below.
          </p>
        </Section>

        <Section title="Children's Privacy">
          <p>Capstone is a business tool not directed at, or knowingly used by, children.</p>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this policy from time to time. Material changes will be reflected by
            updating the effective date above.
          </p>
        </Section>

        <Section title="Contact Us">
          <p>
            Questions about this policy or your data can be sent to{' '}
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
