"use client";

import { useState, useTransition, useRef } from "react";
import { updateTaskField } from "@/lib/actions/tasks";

export function InlineTaskTitle({ taskId, title }: { taskId: string; title: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [saved, setSaved] = useState(title);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function save() {
    if (!value.trim() || value.trim() === saved) {
      setValue(saved);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      try {
        await updateTaskField(taskId, "title", value.trim());
        setSaved(value.trim());
      } catch {
        setValue(saved);
      }
      setEditing(false);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save();
    if (e.key === "Escape") {
      setValue(saved);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        disabled={isPending}
        autoFocus
        className="w-full rounded border border-green px-1 py-0.5 text-sm font-medium text-ink outline-none"
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      className="text-left font-medium text-ink hover:text-green-dark"
      title="Click to edit title"
    >
      {saved}
    </button>
  );
}
