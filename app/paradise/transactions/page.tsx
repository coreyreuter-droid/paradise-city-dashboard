import SectionHeader from "../../../components/SectionHeader";
import CardContainer from "../../../components/CardContainer";
import { supabase } from "../../../lib/supabase";

type Txn = {
  date: string;
  fiscal_year: number;
  fund_name: string | null;
  department_name: string | null;
  vendor: string | null;
  description: string | null;
  amount: number;
};

async function getTransactions(): Promise<Txn[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "date, fiscal_year, fund_name, department_name, vendor, description, amount"
    )
    .order("date", { ascending: false })
    .limit(100); // keep it light for demo

  if (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }

  return (data || []) as Txn[];
}

const formatCurrency = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

export default async function TransactionsPage() {
  const transactions = await getTransactions();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <SectionHeader
          title="Transactions"
          description="Most recent 100 transactions for Paradise City."
        />

        <CardContainer>
          {transactions.length === 0 ? (
            <p className="text-slate-500">No transactions available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Date
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Fiscal Year
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Fund
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Department
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Vendor
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Description
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, idx) => (
                    <tr key={`${tx.date}-${tx.fiscal_year}-${idx}`} className="border-b border-slate-100">
                      <td className="px-3 py-2 text-slate-900">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {tx.fiscal_year}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {tx.fund_name || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {tx.department_name || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {tx.vendor || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-700 max-w-xs truncate">
                        {tx.description || "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {formatCurrency(Number(tx.amount || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContainer>
      </div>
    </main>
  );
}
