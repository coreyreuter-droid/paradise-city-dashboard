"use client";

import React from "react";

/* =============================================================================
   Category definitions — broad keyword matching
============================================================================= */

type IconCategory = {
  id: string;
  keywords: string[];
  color: string;
  /** SVG path(s) for a 24x24 viewBox, thin stroke style */
  path: string;
};

const CATEGORIES: IconCategory[] = [
  {
    id: "public-safety",
    keywords: [
      "police", "law enforcement", "sheriff", "patrol", "public safety",
      "constable", "marshal", "security", "protective", "law force",
      "criminal", "dispatch", "corrections", "detention", "jail",
    ],
    color: "#1d4ed8",
    path: "M12 2l7 4v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-4z",
  },
  {
    id: "fire",
    keywords: [
      "fire", "rescue", "ems", "emergency", "paramedic", "ambulance",
      "hazmat", "fire rescue", "suppression",
    ],
    color: "#dc2626",
    path: "M12 2c.5 4-3 6-3 10 0 3 2 5 3 5s3-2 3-5c0-2-1-3-1-3s2 1.5 2 5c0 3.5-2.5 6-5 7-2.5-1-5-3.5-5-7 0-4 3.5-6 3-10z",
  },
  {
    id: "public-works",
    keywords: [
      "public works", "infrastructure", "engineering", "streets",
      "roads", "highway", "stormwater", "drainage", "sewer",
      "maintenance", "facilities", "fleet", "solid waste", "sanitation",
      "trash", "refuse", "recycling", "waste",
    ],
    color: "#b45309",
    path: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  },
  {
    id: "parks",
    keywords: [
      "parks", "recreation", "leisure", "greenspace", "open space",
      "trails", "forestry", "cemetery", "pool", "aquatic", "sports",
      "athletic", "golf", "zoo", "botanical", "garden",
    ],
    color: "#15803d",
    path: "M12 2L7 9h3l-3 7h10l-3-7h3L12 2zM12 22v-6",
  },
  {
    id: "admin",
    keywords: [
      "administration", "general government", "city manager", "mayor",
      "council", "clerk", "city hall", "executive", "management",
      "legislative", "board", "commission", "governance",
    ],
    color: "#475569",
    path: "M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1",
  },
  {
    id: "finance",
    keywords: [
      "finance", "budget", "accounting", "fiscal", "treasury",
      "audit", "tax", "revenue", "procurement", "purchasing",
      "assessor", "collector",
    ],
    color: "#0f766e",
    path: "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  },
  {
    id: "community-dev",
    keywords: [
      "community development", "planning", "zoning", "building",
      "code enforcement", "permits", "inspection", "housing",
      "economic development", "redevelopment", "neighborhood",
    ],
    color: "#7c3aed",
    path: "M3 12l9-9 9 9M5 10v10h14V10",
  },
  {
    id: "water",
    keywords: [
      "water", "utility", "utilities", "electric", "power", "energy",
      "gas", "wastewater", "treatment", "distribution",
    ],
    color: "#0369a1",
    path: "M12 2.69l5.66 5.66a8 8 0 11-11.31 0L12 2.69z",
  },
  {
    id: "library",
    keywords: [
      "library", "libraries", "literacy", "media",
    ],
    color: "#a16207",
    path: "M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z",
  },
  {
    id: "health",
    keywords: [
      "health", "human services", "social services", "welfare",
      "mental health", "aging", "senior", "veteran", "disability",
      "behavioral", "substance", "clinic",
    ],
    color: "#be123c",
    path: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z",
  },
  {
    id: "transportation",
    keywords: [
      "transportation", "transit", "traffic", "parking", "airport",
      "port", "harbor", "marina", "ferry", "bus", "rail",
    ],
    color: "#4338ca",
    path: "M5 18h14M5 18a2 2 0 01-2-2V8a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2M15 3v3M9 3v3",
  },
  {
    id: "it",
    keywords: [
      "information technology", "technology", "it ", "i.t.", "data",
      "digital", "cyber", "network", "telecom", "communications",
      "gis", "innovation",
    ],
    color: "#6d28d9",
    path: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
  {
    id: "legal",
    keywords: [
      "legal", "attorney", "counsel", "law department", "prosecution",
      "court", "judicial", "judge", "public defender",
    ],
    color: "#64748b",
    path: "M12 2L2 7h20L12 2zM4 7v10M20 7v10M2 17h20M8 7v10M12 7v10M16 7v10",
  },
  {
    id: "hr",
    keywords: [
      "human resources", "personnel", "employee", "workforce",
      "labor", "staffing", "benefits", "risk management", "insurance",
    ],
    color: "#0891b2",
    path: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  },
];

/* =============================================================================
   Matching logic
============================================================================= */

function matchCategory(departmentName: string): IconCategory | null {
  const lower = departmentName.toLowerCase();

  for (const cat of CATEGORIES) {
    for (const keyword of cat.keywords) {
      if (lower.includes(keyword)) {
        return cat;
      }
    }
  }

  return null;
}

function getInitials(name: string): string {
  return name
    .split(/[\s&\/\-]+/)
    .filter((w) => w.length > 0)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* =============================================================================
   Component
============================================================================= */

type Props = {
  name: string;
  size?: "sm" | "md" | "lg";
  /** Override accent color for the initial fallback */
  accentColor?: string;
};

const SIZES = {
  sm: { outer: "h-7 w-7", icon: "h-3.5 w-3.5", text: "text-[10px]" },
  md: { outer: "h-9 w-9", icon: "h-4 w-4", text: "text-xs" },
  lg: { outer: "h-11 w-11", icon: "h-5 w-5", text: "text-sm" },
};

export default function DepartmentIcon({ name, size = "md", accentColor }: Props) {
  const category = matchCategory(name);
  const s = SIZES[size];

  if (category) {
    return (
      <div
        className={`flex ${s.outer} flex-shrink-0 items-center justify-center rounded-lg`}
        style={{ backgroundColor: category.color + "12", color: category.color }}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={s.icon}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={category.path} />
        </svg>
      </div>
    );
  }

  // Fallback: styled initials
  const initials = getInitials(name);
  const fallbackColor = accentColor || "#64748b";

  return (
    <div
      className={`flex ${s.outer} flex-shrink-0 items-center justify-center rounded-lg font-semibold`}
      style={{ backgroundColor: fallbackColor + "12", color: fallbackColor }}
      aria-hidden="true"
    >
      <span className={s.text}>{initials}</span>
    </div>
  );
}

/** Utility: get the matched color for a department (for chart colors, etc.) */
export function getDepartmentColor(name: string, fallback: string = "#64748b"): string {
  const cat = matchCategory(name);
  return cat ? cat.color : fallback;
}
