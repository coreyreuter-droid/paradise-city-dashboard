// components/Admin/LookupsClient.tsx
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type LookupType = "funds" | "departments";

interface FundEntry {
  id: string;
  fund_code: string;
  fund_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DepartmentEntry {
  id: string;
  department_code: string;
  department_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UnmappedCode {
  code: string;
  type: "fund" | "department";
}

export default function LookupsClient() {
  const [activeTab, setActiveTab] = useState<LookupType>("funds");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);

  // Funds state
  const [funds, setFunds] = useState<FundEntry[]>([]);
  const [newFundCode, setNewFundCode] = useState("");
  const [newFundName, setNewFundName] = useState("");

  // Departments state
  const [departments, setDepartments] = useState<DepartmentEntry[]>([]);
  const [newDeptCode, setNewDeptCode] = useState("");
  const [newDeptName, setNewDeptName] = useState("");

  // Unmapped codes state
  const [unmappedFunds, setUnmappedFunds] = useState<UnmappedCode[]>([]);
  const [unmappedDepts, setUnmappedDepts] = useState<UnmappedCode[]>([]);
  const [loadingUnmapped, setLoadingUnmapped] = useState(false);

  // Search
  const [search, setSearch] = useState("");

  function setError(msg: string) {
    setMessage(msg);
    setMessageIsError(true);
  }

  function setInfo(msg: string) {
    setMessage(msg);
    setMessageIsError(false);
  }

  function clearMessage() {
    setMessage(null);
  }

  async function getAuthToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  // Load funds
  async function loadFunds() {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const url = new URL("/api/admin/lookups/funds", window.location.origin);
      if (search) url.searchParams.set("search", search);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        setFunds(data.funds || []);
      } else {
        setError(data.error || "Failed to load funds");
      }
    } catch (err) {
      setError("Failed to load funds");
    } finally {
      setIsLoading(false);
    }
  }

  // Load departments
  async function loadDepartments() {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const url = new URL("/api/admin/lookups/departments", window.location.origin);
      if (search) url.searchParams.set("search", search);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        setDepartments(data.departments || []);
      } else {
        setError(data.error || "Failed to load departments");
      }
    } catch (err) {
      setError("Failed to load departments");
    } finally {
      setIsLoading(false);
    }
  }

  // Load unmapped codes from rollup tables
  async function loadUnmappedCodes() {
    setLoadingUnmapped(true);
    try {
      // Get all fund codes from rollups that are NOT in funds_dim
      const { data: rollupFunds, error: fundError } = await supabase
        .from("budget_actuals_year_fund")
        .select("fund_code")
        .neq("fund_code", "__UNKNOWN__");

      if (fundError) {
        console.error("Error loading rollup funds:", fundError);
      }

      // Get existing fund codes from dims
      const { data: dimFunds } = await supabase
        .from("funds_dim")
        .select("fund_code")
        .eq("is_active", true);

      const dimFundCodes = new Set((dimFunds || []).map(f => f.fund_code));
      const rollupFundCodes = new Set((rollupFunds || []).map(f => f.fund_code));
      
      // Find codes in rollups but not in dims
      const unmappedFundCodes: UnmappedCode[] = [];
      rollupFundCodes.forEach(code => {
        if (!dimFundCodes.has(code)) {
          unmappedFundCodes.push({ code, type: "fund" });
        }
      });
      setUnmappedFunds(unmappedFundCodes);

      // Get all department codes from rollups that are NOT in departments_dim
      const { data: rollupDepts, error: deptError } = await supabase
        .from("budget_actuals_year_fund_department")
        .select("department_code")
        .neq("department_code", "__UNKNOWN__");

      if (deptError) {
        console.error("Error loading rollup depts:", deptError);
      }

      // Get existing department codes from dims
      const { data: dimDepts } = await supabase
        .from("departments_dim")
        .select("department_code")
        .eq("is_active", true);

      const dimDeptCodes = new Set((dimDepts || []).map(d => d.department_code));
      const rollupDeptCodes = new Set((rollupDepts || []).map(d => d.department_code));
      
      // Find codes in rollups but not in dims
      const unmappedDeptCodes: UnmappedCode[] = [];
      rollupDeptCodes.forEach(code => {
        if (!dimDeptCodes.has(code)) {
          unmappedDeptCodes.push({ code, type: "department" });
        }
      });
      setUnmappedDepts(unmappedDeptCodes);

    } catch (err) {
      console.error("Failed to load unmapped codes:", err);
    } finally {
      setLoadingUnmapped(false);
    }
  }

  // Add fund (can be called with a code from unmapped list)
  async function handleAddFund(codeFromUnmapped?: string) {
    const codeToAdd = codeFromUnmapped || newFundCode.trim();
    const nameToAdd = newFundName.trim();
    
    // If clicking from unmapped list, populate the input and focus
    if (codeFromUnmapped) {
      setNewFundCode(codeFromUnmapped);
      setActiveTab("funds");
      setInfo(`Enter a name for fund code "${codeFromUnmapped}" and click Add`);
      return;
    }

    if (!codeToAdd || !nameToAdd) {
      setError("Fund code and name are required");
      return;
    }

    setIsLoading(true);
    clearMessage();

    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch("/api/admin/lookups/funds", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          funds: [{ fund_code: codeToAdd, fund_name: nameToAdd }],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setInfo("Fund added successfully");
        setNewFundCode("");
        setNewFundName("");
        loadFunds();
        loadUnmappedCodes(); // Refresh unmapped list
      } else {
        setError(data.error || "Failed to add fund");
      }
    } catch (err) {
      setError("Failed to add fund");
    } finally {
      setIsLoading(false);
    }
  }

  // Add department (can be called with a code from unmapped list)
  async function handleAddDepartment(codeFromUnmapped?: string) {
    const codeToAdd = codeFromUnmapped || newDeptCode.trim();
    const nameToAdd = newDeptName.trim();
    
    // If clicking from unmapped list, populate the input and focus
    if (codeFromUnmapped) {
      setNewDeptCode(codeFromUnmapped);
      setActiveTab("departments");
      setInfo(`Enter a name for department code "${codeFromUnmapped}" and click Add`);
      return;
    }

    if (!codeToAdd || !nameToAdd) {
      setError("Department code and name are required");
      return;
    }

    setIsLoading(true);
    clearMessage();

    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch("/api/admin/lookups/departments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          departments: [{ department_code: codeToAdd, department_name: nameToAdd }],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setInfo("Department added successfully");
        setNewDeptCode("");
        setNewDeptName("");
        loadDepartments();
        loadUnmappedCodes(); // Refresh unmapped list
      } else {
        setError(data.error || "Failed to add department");
      }
    } catch (err) {
      setError("Failed to add department");
    } finally {
      setIsLoading(false);
    }
  }

  // Load data on mount and tab change
  useEffect(() => {
    if (activeTab === "funds") {
      loadFunds();
    } else {
      loadDepartments();
    }
  }, [activeTab]);

  // Load unmapped codes on mount
  useEffect(() => {
    loadUnmappedCodes();
  }, []);

  // Search handler
  function handleSearch() {
    if (activeTab === "funds") {
      loadFunds();
    } else {
      loadDepartments();
    }
  }

  const totalUnmapped = unmappedFunds.length + unmappedDepts.length;

  return (
    <div className="space-y-6">
      {/* Unmapped codes warning */}
      {totalUnmapped > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-xs">!</span>
            {totalUnmapped} unmapped code{totalUnmapped !== 1 ? "s" : ""} found
          </h3>
          <p className="mt-1 text-xs text-amber-800">
            These codes appear in your data but don&apos;t have names assigned. Citizens will see &quot;Unknown (code)&quot; until you add mappings.
          </p>
          
          <div className="mt-3 space-y-2">
            {unmappedFunds.length > 0 && (
              <div>
                <span className="text-xs font-medium text-amber-900">Unmapped fund codes: </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {unmappedFunds.map((u) => (
                    <button
                      key={u.code}
                      onClick={() => handleAddFund(u.code)}
                      className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-mono text-amber-800 hover:bg-amber-200 transition-colors"
                      title={`Click to add mapping for ${u.code}`}
                    >
                      {u.code}
                      <span className="text-amber-500">+</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {unmappedDepts.length > 0 && (
              <div>
                <span className="text-xs font-medium text-amber-900">Unmapped department codes: </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {unmappedDepts.map((u) => (
                    <button
                      key={u.code}
                      onClick={() => handleAddDepartment(u.code)}
                      className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-mono text-amber-800 hover:bg-amber-200 transition-colors"
                      title={`Click to add mapping for ${u.code}`}
                    >
                      {u.code}
                      <span className="text-amber-500">+</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={loadUnmappedCodes}
            disabled={loadingUnmapped}
            className="mt-3 text-xs text-amber-700 underline hover:text-amber-900 disabled:opacity-50"
          >
            {loadingUnmapped ? "Checking..." : "Refresh"}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("funds")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "funds"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Fund Names ({funds.length})
          </button>
          <button
            onClick={() => setActiveTab("departments")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "departments"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Department Names ({departments.length})
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search by code or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          onClick={handleSearch}
          className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
        >
          Search
        </button>
      </div>

      {/* Funds tab */}
      {activeTab === "funds" && (
        <div className="space-y-4">
          {/* Add new fund */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Add new fund</h3>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Fund code (e.g., 100)"
                value={newFundCode}
                onChange={(e) => setNewFundCode(e.target.value)}
                className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Fund name (e.g., General Fund)"
                value={newFundName}
                onChange={(e) => setNewFundName(e.target.value)}
                className="flex-1 min-w-[200px] rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                onClick={() => handleAddFund()}
                disabled={isLoading}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          {/* Funds table */}
          {funds.length > 0 ? (
            <div className="rounded-md border border-slate-200 overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Code</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {funds.map((fund) => (
                    <tr key={fund.id} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-mono">{fund.fund_code}</td>
                      <td className="px-3 py-2">{fund.fund_name}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                          fund.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {fund.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-xs">
                        {new Date(fund.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-sm text-slate-500">No fund mappings yet.</p>
              <p className="mt-1 text-xs text-slate-400">
                Add funds above or upload a funds lookup CSV from the CSV mapping page.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Departments tab */}
      {activeTab === "departments" && (
        <div className="space-y-4">
          {/* Add new department */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Add new department</h3>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                placeholder="Dept code (e.g., 4500)"
                value={newDeptCode}
                onChange={(e) => setNewDeptCode(e.target.value)}
                className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Dept name (e.g., Police Department)"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                className="flex-1 min-w-[200px] rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                onClick={() => handleAddDepartment()}
                disabled={isLoading}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          {/* Departments table */}
          {departments.length > 0 ? (
            <div className="rounded-md border border-slate-200 overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Code</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept.id} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-mono">{dept.department_code}</td>
                      <td className="px-3 py-2">{dept.department_name}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                          dept.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {dept.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-xs">
                        {new Date(dept.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
              <p className="text-sm text-slate-500">No department mappings yet.</p>
              <p className="mt-1 text-xs text-slate-400">
                Add departments above or upload a departments lookup CSV from the CSV mapping page.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Message */}
      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            messageIsError
              ? "bg-red-50 border border-red-200 text-red-700"
              : "bg-emerald-50 border border-emerald-200 text-emerald-700"
          }`}
          role={messageIsError ? "alert" : "status"}
        >
          {message}
        </div>
      )}
    </div>
  );
}
