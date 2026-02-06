// src/util/csv.ts
//
// CSV Parser — shared utility for all GENESIS modules that ingest CSV data.
//
// Handles:
//   - Quoted fields (double-quote delimited)
//   - Escaped quotes ("" inside quoted fields)
//   - Mixed line endings (CRLF, LF)
//   - Header normalization (trim whitespace)
//   - Empty rows (skipped)
//
// No external dependencies. Operates on string input, returns plain objects.
//
// Copyright (c) 2025 MuzzL3d Dictionary Contributors — Apache-2.0

// ---------------------------------------------------------------------------
// Core parser
// ---------------------------------------------------------------------------

/**
 * Parse a CSV string into an array of header-keyed records.
 *
 * The first line is treated as headers. Subsequent lines become records
 * where each key is a trimmed header name and each value is a trimmed cell.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue; // skip blank rows

    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j].trim()] = (values[j] || "").trim();
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line into an array of field values.
 * Handles quoted fields and escaped double-quotes.
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ---------------------------------------------------------------------------
// Field extraction helpers
// ---------------------------------------------------------------------------

/**
 * Extract a field from a record, trying multiple key aliases.
 * Returns the first non-empty match, or the fallback.
 */
export function extractField(
  record: Record<string, string>,
  aliases: string[],
  fallback: string = "",
): string {
  for (const alias of aliases) {
    const value = record[alias];
    if (value !== undefined && value !== "") return value;
  }
  return fallback;
}

/**
 * Extract all fields from a record EXCEPT those in the reserved set.
 * Useful for collecting "extra" fields into a generic map.
 */
export function extractRemainder(
  record: Record<string, string>,
  reserved: Set<string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(record)) {
    if (!reserved.has(k)) result[k] = v;
  }
  return result;
}
