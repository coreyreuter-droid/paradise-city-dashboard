type SectionHeaderProps = {
  title: string;
  description?: string;
};

export default function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
      {description && (
        <p className="mt-2 text-slate-600">{description}</p>
      )}
    </div>
  );
}
