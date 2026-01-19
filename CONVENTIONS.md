# Coding Conventions

This document outlines coding standards for the CiviPortal codebase.

## Naming Conventions

### Boolean Variables and State

All boolean variables should use the `is`, `has`, `can`, or `should` prefix:

```typescript
// ✅ Good
const [isLoading, setIsLoading] = useState(false);
const [isOpen, setIsOpen] = useState(false);
const [hasError, setHasError] = useState(false);
const [canSubmit, setCanSubmit] = useState(true);

// ❌ Bad
const [loading, setLoading] = useState(false);
const [open, setOpen] = useState(false);
const [error, setError] = useState(false);
```

### API Response Booleans

Same convention applies to API responses:

```typescript
// ✅ Good
return { hasMoreTransactions: true, isPublished: false };

// ❌ Bad
return { moreTransactions: true, published: false };
```

### Component Props

Boolean props should also follow this pattern:

```typescript
// ✅ Good
type Props = {
  isDisabled?: boolean;
  isLoading?: boolean;
  hasHeader?: boolean;
};

// ❌ Bad
type Props = {
  disabled?: boolean;
  loading?: boolean;
  header?: boolean;
};
```

## File Organization

### Imports Order

1. React and Next.js imports
2. Third-party libraries
3. Local components
4. Local utilities/hooks
5. Types

```typescript
// 1. React/Next
import { useState, useEffect } from "react";
import Link from "next/link";

// 2. Third-party
import { PieChart, Pie } from "recharts";

// 3. Local components
import CardContainer from "../CardContainer";

// 4. Local utilities
import { formatCurrency } from "@/lib/format";
import { BUDGET_COLOR } from "@/lib/chartConfig";

// 5. Types
import type { DepartmentSummary } from "@/lib/queries";
```

### Constants Location

- **Chart colors/config**: `lib/chartConfig.ts`
- **Formatting functions**: `lib/format.ts`
- **Environment variables**: `lib/env.public.ts` or `lib/env.server.ts`
- **City/tenant config**: `lib/cityConfig.ts` or `config/cities.ts`

Do NOT define color constants or formatting functions inside component files.

## Component Structure

### File Naming

- Components: `PascalCase.tsx` (e.g., `BudgetChart.tsx`)
- Utilities: `camelCase.ts` (e.g., `formatCurrency.ts`)
- Types-only files: `types.ts`

### Component File Structure

```typescript
// 1. "use client" directive (if needed)
"use client";

// 2. Imports (see order above)

// 3. Types (component-specific)
type Props = { ... };

// 4. Constants (component-specific, not shared)
const ITEMS_PER_PAGE = 10;

// 5. Helper functions (component-specific)
function calculateTotal(items: Item[]): number { ... }

// 6. Component
export default function MyComponent({ ... }: Props) {
  // State
  // Effects
  // Handlers
  // Render
}
```

## API Routes

### Error Handling

Always return structured errors:

```typescript
// ✅ Good
return NextResponse.json({ error: "Invalid input" }, { status: 400 });

// ❌ Bad
return new Response("Invalid input", { status: 400 });
```

### Rate Limiting

All public API routes must have rate limiting:

```typescript
const { allowed, resetInSeconds } = await rateLimitAsync(key, limit, windowMs);
if (!allowed) {
  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429, headers: { "Retry-After": String(resetInSeconds) } }
  );
}
```

### Authentication

Admin routes must check auth:

```typescript
const auth = await requireAdmin(req);
if (!auth.success) return auth.error;
```

## Database Queries

### Location

All database queries should be in `lib/queries.ts` or `lib/adminProjectQueries.ts`.

### Naming

Query functions should be named `get*` or `fetch*`:

```typescript
// ✅ Good
export async function getDepartmentSummary(year: number) { ... }
export async function fetchRevenuesByCategory() { ... }

// ❌ Bad
export async function departmentSummary(year: number) { ... }
export async function revenuesByCategory() { ... }
```

## CSS/Styling

### Tailwind Classes

- Use Tailwind utility classes
- Avoid inline styles
- Use CSS custom properties (via `lib/theme.ts`) for theme colors

### Responsive Design

Mobile-first approach:

```tsx
// Base styles are mobile, then add breakpoints
<div className="px-4 md:px-6 lg:px-8">
```

## Testing

### File Location

Tests go in `__tests__/` mirroring the source structure:

```
lib/format.ts           → __tests__/lib/format.test.ts
components/Button.tsx   → __tests__/components/Button.test.tsx
```

### Test Naming

```typescript
describe("formatCurrency", () => {
  it("should format positive numbers with dollar sign", () => { ... });
  it("should handle zero", () => { ... });
  it("should format negative numbers in parentheses", () => { ... });
});
```
