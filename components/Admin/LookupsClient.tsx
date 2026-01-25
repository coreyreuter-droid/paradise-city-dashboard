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

  // Add fund
  async function handleAddFund() {
    if (!newFundCode.trim() || !newFundName.trim()) {
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
          funds: [{ fund_code: newFundCode.trim(), fund_name: newFundName.trim() }],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setInfo("Fund added successfully");
        setNewFundCode("");
        setNewFundName("");
        loadFunds();
      } else {
        setError(data.error || "Failed to add fund");
      }
    } catch (err) {
      setError("Failed to add fund");
    } finally {
      setIsLoading(false);
    }
  }

  // Add department
  async function handleAddDepartment() {
    if (!newDeptCode.trim() || !newDeptName.trim()) {
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
          departments: [{ department_code: newDeptCode.trim(), department_name: newDeptName.trim() }],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setInfo("Department added successfully");
        setNewDeptCode("");
        setNewDeptName("");
        loadDepartments();
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

  // Search handler
  function handleSearch() {
    if (activeTab === "funds") {
      loadFunds();
    } else {
      loadDepartments();
    }
  }

  return (
    <div className="space-y-6">
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
                onClick={handleAddFund}
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
                onClick={handleAddDepartment}
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
