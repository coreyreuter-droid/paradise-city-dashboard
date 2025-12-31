// app/terms/page.tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | CiviPortal",
  description: "Terms of Service for CiviPortal government transparency portals",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-2 text-3xl font-bold text-slate-900">Terms of Service</h1>
        <p className="mb-8 text-sm text-slate-500">Last updated: December 31, 2024</p>

        <div className="prose prose-slate max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">1. Introduction</h2>
            <p className="mt-3 text-slate-700">
              Welcome to CiviPortal. These Terms of Service ("Terms") govern your access to and use 
              of public transparency portals operated on the CiviPortal platform ("Service"), 
              provided by CiviPortal LLC ("CiviPortal," "we," "us," or "our").
            </p>
            <p className="mt-3 text-slate-700">
              By accessing or using any CiviPortal transparency portal, you agree to be bound by 
              these Terms. If you do not agree to these Terms, please do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">2. Description of Service</h2>
            <p className="mt-3 text-slate-700">
              CiviPortal provides a platform that enables government entities ("Government Partners") 
              to publish financial data, including budgets, expenditures, revenues, and related 
              information, for public viewing. Each portal is operated on behalf of a specific 
              Government Partner.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">3. Data Accuracy and Responsibility</h2>
            <p className="mt-3 text-slate-700">
              All financial data displayed on CiviPortal transparency portals is provided by the 
              respective Government Partner. CiviPortal serves as a technology platform and does 
              not independently verify, audit, or guarantee the accuracy, completeness, or 
              timeliness of the data.
            </p>
            <p className="mt-3 text-slate-700">
              <strong>The Government Partner is solely responsible for the accuracy and completeness 
              of all data published on their portal.</strong> Questions about specific data should be 
              directed to the Government Partner's finance or administrative office.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">4. Acceptable Use</h2>
            <p className="mt-3 text-slate-700">
              You may use the Service for lawful purposes, including viewing, researching, and 
              analyzing publicly available government financial data. You agree not to:
            </p>
            <ul className="mt-3 list-disc pl-6 text-slate-700">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
              <li>Attempt to gain unauthorized access to any portion of the Service or any related systems</li>
              <li>Interfere with or disrupt the Service or servers or networks connected to the Service</li>
              <li>Use automated systems (bots, scrapers) to access the Service in a manner that exceeds reasonable use or burdens the Service, except for reasonable indexing by search engines</li>
              <li>Misrepresent the data or its source, or use the data in a misleading manner</li>
              <li>Remove or alter any proprietary notices or labels on the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">5. Intellectual Property</h2>
            <p className="mt-3 text-slate-700">
              The CiviPortal platform, including its design, features, and functionality, is owned 
              by CiviPortal LLC and is protected by intellectual property laws. The financial data 
              displayed on each portal is owned by or licensed to the respective Government Partner 
              and is made available as public information.
            </p>
            <p className="mt-3 text-slate-700">
              You may use the publicly available data for personal, educational, journalistic, or 
              research purposes, subject to any applicable laws regarding public records.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">6. Disclaimer of Warranties</h2>
            <p className="mt-3 text-slate-700">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
              EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF 
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
            <p className="mt-3 text-slate-700">
              CiviPortal does not warrant that the Service will be uninterrupted, error-free, or 
              free of viruses or other harmful components. CiviPortal does not warrant the accuracy, 
              completeness, or reliability of any data or content available through the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">7. Limitation of Liability</h2>
            <p className="mt-3 text-slate-700">
              TO THE FULLEST EXTENT PERMITTED BY LAW, CIVIPORTAL SHALL NOT BE LIABLE FOR ANY 
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF 
              PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, 
              USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR ACCESS TO OR USE OF 
              (OR INABILITY TO ACCESS OR USE) THE SERVICE.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">8. Changes to Terms</h2>
            <p className="mt-3 text-slate-700">
              We may modify these Terms at any time. If we make material changes, we will update 
              the "Last updated" date at the top of this page. Your continued use of the Service 
              after any changes constitutes your acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">9. Governing Law</h2>
            <p className="mt-3 text-slate-700">
              These Terms shall be governed by and construed in accordance with the laws of the 
              State of Missouri, without regard to its conflict of laws principles.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900">10. Contact</h2>
            <p className="mt-3 text-slate-700">
              If you have questions about these Terms, please contact us at:
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
          <a href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Back to portal
          </a>
        </div>
      </div>
    </div>
  );
}
