import SectionHeader from "../../../components/SectionHeader";
import CardContainer from "../../../components/CardContainer";

export default function DepartmentsPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10">

        <SectionHeader
          title="Departments"
          description="Explore spending, budgets, and trends by department."
        />

        <CardContainer>
          <p className="text-slate-500">
            [Department list and detail section placeholder]
          </p>
        </CardContainer>

      </div>
    </main>
  );
}
