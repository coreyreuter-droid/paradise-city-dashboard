// components/City/DownloadCenterClient.tsx
"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import SectionHeader from "../SectionHeader";
import { CITY_CONFIG } from "@/lib/cityConfig";
import { downloadFile } from "@/lib/downloadFile";

const MAX_EXPORT_ROWS = 50_000;

type Props = {
  years: number[];
  departments: string[];
  vendors: string[];
  revenueSources: string[];
  enableActuals: boolean;
  enableTransactions: boolean;
  enableVendors: boolean;
  enableRevenues: boolean;
  recordCounts: {
    budgets: number;
    actuals: number;
    transactions: number;
    revenues: number;
  };
};

// Icons
const Icons = {
  budget: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  ),
  actuals: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
  ),
  transactions: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  ),
  revenues: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  ),
  download: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
};

// Multi-select dropdown component
type MultiSelectProps = {
  id: string;
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  maxDisplay?: number;
};

function MultiSelect({
  id,
  label,
  options,
  selected,
  onChange,
  placeholder = "All",
  maxDisplay = 100,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options.slice(0, maxDisplay);
    const lower = search.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(lower)).slice(0, maxDisplay);
  }, [options, search, maxDisplay]);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const clearAll = () => {
    onChange([]);
    setSearch("");
  };

  const selectAllVisible = () => {
    const newSelected = new Set(selected);
    filteredOptions.forEach((o) => newSelected.add(o));
    onChange(Array.from(newSelected));
  };

  const displayText = useMemo(() => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) return selected[0];
    if (selected.length === 2) return selected.join(", ");
    return `${selected.length} selected`;
  }, [selected, placeholder]);

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="block text-xs font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      
      <button
        type="button"
        id={id}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-slate-500 ${
          isOpen ? "border-slate-500 ring-1 ring-slate-500" : "border-slate-300"
        }`}
      >
        <span className={`truncate ${selected.length === 0 ? "text-slate-500" : "text-slate-900"}`}>
          {displayText}
        </span>
        <div className="flex items-center gap-1.5">
          {selected.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  clearAll();
                }
              }}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          )}
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          {options.length > 8 && (
            <div className="border-b border-slate-100 p-2">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to search..."
                className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          )}

          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs">
            <button type="button" onClick={selectAllVisible} className="font-medium text-blue-600 hover:text-blue-800">
              Select all{search ? " visible" : ""}
            </button>
            <span className="text-slate-300">|</span>
            <button type="button" onClick={clearAll} className="font-medium text-slate-600 hover:text-slate-900">
              Clear
            </button>
            {selected.length > 0 && (
              <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {selected.length} selected
              </span>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-500 text-center">No matches found</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selected.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleOption(option)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-left transition ${
                      isSelected ? "bg-blue-50 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition ${
                        isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </span>
                    <span className="truncate">{option}</span>
                  </button>
                );
              })
            )}
            {options.length > maxDisplay && !search && (
              <div className="px-3 py-2 text-xs text-slate-400 text-center border-t border-slate-100 mt-1">
                Showing first {maxDisplay} of {options.length}. Search to find more.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type FilterState = {
  years: string[];
  departments: string[];
  vendors: string[];
  sources: string[];
  startDate: string;
  endDate: string;
};

type DownloadCardProps = {
  config: {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
  };
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  years: number[];
  departments: string[];
  vendors: string[];
  revenueSources: string[];
  enableVendors: boolean;
  isLoading: boolean;
  onDownload: () => void;
  baseRecordCount: number;
};

function DownloadCard({
  config,
  filters,
  setFilters,
  years,
  departments,
  vendors,
  revenueSources,
  enableVendors,
  isLoading,
  onDownload,
  baseRecordCount,
}: DownloadCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [isCountLoading, setIsCountLoading] = useState(false);

  const yearStrings = useMemo(() => years.map(String), [years]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.years.length > 0 ||
      filters.departments.length > 0 ||
      filters.vendors.length > 0 ||
      filters.sources.length > 0 ||
      !!filters.startDate ||
      !!filters.endDate
    );
  }, [filters]);

  // Fetch filtered count when filters change
  useEffect(() => {
    if (!hasActiveFilters) {
      setFilteredCount(null);
      return;
    }

    const fetchCount = async () => {
      setIsCountLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("dataType", config.id);
        if (filters.years.length > 0) params.set("years", filters.years.join(","));
        if (filters.departments.length > 0) params.set("departments", filters.departments.join(","));
        if (filters.vendors.length > 0) params.set("vendors", filters.vendors.join(","));
        if (filters.sources.length > 0) params.set("sources", filters.sources.join(","));
        if (filters.startDate) params.set("startDate", filters.startDate);
        if (filters.endDate) params.set("endDate", filters.endDate);

        const response = await fetch(`/api/export/count?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setFilteredCount(data.count);
        }
      } catch (err) {
        console.error("Error fetching count:", err);
      } finally {
        setIsCountLoading(false);
      }
    };

    // Debounce the fetch
    const timeoutId = setTimeout(fetchCount, 300);
    return () => clearTimeout(timeoutId);
  }, [config.id, filters, hasActiveFilters]);

  // The actual count to display
  const displayCount = hasActiveFilters ? filteredCount : baseRecordCount;
  const isOverLimit = displayCount !== null && displayCount > MAX_EXPORT_ROWS;

  // Count active filters for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.years.length > 0) count++;
    if (filters.departments.length > 0) count++;
    if (filters.vendors.length > 0) count++;
    if (filters.sources.length > 0) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    return count;
  }, [filters]);

  const renderFilters = () => {
    switch (config.id) {
      case "budgets":
      case "actuals":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <MultiSelect
              id={`${config.id}-year`}
              label="Fiscal Year"
              options={yearStrings}
              selected={filters.years}
              onChange={(v) => setFilters((f) => ({ ...f, years: v }))}
              placeholder="All Years"
            />
            <MultiSelect
              id={`${config.id}-dept`}
              label="Department"
              options={departments}
              selected={filters.departments}
              onChange={(v) => setFilters((f) => ({ ...f, departments: v }))}
              placeholder="All Departments"
            />
          </div>
        );

      case "transactions":
        return (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MultiSelect
                id="tx-year"
                label="Fiscal Year"
                options={yearStrings}
                selected={filters.years}
                onChange={(v) => setFilters((f) => ({ ...f, years: v }))}
                placeholder="All Years"
              />
              <MultiSelect
                id="tx-dept"
                label="Department"
                options={departments}
                selected={filters.departments}
                onChange={(v) => setFilters((f) => ({ ...f, departments: v }))}
                placeholder="All Departments"
              />
              {enableVendors && (
                <MultiSelect
                  id="tx-vendor"
                  label="Vendor"
                  options={vendors}
                  selected={filters.vendors}
                  onChange={(v) => setFilters((f) => ({ ...f, vendors: v }))}
                  placeholder="All Vendors"
                  maxDisplay={150}
                />
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="tx-start" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Start Date
                </label>
                <input
                  id="tx-start"
                  type="date"
                  value={filters.startDate}
                  max={filters.endDate || undefined}
                  onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
              <div>
                <label htmlFor="tx-end" className="block text-xs font-medium text-slate-700 mb-1.5">
                  End Date
                </label>
                <input
                  id="tx-end"
                  type="date"
                  value={filters.endDate}
                  min={filters.startDate || undefined}
                  onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
            </div>
          </div>
        );

      case "revenues":
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <MultiSelect
              id="rev-year"
              label="Fiscal Year"
              options={yearStrings}
              selected={filters.years}
              onChange={(v) => setFilters((f) => ({ ...f, years: v }))}
              placeholder="All Years"
            />
            <MultiSelect
              id="rev-source"
              label="Revenue Source"
              options={revenueSources}
              selected={filters.sources}
              onChange={(v) => setFilters((f) => ({ ...f, sources: v }))}
              placeholder="All Sources"
            />
          </div>
        );

      default:
        return null;
    }
  };

  // Build selected chips
  const selectedChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];

    filters.years.forEach((y) => {
      chips.push({
        key: `year-${y}`,
        label: `FY ${y}`,
        onRemove: () => setFilters((f) => ({ ...f, years: f.years.filter((x) => x !== y) })),
      });
    });

    filters.departments.forEach((d) => {
      chips.push({
        key: `dept-${d}`,
        label: d.length > 25 ? d.slice(0, 23) + "…" : d,
        onRemove: () => setFilters((f) => ({ ...f, departments: f.departments.filter((x) => x !== d) })),
      });
    });

    filters.vendors.forEach((v) => {
      chips.push({
        key: `vendor-${v}`,
        label: v.length > 25 ? v.slice(0, 23) + "…" : v,
        onRemove: () => setFilters((f) => ({ ...f, vendors: f.vendors.filter((x) => x !== v) })),
      });
    });

    filters.sources.forEach((s) => {
      chips.push({
        key: `source-${s}`,
        label: s.length > 25 ? s.slice(0, 23) + "…" : s,
        onRemove: () => setFilters((f) => ({ ...f, sources: f.sources.filter((x) => x !== s) })),
      });
    });

    if (filters.startDate) {
      chips.push({
        key: "startDate",
        label: `From: ${filters.startDate}`,
        onRemove: () => setFilters((f) => ({ ...f, startDate: "" })),
      });
    }

    if (filters.endDate) {
      chips.push({
        key: "endDate",
        label: `To: ${filters.endDate}`,
        onRemove: () => setFilters((f) => ({ ...f, endDate: "" })),
      });
    }

    return chips;
  }, [filters, setFilters]);

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-500"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "Collapse section" : "Expand section"}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-slate-900 group-hover:text-white">
            {config.icon}
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">{config.title}</h3>
            <p className="mt-0.5 text-sm text-slate-500">{config.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeFilterCount > 0 && (
            <span className="hidden sm:inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""}
            </span>
          )}
          {displayCount !== null && (
            <span className={`hidden sm:inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              isOverLimit ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
            }`}>
              {displayCount.toLocaleString()} records
            </span>
          )}
          <svg
            className={`h-5 w-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-100 px-5 py-5">
          {/* Filters */}
          <div className="mb-5">
            {renderFilters()}
          </div>

          {/* Selected chips */}
          {selectedChips.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {selectedChips.slice(0, 10).map((chip) => (
                <span
                  key={chip.key}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 pl-3 pr-1.5 py-1 text-xs font-medium text-slate-700"
                >
                  {chip.label}
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={`Remove filter: ${chip.label}`}
                    className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              {selectedChips.length > 10 && (
                <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-500">
                  +{selectedChips.length - 10} more
                </span>
              )}
            </div>
          )}

          {/* Warning for over limit */}
          {isOverLimit && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex-shrink-0 text-amber-600">
                {Icons.warning}
              </div>
              <div className="flex-1 text-sm">
                <p className="font-medium text-amber-800">
                  Export limit exceeded
                </p>
                <p className="mt-1 text-amber-700">
                  Your selection contains {displayCount?.toLocaleString()} records, but exports are limited to {MAX_EXPORT_ROWS.toLocaleString()} records. 
                  Please add filters (e.g., select specific fiscal years or departments) to reduce the dataset.
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              {isCountLoading ? (
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-slate-600">Counting records...</span>
                </div>
              ) : displayCount !== null ? (
                <>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    isOverLimit ? "bg-amber-50" : "bg-emerald-50"
                  }`}>
                    {isOverLimit ? (
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <span>
                    <span className={`font-semibold ${isOverLimit ? "text-amber-700" : "text-slate-900"}`}>
                      {displayCount.toLocaleString()}
                    </span>
                    {" "}records {hasActiveFilters ? "match your filters" : "available"}
                    {isOverLimit && (
                      <span className="text-amber-600"> (limit: {MAX_EXPORT_ROWS.toLocaleString()})</span>
                    )}
                  </span>
                </>
              ) : (
                <span className="text-slate-600">Select filters to see record count</span>
              )}
            </div>

            <button
              type="button"
              onClick={onDownload}
              disabled={isLoading || displayCount === 0 || isOverLimit}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Preparing...</span>
                </>
              ) : (
                <>
                  {Icons.download}
                  <span>Download CSV</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DownloadCenterClient({
  years,
  departments,
  vendors,
  revenueSources,
  enableActuals,
  enableTransactions,
  enableVendors,
  enableRevenues,
  recordCounts,
}: Props) {
  const emptyFilters: FilterState = {
    years: [],
    departments: [],
    vendors: [],
    sources: [],
    startDate: "",
    endDate: "",
  };

  const [budgetFilters, setBudgetFilters] = useState<FilterState>({ ...emptyFilters });
  const [actualsFilters, setActualsFilters] = useState<FilterState>({ ...emptyFilters });
  const [transactionFilters, setTransactionFilters] = useState<FilterState>({ ...emptyFilters });
  const [revenueFilters, setRevenueFilters] = useState<FilterState>({ ...emptyFilters });

  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleDownload = useCallback(async (
    dataType: string,
    filters: FilterState
  ) => {
    setLoadingType(dataType);
    setDownloadSuccess(null);

    try {
      const params = new URLSearchParams();
      
      if (filters.years.length > 0) params.set("years", filters.years.join(","));
      if (filters.departments.length > 0) params.set("departments", filters.departments.join(","));
      if (filters.vendors.length > 0) params.set("vendors", filters.vendors.join(","));
      if (filters.sources.length > 0) params.set("sources", filters.sources.join(","));
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const response = await fetch(`/api/export/${dataType}?${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Download failed");
      }

      const blob = await response.blob();

      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `${dataType}_export.csv`;

      downloadFile(blob, filename);

      setDownloadSuccess(dataType);
      setTimeout(() => setDownloadSuccess(null), 3000);
    } catch (error) {
      console.error("Download error:", error);
      alert(error instanceof Error ? error.message : "Download failed. Please try again.");
    } finally {
      setLoadingType(null);
    }
  }, []);

  const accentColor =
    CITY_CONFIG.accentColor || CITY_CONFIG.primaryColor || undefined;

  const dataTypes = useMemo(() => {
    const types: Array<{
      id: string;
      title: string;
      description: string;
      icon: React.ReactNode;
      enabled: boolean;
      filters: FilterState;
      setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
      baseRecordCount: number;
    }> = [
      {
        id: "budgets",
        title: "Budget Data",
        description: "Adopted budget amounts by department, fund, and account",
        icon: Icons.budget,
        enabled: true,
        filters: budgetFilters,
        setFilters: setBudgetFilters,
        baseRecordCount: recordCounts.budgets,
      },
      {
        id: "actuals",
        title: "Actuals Data",
        description: "Actual expenditures recorded against budget line items",
        icon: Icons.actuals,
        enabled: enableActuals,
        filters: actualsFilters,
        setFilters: setActualsFilters,
        baseRecordCount: recordCounts.actuals,
      },
      {
        id: "transactions",
        title: "Transaction Records",
        description: enableVendors
          ? "Individual payment transactions with vendor, date, and amount details"
          : "Individual payment transactions with date and amount details",
        icon: Icons.transactions,
        enabled: enableTransactions,
        filters: transactionFilters,
        setFilters: setTransactionFilters,
        baseRecordCount: recordCounts.transactions,
      },
      {
        id: "revenues",
        title: "Revenue Data",
        description: "Revenue collections by source, category, and period",
        icon: Icons.revenues,
        enabled: enableRevenues,
        filters: revenueFilters,
        setFilters: setRevenueFilters,
        baseRecordCount: recordCounts.revenues,
      },
    ];

    return types.filter((t) => t.enabled);
  }, [
    enableActuals,
    enableTransactions,
    enableVendors,
    enableRevenues,
    budgetFilters,
    actualsFilters,
    transactionFilters,
    revenueFilters,
    recordCounts,
  ]);

  return (
    <div
      id="main-content"
      className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8"
    >
      {/* Header */}
      <SectionHeader
        eyebrow="Data Access"
        title="Download Center"
        description="Export financial data for reporting, analysis, or compliance. Select your filters and download as CSV."
        accentColor={accentColor}
      />

      {/* Intro Card */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
            {Icons.download}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">
              Export Data Your Way
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Choose from the available data types below. Use multi-select filters to combine 
              multiple fiscal years, departments, vendors, or date ranges. Downloads are limited to {MAX_EXPORT_ROWS.toLocaleString()} records per export — use filters to narrow large datasets.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {dataTypes.map((dt) => (
                <span
                  key={dt.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    dt.baseRecordCount > MAX_EXPORT_ROWS ? "bg-amber-500" : "bg-emerald-500"
                  }`} />
                  {dt.title}
                  <span className="text-slate-400">({dt.baseRecordCount.toLocaleString()})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {downloadSuccess && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex items-center gap-3 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-lg">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Download started successfully
          </div>
        </div>
      )}

      {/* Data Type Cards */}
      <div className="space-y-4">
        {dataTypes.map((dt) => (
          <DownloadCard
            key={dt.id}
            config={{
              id: dt.id,
              title: dt.title,
              description: dt.description,
              icon: dt.icon,
            }}
            filters={dt.filters}
            setFilters={dt.setFilters}
            years={years}
            departments={departments}
            vendors={vendors}
            revenueSources={revenueSources}
            enableVendors={enableVendors}
            isLoading={loadingType === dt.id}
            onDownload={() => handleDownload(dt.id, dt.filters)}
            baseRecordCount={dt.baseRecordCount}
          />
        ))}
      </div>

      {/* Footer Note */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex gap-3">
          <svg className="h-5 w-5 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <p className="text-sm text-slate-600">
            Downloads are limited to {MAX_EXPORT_ROWS.toLocaleString()} records per export. 
            For larger datasets, use the filters above to narrow by fiscal year, department, or date range.
          </p>
        </div>
      </div>
    </div>
  );
}
