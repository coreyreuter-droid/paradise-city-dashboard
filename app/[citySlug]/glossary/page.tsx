// app/[citySlug]/glossary/page.tsx
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
    title: `Budget Glossary – ${city} Financial Transparency`,
    description: `Common financial terms explained in plain language. Understand ${city}'s budget, spending, and revenue data.`,
  };
}

const TERMS: Array<{ term: string; definition: string; category: string }> = [
  { term: "Adopted Budget", category: "Budget", definition: "The budget approved by the governing body (city council, board, etc.) at the start of the fiscal year. This is the official spending plan that authorizes departments to spend up to certain amounts." },
  { term: "Amended Budget", category: "Budget", definition: "A revised version of the adopted budget, modified during the fiscal year to reflect changes in revenue, priorities, or unexpected expenses. The original adopted budget stays on record for comparison." },
  { term: "Actuals", category: "Spending", definition: "The real dollars actually spent or received, as opposed to what was planned in the budget. Also called actual expenditures or actual revenue." },
  { term: "Variance", category: "Budget", definition: "The difference between what was budgeted and what was actually spent. A positive variance (under budget) means the department spent less than planned. A negative variance (over budget) means it spent more." },
  { term: "Fiscal Year", category: "General", definition: "A 12-month accounting period used by the government for budgeting and financial reporting. It may not align with the calendar year. For example, FY2025 might run from July 1, 2024 to June 30, 2025." },
  { term: "Fund", category: "Structure", definition: "A self-contained accounting entity with its own revenues and expenditures. Governments use separate funds to track money restricted for specific purposes. Common examples include the General Fund, Water Fund, and Capital Improvement Fund." },
  { term: "General Fund", category: "Structure", definition: "The primary operating fund of the government. It covers most day-to-day services like public safety, parks, administration, and community services. Most tax revenue flows into the General Fund." },
  { term: "Enterprise Fund", category: "Structure", definition: "A fund for services that operate like a business, charging fees to cover their own costs. Examples include water, sewer, electric, and trash collection utilities." },
  { term: "Capital Project", category: "Projects", definition: "A large, one-time investment in infrastructure or facilities, such as building a new road, renovating a fire station, or upgrading a water treatment plant. These are typically funded through bonds, grants, or dedicated capital funds." },
  { term: "Per Capita", category: "General", definition: "Per person. Budget per capita divides the total budget by the population, showing approximately how much is allocated per resident. This makes it easier to compare spending across cities of different sizes." },
  { term: "Budget Execution", category: "Budget", definition: "The percentage of the adopted budget that has actually been spent so far. For example, 85% execution means 85 cents of every budgeted dollar has been spent. This helps track whether spending is on pace." },
  { term: "Department", category: "Structure", definition: "An organizational unit within the government responsible for delivering specific services. Examples include Police, Fire, Public Works, Parks & Recreation, and Finance." },
  { term: "Revenue", category: "Revenue", definition: "Income received by the government from all sources including property taxes, sales taxes, fees for services, intergovernmental grants, fines, and investment earnings." },
  { term: "Expenditure", category: "Spending", definition: "Money spent by the government to provide services, pay employees, purchase supplies, maintain facilities, or fund capital projects." },
  { term: "Property Tax", category: "Revenue", definition: "A tax levied on real estate (land and buildings) based on assessed value. Property tax is typically the largest revenue source for cities and counties." },
  { term: "Sales Tax", category: "Revenue", definition: "A tax collected on retail sales of goods and certain services. The city's share of sales tax revenue depends on state laws and local agreements." },
  { term: "Intergovernmental Revenue", category: "Revenue", definition: "Money received from other levels of government (state or federal) in the form of grants, shared taxes, or reimbursements for specific programs or services." },
  { term: "Bond", category: "General", definition: "A form of borrowing where the government issues debt to investors and promises to repay with interest over time. Bonds are commonly used to finance large capital projects like roads, buildings, and utilities." },
  { term: "Operating Budget", category: "Budget", definition: "The portion of the budget that covers day-to-day expenses like salaries, utilities, supplies, and contracted services. This is distinct from the capital budget which covers long-term investments." },
  { term: "Capital Budget", category: "Budget", definition: "The portion of the budget dedicated to long-term investments in infrastructure, equipment, and facilities. Capital projects are typically large, one-time expenditures with multi-year timelines." },
];

const CATEGORIES = [...new Set(TERMS.map((t) => t.category))];

export default async function GlossaryPage() {
  const settings = await getPortalSettings();
  const cityName = settings?.city_name?.trim() || "our community";

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-3 py-6 sm:px-4 sm:py-8">
      <SectionHeader
        eyebrow="Learn"
        title="Budget glossary"
        description={`Common financial terms explained in plain language. Understanding these terms will help you make sense of ${cityName}'s budget and spending data.`}
      />

      <nav aria-label="Breadcrumb" className="px-1 text-xs text-slate-600">
        <Link href={cityHref("/overview")} className="hover:text-slate-800">Home</Link>
        <span className="mx-1 text-slate-400" aria-hidden="true">›</span>
        <span className="font-medium text-slate-700">Glossary</span>
      </nav>

      {CATEGORIES.map((category) => {
        const terms = TERMS.filter((t) => t.category === category);
        return (
          <CardContainer key={category}>
            <section aria-label={`${category} terms`} className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{category}</h2>
              <dl className="divide-y divide-slate-100">
                {terms.map((t) => (
                  <div key={t.term} className="py-3 first:pt-0 last:pb-0">
                    <dt className="text-sm font-semibold text-slate-900">{t.term}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-slate-600">{t.definition}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </CardContainer>
        );
      })}
    </div>
  );
}
