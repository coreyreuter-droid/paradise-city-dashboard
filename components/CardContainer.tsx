export default function CardContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-white p-4 sm:p-6 shadow w-full max-w-full overflow-hidden">
      {children}
    </div>
  );
}
