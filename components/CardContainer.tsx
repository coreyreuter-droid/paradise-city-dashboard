export default function CardContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      {children}
    </div>
  );
}
