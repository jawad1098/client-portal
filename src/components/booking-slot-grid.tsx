"use client";

import { useRef } from "react";
import { bookSlot } from "@/lib/actions/bookings";

type Slot = { startIso: string; endIso: string; label: string };
type Day = { dateLabel: string; key: string; slots: Slot[] };

export function BookingSlotGrid({ days }: { days: Day[] }) {
  const notesRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div>
      <div className="mb-6">
        <label className="mb-1 block text-xs font-medium text-ink" htmlFor="shared-notes">
          What&apos;s this about? (optional)
        </label>
        <textarea
          id="shared-notes"
          ref={notesRef}
          className="w-full max-w-xl rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-green"
          rows={2}
          placeholder="e.g. quick check-in on the kitchen renovation timeline"
        />
        <p className="mt-1 text-xs text-slate">This note is attached to whichever slot you click below.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {days.map((day) => (
          <div key={day.key} className="card p-4">
            <b className="font-display block">{day.dateLabel}</b>
            <div className="mt-2 flex flex-wrap gap-2">
              {day.slots.map((slot) => (
                <form
                  key={slot.startIso}
                  action={bookSlot}
                  onSubmit={(e) => {
                    const form = e.currentTarget;
                    const notesInput = form.elements.namedItem("notes") as HTMLInputElement | null;
                    if (notesInput) notesInput.value = notesRef.current?.value ?? "";
                  }}
                >
                  <input type="hidden" name="startsAt" value={slot.startIso} />
                  <input type="hidden" name="endsAt" value={slot.endIso} />
                  <input type="hidden" name="notes" defaultValue="" />
                  <button
                    type="submit"
                    className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:border-green hover:bg-green/10"
                  >
                    {slot.label}
                  </button>
                </form>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
