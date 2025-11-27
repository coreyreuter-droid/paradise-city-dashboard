import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="w-full bg-white shadow-sm border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-3 flex gap-6 text-sm font-medium">
        <Link href="/" className="text-slate-700 hover:text-slate-900">Home</Link>
        <Link href="/paradise" className="text-slate-700 hover:text-slate-900">Paradise City</Link>
        <Link
  href="/paradise/analytics"
  className="text-sm font-medium text-slate-600 hover:text-slate-900"
>
  Analytics
</Link>
        <Link href="/paradise/budget" className="text-slate-700 hover:text-slate-900">Budget</Link>
        <Link href="/paradise/departments" className="text-slate-700 hover:text-slate-900">Departments</Link>
        <Link href="/paradise/transactions" className="text-slate-700 hover:text-slate-900">Transactions</Link>
      </div>
    </nav>
  );
}
