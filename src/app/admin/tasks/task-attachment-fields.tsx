"use client";

import { useState } from "react";

export function TaskAttachmentFields() {
  const [rows, setRows] = useState<{ id: number; label: string; url: string }[]>([]);
  const [nextId, setNextId] = useState(0);

  function addRow() {
    setRows((prev) => [...prev, { id: nextId, label: "", url: "" }]);
    setNextId((id) => id + 1);
  }

  function removeRow(id: number) {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  function updateRow(id: number, field: "label" | "url", value: string) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <label className="mb-1 block text-xs font-medium text-ink">
        Instructions / asset links (optional)
      </label>
      {rows.map((row, index) => (
        <div key={row.id} className="flex flex-wrap items-end gap-2">
          <input
            name={`attachmentLabel_${index}`}
            placeholder="Label"
            value={row.label}
            onChange={(e) => updateRow(row.id, "label", e.target.value)}
            className="w-40 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
          />
          <input
            name={`attachmentUrl_${index}`}
            placeholder="https://..."
            type="url"
            value={row.url}
            onChange={(e) => updateRow(row.id, "url", e.target.value)}
            className="w-56 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
          />
          <button
            type="button"
            onClick={() => removeRow(row.id)}
            className="text-xs text-slate hover:text-red-600"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="self-start rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-green"
      >
        + Add attachment link
      </button>
    </div>
  );
}
