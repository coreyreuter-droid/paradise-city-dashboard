// app/privacy/page.tsx
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | CiviPortal",
  description: "Privacy Policy for CiviPortal government transparency portals",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-2 text-3xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="mb-8 text-sm text-slate-500">Last updated: December 31, 2024</p>

        <div className="prose prose-slate max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">1. Introduction</h2>
            <p className="mt-3 text-slate-700">
              {`CiviPortal LLC ("CiviPortal," "we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect information when you visit public transparency portals operated on the CiviPortal platform.`}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">2. Information We Collect</h2>
            
            <h3 className="mt-4 text-lg font-medium text-slate-800">Public Visitors</h3>
            <p className="mt-2 text-slate-700">
              When you visit a public CiviPortal transparency portal, we collect minimal information:
            </p>
            <ul className="mt-2 list-disc pl-6 text-slate-700">
              <li><strong>Server logs:</strong> Our hosting provider (Vercel) automatically collects 
              standard server log information, including your IP address, browser type, referring 
              page, and pages visited. This is standard for all websites.</li>
              <li><strong>No cookies for public visitors:</strong> We do not use cookies, tracking 
              pixels, or third-party analytics for public visitors viewing transparency data.</li>
              <li><strong>No account required:</strong> You can view all public data without 
              creating an account or providing any personal information.</li>
            </ul>

            <h3 className="mt-4 text-lg font-medium text-slate-800">Portal Administrators</h3>
            <p className="mt-2 text-slate-700">
              If you are a government administrator with login access:
            </p>
            <ul className="mt-2 list-disc pl-6 text-slate-700">
              <li><strong>Account information:</strong> Email address used for authentication</li>
              <li><strong>Authentication cookies:</strong> Session cookies necessary for secure login</li>
              <li><strong>Audit logs:</strong> Records of administrative actions for security purposes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">3. How We Use Information</h2>
            <p className="mt-3 text-slate-700">We use the limited information we collect to:</p>
            <ul className="mt-2 list-disc pl-6 text-slate-700">
              <li>Provide and maintain the Service</li>
              <li>Ensure security and prevent abuse</li>
              <li>Debug and improve the platform</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p className="mt-3 text-slate-700">
              <strong>We do not sell, rent, or share your personal information with third parties 
              for marketing purposes.</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">4. Third-Party Services</h2>
            <p className="mt-3 text-slate-700">
              We use the following third-party services to operate CiviPortal:
            </p>
            <ul className="mt-2 list-disc pl-6 text-slate-700">
              <li><strong>Vercel:</strong> Website hosting and deployment 
                (<a href="https://vercel.com/legal/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a>)</li>
              <li><strong>Supabase:</strong> Database and authentication 
                (<a href="https://supabase.com/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>)</li>
            </ul>
            <p className="mt-3 text-slate-700">
              These services may collect server logs and technical data as described in their 
              respective privacy policies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">5. Government Financial Data</h2>
            <p className="mt-3 text-slate-700">
              The financial data displayed on CiviPortal transparency portals (budgets, expenditures, 
              vendor payments, etc.) is public information provided by government entities. This data 
              may include names of vendors, contractors, and payees as part of public records.
            </p>
            <p className="mt-3 text-slate-700">
              If you believe your personal information has been published in error or have questions 
              about specific data, please contact the government entity that operates that portal.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">6. Data Security</h2>
            <p className="mt-3 text-slate-700">
              We implement appropriate technical and organizational measures to protect information, 
              including:
            </p>
            <ul className="mt-2 list-disc pl-6 text-slate-700">
              <li>Encryption of data in transit (TLS/SSL)</li>
              <li>Encryption of data at rest</li>
              <li>Secure authentication for administrative access</li>
              <li>Regular security updates</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">7. Data Retention</h2>
            <p className="mt-3 text-slate-700">
              {`Server logs are retained for a limited period as determined by our hosting provider's standard practices. Administrator account information is retained while the account is active and for a reasonable period thereafter.`}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">{`8. Children's Privacy`}</h2>
            <p className="mt-3 text-slate-700">
              {`The Service is not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13.`}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">9. Your Rights</h2>
            <p className="mt-3 text-slate-700">
              Depending on your location, you may have certain rights regarding your personal 
              information, including the right to access, correct, or delete your data. To exercise 
              these rights, please contact us using the information below.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">10. Changes to This Policy</h2>
            <p className="mt-3 text-slate-700">
              {`We may update this Privacy Policy from time to time. If we make material changes, we will update the "Last updated" date at the top of this page.`}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">11. Contact Us</h2>
            <p className="mt-3 text-slate-700">
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <p className="mt-3 text-slate-700">
              CiviPortal LLC<br />
              4049 Pennsylvania Ave, Ste 203<br />
              Kansas City, MO 64111<br />
              Email: hello@civiportal.com
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-slate-200 pt-8">
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Back to portal
          </Link>
        </div>
      </div>
    </div>
  );
}
