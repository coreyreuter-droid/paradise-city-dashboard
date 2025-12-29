import {
  sanitizeSearchInput,
  formatCurrency,
  formatPercent,
  formatDate,
  formatNumber,
  formatCurrencyCompact,
} from "@/lib/format";

describe("sanitizeSearchInput", () => {
  it("returns empty string for null/undefined input", () => {
    expect(sanitizeSearchInput(null as unknown as string)).toBe("");
    expect(sanitizeSearchInput(undefined as unknown as string)).toBe("");
    expect(sanitizeSearchInput("")).toBe("");
  });

  it("escapes percent signs", () => {
    expect(sanitizeSearchInput("100%")).toBe("100\\%");
    expect(sanitizeSearchInput("%test%")).toBe("\\%test\\%");
  });

  it("escapes underscores", () => {
    expect(sanitizeSearchInput("test_value")).toBe("test\\_value");
    expect(sanitizeSearchInput("_start")).toBe("\\_start");
  });

  it("escapes backslashes", () => {
    expect(sanitizeSearchInput("path\\to\\file")).toBe("path\\\\to\\\\file");
  });

  it("handles combined special characters", () => {
    expect(sanitizeSearchInput("100%_test\\value")).toBe("100\\%\\_test\\\\value");
  });

  it("trims whitespace", () => {
    expect(sanitizeSearchInput("  hello  ")).toBe("hello");
  });

  it("limits length to maxLength", () => {
    const longString = "a".repeat(200);
    expect(sanitizeSearchInput(longString)).toHaveLength(100);
    expect(sanitizeSearchInput(longString, 50)).toHaveLength(50);
  });

  it("leaves normal text unchanged", () => {
    expect(sanitizeSearchInput("Normal Search Term")).toBe("Normal Search Term");
    expect(sanitizeSearchInput("Vendor Inc")).toBe("Vendor Inc");
  });
});

describe("formatCurrency", () => {
  it("formats positive numbers", () => {
    expect(formatCurrency(1000)).toBe("$1,000");
    expect(formatCurrency(1234567)).toBe("$1,234,567");
  });

  it("formats negative numbers", () => {
    expect(formatCurrency(-500)).toBe("-$500");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  it("handles null/undefined", () => {
    expect(formatCurrency(null)).toBe("$0");
    expect(formatCurrency(undefined)).toBe("$0");
  });

  it("handles non-finite numbers", () => {
    expect(formatCurrency(NaN)).toBe("$0");
    expect(formatCurrency(Infinity)).toBe("$0");
  });
});

describe("formatPercent", () => {
  it("formats percentages with default precision", () => {
    expect(formatPercent(50)).toBe("50.0%");
    expect(formatPercent(33.333)).toBe("33.3%");
  });

  it("handles custom fraction digits", () => {
    expect(formatPercent(33.3333, 2)).toBe("33.33%");
    expect(formatPercent(100, 0)).toBe("100%");
  });

  it("handles zero", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("handles null/undefined", () => {
    expect(formatPercent(null)).toBe("0.0%");
    expect(formatPercent(undefined)).toBe("0.0%");
  });

  it("avoids -0.0%", () => {
    expect(formatPercent(-0.0001)).toBe("0.0%");
  });
});

describe("formatDate", () => {
  it("formats date strings", () => {
    const result = formatDate("2024-07-15");
    expect(result).toMatch(/Jul/);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2024/);
  });

  it("formats Date objects", () => {
    const date = new Date("2024-12-25T00:00:00Z");
    const result = formatDate(date);
    expect(result).toMatch(/Dec/);
    expect(result).toMatch(/25/);
    expect(result).toMatch(/2024/);
  });

  it("returns empty string for invalid dates", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate("not-a-date")).toBe("");
  });
});

describe("formatNumber", () => {
  it("formats numbers with locale separators", () => {
    expect(formatNumber(1000)).toBe("1,000");
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("handles string input", () => {
    expect(formatNumber("1,234")).toBe("1,234");
    expect(formatNumber("5000")).toBe("5,000");
  });

  it("handles null/undefined", () => {
    expect(formatNumber(null)).toBe("");
    expect(formatNumber(undefined)).toBe("");
  });

  it("respects fraction digit options", () => {
    expect(formatNumber(1234.567, { maximumFractionDigits: 2 })).toBe("1,234.57");
  });
});

describe("formatCurrencyCompact", () => {
  it("formats billions", () => {
    expect(formatCurrencyCompact(1_500_000_000)).toBe("$1.5B");
    expect(formatCurrencyCompact(2_000_000_000)).toBe("$2B");
  });

  it("formats millions", () => {
    expect(formatCurrencyCompact(1_500_000)).toBe("$1.5M");
    expect(formatCurrencyCompact(10_000_000)).toBe("$10M");
  });

  it("formats thousands", () => {
    expect(formatCurrencyCompact(1_500)).toBe("$1.5K");
    expect(formatCurrencyCompact(50_000)).toBe("$50K");
  });

  it("formats small numbers without suffix", () => {
    expect(formatCurrencyCompact(500)).toBe("$500");
    expect(formatCurrencyCompact(999)).toBe("$999");
  });

  it("handles negative numbers", () => {
    expect(formatCurrencyCompact(-1_500_000)).toBe("-$1.5M");
  });

  it("handles null/undefined", () => {
    expect(formatCurrencyCompact(null)).toBe("$0");
    expect(formatCurrencyCompact(undefined)).toBe("$0");
  });
});
