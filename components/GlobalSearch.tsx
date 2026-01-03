// components/GlobalSearch.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import { cityHref } from "@/lib/cityRouting";

type DepartmentResult = {
  department_name: string;
  budget_amount: number;
  actual_amount: number;
};

type VendorResult = {
  vendor: string;
  total_amount: number;
  txn_count: number;
};

type TransactionResult = {
  id: string;
  date: string;
  vendor: string | null;
  description: string | null;
  amount: number;
};

type SearchResults = {
  departments: DepartmentResult[];
  vendors: VendorResult[];
  transactions: TransactionResult[];
};

type Props = {
  fiscalYear?: number | null;
  className?: string;
};

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

export default function GlobalSearch({ fiscalYear, className = "" }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Build flat list of results for keyboard navigation
  const flatResults = results
    ? [
        ...results.departments.map((d) => ({ type: "department" as const, data: d })),
        ...results.vendors.map((v) => ({ type: "vendor" as const, data: v })),
        ...results.transactions.map((t) => ({ type: "transaction" as const, data: t })),
      ]
    : [];

  const totalResults = flatResults.length;

  // Fetch search results
  const fetchResults = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < MIN_QUERY_LENGTH) {
        setResults(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const params = new URLSearchParams({ q: searchQuery });
        if (fiscalYear) {
          params.set("year", String(fiscalYear));
        }

        const res = await fetch(`/api/search?${params.toString()}`);
        if (!res.ok) throw new Error("Search failed");

        const data: SearchResults = await res.json();
        setResults(data);
        setActiveIndex(-1);
      } catch (err) {
        console.error("Search error:", err);
        setResults({ departments: [], vendors: [], transactions: [] });
      } finally {
        setIsLoading(false);
      }
    },
    [fiscalYear]
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length >= MIN_QUERY_LENGTH) {
      debounceRef.current = setTimeout(() => {
        fetchResults(query);
      }, DEBOUNCE_MS);
    } else {
      setResults(null);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, fetchResults]);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (window.innerWidth < 768) {
          setIsMobileOpen(true);
        }
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsMobileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Navigate to result
  const navigateTo = (item: typeof flatResults[number]) => {
    setIsOpen(false);
    setIsMobileOpen(false);
    setQuery("");

    if (item.type === "department") {
      // Link to specific department page
      const name = encodeURIComponent(item.data.department_name);
      router.push(cityHref(`/departments/${name}${fiscalYear ? `?year=${fiscalYear}` : ""}`));
    } else if (item.type === "vendor") {
      // Link to transactions filtered by vendor
      const name = encodeURIComponent(item.data.vendor);
      router.push(cityHref(`/transactions?q=${name}${fiscalYear ? `&year=${fiscalYear}` : ""}`));
    } else if (item.type === "transaction") {
      // Link to transactions filtered by vendor
      const vendorName = item.data.vendor || "";
      router.push(cityHref(`/transactions?q=${encodeURIComponent(vendorName)}${fiscalYear ? `&year=${fiscalYear}` : ""}`));
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || totalResults === 0) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setIsMobileOpen(false);
        inputRef.current?.blur();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < totalResults - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalResults - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && flatResults[activeIndex]) {
          navigateTo(flatResults[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setIsMobileOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const handleFocus = () => {
    if (query.length >= MIN_QUERY_LENGTH) {
      setIsOpen(true);
    }
  };

  const clearQuery = () => {
    setQuery("");
    setResults(null);
    inputRef.current?.focus();
  };

  // Result item component
  const ResultItem = ({
    item,
    index,
  }: {
    item: typeof flatResults[number];
    index: number;
  }) => {
    const isActive = index === activeIndex;

    let content: React.ReactNode;

    if (item.type === "department") {
      content = (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-slate-900">
              {item.data.department_name}
            </div>
            <div className="text-xs text-slate-500">
              Budget: {formatCurrency(item.data.budget_amount)}
            </div>
          </div>
          <span className="flex-shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            Dept
          </span>
        </div>
      );
    } else if (item.type === "vendor") {
      content = (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-slate-900">
              {item.data.vendor}
            </div>
            <div className="text-xs text-slate-500">
              {formatCurrency(item.data.total_amount)} · {item.data.txn_count} transactions
            </div>
          </div>
          <span className="flex-shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            Vendor
          </span>
        </div>
      );
    } else {
      content = (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-slate-900">
              {item.data.vendor || "Unknown vendor"}
            </div>
            <div className="truncate text-xs text-slate-500">
              {item.data.description?.slice(0, 60) || "No description"}
            </div>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="font-mono text-sm text-slate-900">
              {formatCurrency(item.data.amount)}
            </div>
            <div className="text-xs text-slate-500">{item.data.date}</div>
          </div>
        </div>
      );
    }

    return (
      <li
        role="option"
        aria-selected={isActive}
        id={`search-result-${index}`}
        className={`cursor-pointer px-3 py-2.5 ${
          isActive ? "bg-slate-100" : "hover:bg-slate-50"
        }`}
        onClick={() => navigateTo(item)}
        onMouseEnter={() => setActiveIndex(index)}
      >
        {content}
      </li>
    );
  };

  // Dropdown content
  const dropdownContent = (
    <div
      ref={dropdownRef}
      role="listbox"
      id="search-results"
      aria-label="Search results"
      className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[400px] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
    >
      {isLoading ? (
        <div className="flex items-center justify-center px-4 py-6 text-sm text-slate-500">
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Searching...
        </div>
      ) : totalResults === 0 && query.length >= MIN_QUERY_LENGTH ? (
        <div className="px-4 py-6 text-center text-sm text-slate-500">
          No results for &quot;{query}&quot;
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {results?.departments.length ? (
            <>
              <li className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Departments
              </li>
              {results.departments.map((dept, i) => (
                <ResultItem
                  key={`dept-${dept.department_name}`}
                  item={{ type: "department", data: dept }}
                  index={i}
                />
              ))}
            </>
          ) : null}

          {results?.vendors.length ? (
            <>
              <li className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Vendors
              </li>
              {results.vendors.map((vendor, i) => (
                <ResultItem
                  key={`vendor-${vendor.vendor}`}
                  item={{ type: "vendor", data: vendor }}
                  index={(results.departments?.length || 0) + i}
                />
              ))}
            </>
          ) : null}

          {results?.transactions.length ? (
            <>
              <li className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Transactions
              </li>
              {results.transactions.map((txn, i) => (
                <ResultItem
                  key={`txn-${txn.id}`}
                  item={{ type: "transaction", data: txn }}
                  index={
                    (results.departments?.length || 0) +
                    (results.vendors?.length || 0) +
                    i
                  }
                />
              ))}
            </>
          ) : null}
        </ul>
      )}

      {/* Screen reader announcement */}
      <div aria-live="polite" className="sr-only">
        {totalResults > 0
          ? `${totalResults} results found`
          : query.length >= MIN_QUERY_LENGTH && !isLoading
          ? "No results found"
          : ""}
      </div>
    </div>
  );

  // Mobile overlay
  if (isMobileOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 md:hidden">
        <div className="flex h-full flex-col bg-white">
          {/* Mobile header */}
          <div className="flex items-center gap-2 border-b border-slate-200 p-3">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                placeholder="Search departments, vendors..."
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-3 pl-10 pr-10 text-base text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
                aria-label="Search"
                aria-expanded={isOpen && totalResults > 0}
                aria-controls="search-results"
                aria-activedescendant={
                  activeIndex >= 0 ? `search-result-${activeIndex}` : undefined
                }
                autoFocus
              />
              {/* Search icon */}
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {/* Clear button */}
              {query && (
                <button
                  type="button"
                  onClick={clearQuery}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  aria-label="Clear search"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
              aria-label="Close search"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mobile results */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-500">
                <svg className="mr-2 h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Searching...
              </div>
            ) : totalResults === 0 && query.length >= MIN_QUERY_LENGTH ? (
              <div className="px-4 py-12 text-center text-slate-500">
                No results for &quot;{query}&quot;
              </div>
            ) : query.length < MIN_QUERY_LENGTH ? (
              <div className="px-4 py-12 text-center text-slate-500">
                Type at least 2 characters to search
              </div>
            ) : (
              <ul className="divide-y divide-slate-100" role="listbox">
                {results?.departments.map((dept, i) => (
                  <li
                    key={dept.department_name}
                    role="option"
                    aria-selected={activeIndex === i}
                    className="px-4 py-4 active:bg-slate-100"
                    onClick={() => navigateTo({ type: "department", data: dept })}
                  >
                    <div className="font-medium text-slate-900">{dept.department_name}</div>
                    <div className="text-sm text-slate-500">
                      Budget: {formatCurrency(dept.budget_amount)} · Department
                    </div>
                  </li>
                ))}
                {results?.vendors.map((vendor, i) => (
                  <li
                    key={vendor.vendor}
                    role="option"
                    aria-selected={activeIndex === (results.departments?.length || 0) + i}
                    className="px-4 py-4 active:bg-slate-100"
                    onClick={() => navigateTo({ type: "vendor", data: vendor })}
                  >
                    <div className="font-medium text-slate-900">{vendor.vendor}</div>
                    <div className="text-sm text-slate-500">
                      {formatCurrency(vendor.total_amount)} · {vendor.txn_count} transactions · Vendor
                    </div>
                  </li>
                ))}
                {results?.transactions.map((txn, i) => (
                  <li
                    key={txn.id}
                    role="option"
                    aria-selected={activeIndex === (results.departments?.length || 0) + (results.vendors?.length || 0) + i}
                    className="px-4 py-4 active:bg-slate-100"
                    onClick={() => navigateTo({ type: "transaction", data: txn })}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-slate-900">{txn.vendor || "Unknown"}</div>
                      <div className="font-mono text-slate-900">{formatCurrency(txn.amount)}</div>
                    </div>
                    <div className="text-sm text-slate-500">
                      {txn.description?.slice(0, 50) || "No description"} · {txn.date}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`global-search relative ${className}`}>
      {/* Mobile: Search icon button */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 md:hidden"
        aria-label="Open search"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      {/* Desktop: Inline search */}
      <div className="relative hidden md:block">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder="Search... (Cmd+K)"
          className="w-64 rounded-lg border border-slate-300 bg-slate-100 py-2 pl-9 pr-8 text-sm text-slate-900 placeholder-slate-400 transition-all focus:w-80 focus:border-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 lg:w-72 lg:focus:w-96"
          aria-label="Search departments, vendors, and transactions"
          aria-expanded={isOpen && totalResults > 0}
          aria-controls="search-results"
          aria-activedescendant={
            activeIndex >= 0 ? `search-result-${activeIndex}` : undefined
          }
          role="combobox"
          aria-haspopup="listbox"
        />
        {/* Search icon */}
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={clearQuery}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500"
            aria-label="Clear search"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {/* Loading indicator */}
        {isLoading && (
          <svg
            className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}

        {/* Dropdown */}
        {isOpen && query.length >= MIN_QUERY_LENGTH && dropdownContent}
      </div>
    </div>
  );
}
