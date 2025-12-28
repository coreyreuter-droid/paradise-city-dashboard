// lib/theme.ts
// Theme utilities for brand color management

/**
 * Default brand colors (fallbacks)
 */
export const DEFAULT_COLORS = {
  primary: "#0F172A",    // Dark slate - headers, primary buttons
  accent: "#0f766e",     // Teal - interactions, highlights
  surface: "#020617",    // Near-black - sidebar, hero backgrounds
} as const;

/**
 * Convert hex color to RGB string for CSS variables
 * Supports both #RRGGBB and #RGB shorthand formats
 */
export function hexToRgb(hex: string): string | null {
  if (!hex) return null;
  
  // Remove # if present
  let cleanHex = hex.replace(/^#/, "");
  
  // Expand shorthand (#RGB → #RRGGBB)
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  
  // Validate format
  if (!/^[a-fA-F0-9]{6}$/.test(cleanHex)) {
    return null;
  }
  
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  
  return `${r} ${g} ${b}`;
}

/**
 * Calculate relative luminance of a color (0-1)
 * Used for contrast calculations per WCAG 2.1
 */
export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const [r, g, b] = rgb.split(" ").map(Number);
  
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * Returns ratio like 4.5, 7.0, etc.
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a color is "dark enough" for white text (AA standard)
 * Returns true if white text would pass 4.5:1 contrast
 */
export function isDarkEnoughForWhiteText(hex: string): boolean {
  return getContrastRatio(hex, "#FFFFFF") >= 4.5;
}

/**
 * Check if a color is "dark enough" for large white text (AA standard)
 * Returns true if white text would pass 3:1 contrast (large text/UI components)
 */
export function isDarkEnoughForWhiteTextLarge(hex: string): boolean {
  return getContrastRatio(hex, "#FFFFFF") >= 3;
}

/**
 * Check if a color meets minimum contrast for UI components against white
 * WCAG requires 3:1 for UI components and graphical objects
 */
export function meetsUIContrastOnWhite(hex: string): boolean {
  return getContrastRatio(hex, "#FFFFFF") >= 3;
}

/**
 * Validation result for brand colors
 */
export type ColorValidationResult = {
  isValid: boolean;
  warnings: string[];
  correctedColors: {
    primary: string;
    accent: string;
    surface: string;
  };
};

/**
 * Validate brand colors and return warnings + corrected values
 */
export function validateBrandColors(
  primary: string | null,
  accent: string | null,
  surface: string | null
): ColorValidationResult {
  const warnings: string[] = [];
  
  // Use defaults if null/empty
  let correctedPrimary = primary?.trim() || DEFAULT_COLORS.primary;
  let correctedAccent = accent?.trim() || DEFAULT_COLORS.accent;
  let correctedSurface = surface?.trim() || DEFAULT_COLORS.surface;
  
  // Validate hex format
  if (!hexToRgb(correctedPrimary)) {
    warnings.push("Primary color is not a valid hex color. Using default.");
    correctedPrimary = DEFAULT_COLORS.primary;
  }
  
  if (!hexToRgb(correctedAccent)) {
    warnings.push("Accent color is not a valid hex color. Using default.");
    correctedAccent = DEFAULT_COLORS.accent;
  }
  
  if (!hexToRgb(correctedSurface)) {
    warnings.push("Background color is not a valid hex color. Using default.");
    correctedSurface = DEFAULT_COLORS.surface;
  }
  
  // Check primary color contrast (used for button backgrounds with white text)
  if (!isDarkEnoughForWhiteText(correctedPrimary)) {
    warnings.push(
      "Primary color may be too light for white button text. Consider using a darker shade for better readability."
    );
    // Don't auto-correct, just warn - let admin decide
  }
  
  // Check accent color contrast for UI components
  if (!meetsUIContrastOnWhite(correctedAccent)) {
    warnings.push(
      "Accent color may not have enough contrast against white backgrounds. Consider a darker or more saturated shade."
    );
  }
  
  // Check surface/background color - must be dark for white text
  const surfaceLuminance = getLuminance(correctedSurface);
  if (surfaceLuminance > 0.3) {
    warnings.push(
      "Background color should be dark (for white text readability). Using default dark background."
    );
    correctedSurface = DEFAULT_COLORS.surface;
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
    correctedColors: {
      primary: correctedPrimary,
      accent: correctedAccent,
      surface: correctedSurface,
    },
  };
}

/**
 * Generate CSS custom properties object for brand colors
 * Use these values in a style prop on the root element
 */
export function generateThemeVars(
  primary: string | null,
  accent: string | null,
  surface: string | null
): Record<string, string> {
  const { correctedColors } = validateBrandColors(primary, accent, surface);
  
  return {
    "--primary-rgb": hexToRgb(correctedColors.primary) || "15 23 42",
    "--accent-rgb": hexToRgb(correctedColors.accent) || "15 118 110",
    "--surface-rgb": hexToRgb(correctedColors.surface) || "2 6 23",
  };
}

// ============================================================================
// Tailwind-compatible class string helpers
// Use these to avoid duplicating arbitrary value syntax everywhere
// ============================================================================

export const theme = {
  // Backgrounds
  bgPrimary: "bg-[rgb(var(--primary-rgb))]",
  bgAccent: "bg-[rgb(var(--accent-rgb))]",
  bgSurface: "bg-[rgb(var(--surface-rgb))]",
  
  // Background with opacity
  bgAccent10: "bg-[rgb(var(--accent-rgb)/0.10)]",
  bgAccent15: "bg-[rgb(var(--accent-rgb)/0.15)]",
  bgAccent20: "bg-[rgb(var(--accent-rgb)/0.20)]",
  bgPrimary10: "bg-[rgb(var(--primary-rgb)/0.10)]",
  
  // Text colors
  textPrimary: "text-[rgb(var(--primary-rgb))]",
  textAccent: "text-[rgb(var(--accent-rgb))]",
  
  // Borders
  borderPrimary: "border-[rgb(var(--primary-rgb))]",
  borderAccent: "border-[rgb(var(--accent-rgb))]",
  borderAccent50: "border-[rgb(var(--accent-rgb)/0.50)]",
  
  // Focus rings
  ringAccent: "ring-[rgb(var(--accent-rgb))]",
  ringPrimary: "ring-[rgb(var(--primary-rgb))]",
  
  // Hover states
  hoverBgAccent10: "hover:bg-[rgb(var(--accent-rgb)/0.10)]",
  hoverBgAccent15: "hover:bg-[rgb(var(--accent-rgb)/0.15)]",
  hoverBgWhite10: "hover:bg-white/10",
  hoverTextAccent: "hover:text-[rgb(var(--accent-rgb))]",
  
  // Focus states  
  focusBorderAccent: "focus:border-[rgb(var(--accent-rgb))]",
  focusRingAccent: "focus:ring-[rgb(var(--accent-rgb))]",
  focusVisibleRingAccent: "focus-visible:ring-[rgb(var(--accent-rgb))]",
} as const;

// ============================================================================
// Composite class strings for common patterns
// ============================================================================

export const themeClasses = {
  // Primary button: dark bg, white text
  btnPrimary: `${theme.bgPrimary} text-white hover:opacity-90 ${theme.focusVisibleRingAccent} focus-visible:ring-2 focus-visible:ring-offset-2`,
  
  // Secondary button: transparent bg, primary text, accent border
  btnSecondary: `bg-transparent ${theme.textPrimary} ${theme.borderAccent} border ${theme.hoverBgAccent10} ${theme.focusVisibleRingAccent} focus-visible:ring-2 focus-visible:ring-offset-2`,
  
  // Ghost button: minimal styling
  btnGhost: `bg-transparent text-slate-600 hover:text-slate-900 ${theme.hoverTextAccent}`,
  
  // Active nav item (for sidebar)
  navItemActive: `${theme.bgAccent15} border-l-3 ${theme.borderAccent} font-semibold`,
  
  // Active tab
  tabActive: `${theme.bgAccent10} border-b-2 ${theme.borderAccent} font-semibold`,
  
  // Focus ring for inputs
  inputFocus: `${theme.focusBorderAccent} focus:outline-none focus:ring-1 ${theme.focusRingAccent}`,
} as const;
