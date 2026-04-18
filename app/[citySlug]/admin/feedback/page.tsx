// app/[citySlug]/admin/feedback/page.tsx
import { getCitizenFeedback } from "@/lib/queries";
import CardContainer from "@/components/CardContainer";
import SectionHeader from "@/components/SectionHeader";
import FeedbackInbox from "@/components/Admin/FeedbackInbox";

export const revalidate = 0;

export default async function AdminFeedbackPage() {
  const feedback = await getCitizenFeedback();

  const newCount = feedback.filter((f) => f.status === "new").length;
  const totalCount = feedback.length;

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-3 py-6 sm:px-4 sm:py-8">
      <SectionHeader
        eyebrow="Admin"
        title="Citizen Feedback"
        description="Questions and comments submitted by citizens through the portal."
        showShare={false}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">New</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{newCount}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">awaiting review</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{totalCount}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">all time</p>
        </div>
      </div>

      {/* Feedback list */}
      <CardContainer>
        <FeedbackInbox feedback={feedback} />
      </CardContainer>
    </div>
  );
}
