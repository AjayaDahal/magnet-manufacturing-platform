"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import type { CsvBulkRow } from "@/types";

interface CsvUploaderProps {
  onParsed: (rows: CsvBulkRow[]) => void;
  onFileReady: (file: File) => void;
}

const VALID_SIZES = ["2x3", "3x4", "4x6", "5x7", "8x10"];

export function CsvUploader({ onParsed, onFileReady }: CsvUploaderProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<CsvBulkRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    onFileReady(file);

    Papa.parse<CsvBulkRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validationErrors: string[] = [];
        const validRows: CsvBulkRow[] = [];

        results.data.forEach((row, i) => {
          const lineNum = i + 2; // header is line 1
          if (!row.name?.trim()) validationErrors.push(`Line ${lineNum}: Missing name`);
          const qty = parseInt(row.quantity, 10);
          if (isNaN(qty) || qty < 1) validationErrors.push(`Line ${lineNum}: Invalid quantity "${row.quantity}"`);
          if (!row.size || !VALID_SIZES.includes(row.size.trim()))
            validationErrors.push(`Line ${lineNum}: Invalid size "${row.size}". Use: ${VALID_SIZES.join(", ")}`);
          validRows.push(row);
        });

        setRows(validRows);
        setErrors(validationErrors);
        onParsed(validRows);
      },
    });
  }

  return (
    <div className="space-y-4">
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-brand-400 transition"
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <svg className="mx-auto w-8 h-8 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm text-slate-600">{fileName ? fileName : "Click to upload CSV file"}</p>
        <p className="text-xs text-slate-400 mt-1">Columns: name, photo_url, quantity, size</p>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm font-medium text-red-800 mb-1">Validation Issues ({errors.length})</p>
          <ul className="text-xs text-red-600 space-y-0.5 max-h-32 overflow-auto">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">{rows.length} rows parsed</p>
          <div className="border rounded-lg overflow-auto max-h-64">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Photo URL</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-left">Size</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-1.5">{row.name}</td>
                    <td className="px-3 py-1.5 truncate max-w-[200px]">{row.photo_url || "—"}</td>
                    <td className="px-3 py-1.5 text-right">{row.quantity}</td>
                    <td className="px-3 py-1.5">{row.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 20 && (
              <p className="text-xs text-slate-400 p-2 text-center">...and {rows.length - 20} more rows</p>
            )}
          </div>
        </div>
      )}

      {/* Download template */}
      <button
        onClick={() => {
          const csv = "name,photo_url,quantity,size\nJohn Doe,https://example.com/photo.jpg,10,4x6\nJane Smith,,25,3x4\n";
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "bulk-order-template.csv";
          a.click();
          URL.revokeObjectURL(url);
        }}
        className="text-xs text-brand-600 hover:underline"
      >
        ↓ Download CSV template
      </button>
    </div>
  );
}
