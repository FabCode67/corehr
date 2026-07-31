import * as XLSX from "xlsx"

import type { ImportTemplateColumn } from "./registry/types"

export const MAX_IMPORT_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

export const ALLOWED_IMPORT_MIME_TYPES = new Set([
  "text/csv",
  "application/vnd.ms-excel", // some browsers send this for .csv
  "application/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
])

export class SpreadsheetParseError extends Error {}

/**
 * Reads a CSV or XLSX buffer into a plain header row + row objects, using
 * the header row's own text as object keys (so column order in the
 * uploaded file doesn't matter, only column names — "maps columns
 * automatically" per the spec). Blank/empty files throw
 * SpreadsheetParseError so the controller can turn that into a clean
 * validation error instead of an empty-but-"successful" import.
 */
export function parseSpreadsheet(buffer: Buffer, fileName: string): { headers: string[]; rows: Record<string, string>[] } {
  const isCsv = fileName.toLowerCase().endsWith(".csv")

  const workbook = isCsv
    ? XLSX.read(buffer.toString("utf-8"), { type: "string", raw: false, cellDates: true })
    : XLSX.read(buffer, { type: "buffer", raw: false, cellDates: true })

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new SpreadsheetParseError("The file has no sheets/data.")
  }
  const sheet = workbook.Sheets[sheetName]

  // XLSX is ambiently typed as `any` here (see src/types/xlsx.d.ts), so an
  // untyped call can't take an explicit <string[]> type argument — cast the
  // result instead.
  const asArrays = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false }) as string[][]
  if (asArrays.length === 0) {
    throw new SpreadsheetParseError("The file is empty.")
  }

  const headers = (asArrays[0] ?? []).map((header: unknown) => String(header ?? "").trim()).filter((header: string) => header.length > 0)
  if (headers.length === 0) {
    throw new SpreadsheetParseError("The file has no header row.")
  }

  const dataRows = asArrays.slice(1).filter((line: unknown[]) => line.some((cell: unknown) => String(cell ?? "").trim().length > 0))
  if (dataRows.length === 0) {
    throw new SpreadsheetParseError("The file has a header row but no data rows.")
  }

  const rows = dataRows.map((line: unknown[]) => {
    const record: Record<string, string> = {}
    headers.forEach((header: string, index: number) => {
      record[header] = line[index] !== undefined && line[index] !== null ? String(line[index]).trim() : ""
    })
    return record
  })

  return { headers, rows }
}

/**
 * Builds a downloadable .xlsx template for a module: a header row (exactly
 * the ImportTemplateColumn.header values, required columns marked with
 * " *") plus one example row so users can see the expected format.
 */
export function buildTemplateWorkbook(columns: ImportTemplateColumn[]): Buffer {
  const headerRow = columns.map((column) => (column.required ? `${column.header} *` : column.header))
  const exampleRow = columns.map((column) => column.example)
  const sheet = XLSX.utils.aoa_to_sheet([headerRow, exampleRow])
  sheet["!cols"] = columns.map((column) => ({ wch: Math.max(column.header.length + 2, column.example.length + 2, 14) }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, "Template")
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer
}

/** Builds a downloadable .csv (Row Number, Employee Number, Module, Error
 *  Description) — the Error Report format the spec calls out explicitly. */
export function buildCsv(headers: string[], rows: (string | number)[][]): Buffer {
  const escape = (value: string | number) => {
    const text = String(value ?? "")
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const lines = [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))]
  return Buffer.from(lines.join("\n"), "utf-8")
}
