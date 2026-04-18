// app/[citySlug]/about/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getPortalSettings } from "@/lib/queries";
import SectionHeader from "@/components/SectionHeader";
import CardContainer from "@/components/CardContainer";
import { cityHref } from "@/lib/cityRouting";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const ps = await getPortalSettings();
  const city = ps?.city_name?.trim() || "Our City";
  return {
    title: `About This Data – ${city} Financial Transparency`,
    description: `Learn about the data sources, methodology, and update schedule behind ${city}'s financial transparency portal.`,
  };
}

export default async function AboutPage() {
  const settings = await getPortalSettings();
  const cityName = settings?.city_name?.trim() || "Our community";

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-3 py-6 sm:px-4 sm:py-8">
      <SectionHeader
        eyebrow="Transparency"
        title="About this data"
        description={`How ${cityName}'s financial data is collected, organized, and presented on this portal.`}
      />

      <nav aria-label="Breadcrumb" className="px-1 text-xs text-slate-600">
        <Link href={cityHref("/overview")} className="hover:text-slate-800">Home</Link>
        <span className="mx-1 text-slate-400" aria-hidden="true">›</span>
        <span className="font-medium text-slate-700">About this data</span>
      </nav>

      <CardContainer>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Data sources</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            The financial data on this portal comes directly from {cityName}&apos;s official accounting and budgeting
            systems. Budget figures represent the amounts approved by the governing body. Actual expenditures
            and revenues reflect recorded transactions from the city&apos;s financial system.
          </p>
          <p className="text-sm leading-relaxed text-slate-600">
            Data is uploaded by authorized finance staff through a secure administrative portal.
            Each upload is validated, mapped to the standard chart of accounts, and reviewed before
            being published to the public site.
          </p>
        </section>
      </CardContainer>

      <CardContainer>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Accounting basis</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            Municipal governments typically use modified accrual accounting for governmental funds
            and full accrual accounting for enterprise (business-type) funds, in accordance with
            standards set by the Governmental Accounting Standards Board (GASB).
          </p>
          <p className="text-sm leading-relaxed text-slate-600">
            The budget figures shown on this portal represent appropriations — the authorized spending
            limits approved by the governing body. Actual figures represent recorded expenditures and
            revenues as of the most recent data upload.
          </p>
        </section>
      </CardContainer>

      <CardContainer>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Update schedule</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            Financial data is typically updated after month-end or quarter-end close processes.
            The &ldquo;Last updated&rdquo; indicator shown on each page reflects when the most recent
            data was uploaded to the portal.
          </p>
          <p className="text-sm leading-relaxed text-slate-600">
            Budget data is updated when the annual budget is adopted and whenever budget amendments
            are approved by the governing body. Transaction-level data may be updated more frequently.
          </p>
        </section>
      </CardContainer>

      <CardContainer>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">How data is organized</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-slate-800">Departments</dt>
              <dd className="mt-0.5 text-slate-600">Organizational units responsible for delivering specific city services (e.g., Police, Fire, Public Works).</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-800">Funds</dt>
              <dd className="mt-0.5 text-slate-600">Self-contained accounting entities used to track money for specific purposes (e.g., General Fund, Water Fund, Capital Projects Fund).</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-800">Revenue sources</dt>
              <dd className="mt-0.5 text-slate-600">Categories of income such as property taxes, sales taxes, fees, grants, and intergovernmental transfers.</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-800">Fiscal year</dt>
              <dd className="mt-0.5 text-slate-600">The 12-month accounting period used for budgeting and reporting. The specific dates vary by jurisdiction.</dd>
            </div>
          </dl>
        </section>
      </CardContainer>

      <CardContainer>
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Important notes</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="text-slate-400 flex-shrink-0" aria-hidden="true">•</span>
              <span>This portal is a transparency tool, not a substitute for the official budget document or Comprehensive Annual Financial Report (CAFR).</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-400 flex-shrink-0" aria-hidden="true">•</span>
              <span>Figures may differ slightly from audited financial statements due to timing, rounding, or classification differences.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-400 flex-shrink-0" aria-hidden="true">•</span>
              <span>Capital project costs and timelines are estimates and may change as projects progress.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-400 flex-shrink-0" aria-hidden="true">•</span>
              <span>Questions about this data can be submitted through the feedback form on the dashboard page.</span>
            </li>
          </ul>
        </section>
      </CardContainer>

      <div className="flex justify-center gap-4 pt-2">
        <Link
          href={cityHref("/glossary")}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
        >
          View budget glossary
        </Link>
        <Link
          href={cityHref("/overview")}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
        >
          Explore the data
        </Link>
      </div>
    </div>
  );
}
