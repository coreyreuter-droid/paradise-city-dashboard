// lib/csvParser.ts
//
// Proper CSV parser that handles:
// - Quoted fields with commas: "Smith, John"
// - Escaped quotes: "He said ""hello"""
// - Empty fields
// - Mixed quoted/unquoted fields

/**
 * Parse a single CSV line into fields, respecting quoted values.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ("")
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        // End of quoted field
        inQuotes = false;
        i++;
        continue;
      }
      current += char;
      i++;
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
        i++;
        continue;
      }
      if (char === ",") {
        // End of field
        fields.push(current.trim());
        current = "";
        i++;
        continue;
      }
      current += char;
      i++;
    }
  }

  // Don't forget the last field
  fields.push(current.trim());

  return fields;
}

/**
 * Parse CSV text into a 2D array of strings.
 * Handles quoted fields, escaped quotes, and various line endings.
 * 
 * @param text - Raw CSV text
 * @returns Array of rows, where each row is an array of field values
 */
export function parseCsv(text: string): string[][] {
  if (!text || !text.trim()) {
    return [];
  }

  // Normalize line endings (handle \r\n, \r, \n)
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Handle quoted fields that contain newlines
  const rows: string[][] = [];
  let currentLine = "";
  let inQuotes = false;

  const lines = normalized.split("\n");

  for (const line of lines) {
    // Count quotes to determine if we're inside a quoted field
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      }
    }

    if (currentLine) {
      currentLine += "\n" + line;
    } else {
      currentLine = line;
    }

    // If we're not inside quotes, this line is complete
    if (!inQuotes) {
      if (currentLine.trim()) {
        rows.push(parseCsvLine(currentLine));
      }
      currentLine = "";
    }
  }

  // Handle any remaining content (unterminated quote - best effort)
  if (currentLine.trim()) {
    rows.push(parseCsvLine(currentLine));
  }

  return rows;
}

/**
 * Parse CSV and return headers + data rows separately.
 * Convenience function for the common case.
 * 
 * @param text - Raw CSV text
 * @returns Object with headers array and data rows array
 */
export function parseCsvWithHeaders(text: string): {
  headers: string[];
  rows: string[][];
} {
  const allRows = parseCsv(text);

  if (allRows.length === 0) {
    return { headers: [], rows: [] };
  }

  return {
    headers: allRows[0],
    rows: allRows.slice(1),
  };
}
