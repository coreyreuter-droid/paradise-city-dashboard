type MetricCardProps = {
  label: string;
  value: string | number;
};

export default function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <h2 className="text-sm font-medium text-slate-500">{label}</h2>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
