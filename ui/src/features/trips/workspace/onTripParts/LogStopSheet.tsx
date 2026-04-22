import { useMemo, useState } from "react";

export type LogStopPayload = {
  day_date: string;
  title: string;
  time: string | null;
  location: string | null;
  notes: string | null;
};

function localTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
}

export function LogStopSheet({
  open,
  disabled,
  defaultDate,
  onClose,
  onSubmit,
}: {
  open: boolean;
  disabled: boolean;
  defaultDate: string;
  onClose: () => void;
  onSubmit: (payload: LogStopPayload) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState(() => localTimeHHMM());
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const canSubmit = useMemo(() => title.trim().length > 0 && !disabled, [title, disabled]);

  if (!open) return null;

  const handleClose = () => {
    setTitle("");
    setTime("");
    setLocation("");
    setNotes("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        aria-label="Close log stop dialog"
        onClick={handleClose}
      />

      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[520px]">
        <div
          className="rounded-t-3xl border border-[#EDE7DD] bg-[#FEFCF9] px-5 pb-5 pt-3 shadow-[0_-30px_80px_rgba(0,0,0,0.22)] sm:rounded-3xl sm:my-10 sm:mx-auto sm:px-6 sm:py-6"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
          role="dialog"
          aria-modal="true"
          aria-label="Log an unplanned stop"
        >
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#EDE7DD] sm:hidden" />

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#A39688]">
                Quick log
              </p>
              <p className="mt-1 font-display text-lg font-semibold text-[#1C1108]">
                Log a stop
              </p>
              <p className="mt-0.5 text-xs text-[#6B5E52]">
                Add an unplanned coffee break or photo op without leaving On-Trip mode.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-[#EDE7DD] bg-white px-3 py-1 text-xs font-medium text-[#6B5E52] transition-colors hover:border-[#1C1108] hover:text-[#1C1108]"
            >
              Close
            </button>
          </div>

          <form
            className="mt-4 space-y-2"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!title.trim()) return;
              await onSubmit({
                day_date: defaultDate,
                title: title.trim(),
                time: time.trim() || null,
                location: location.trim() || null,
                notes: notes.trim() || null,
              });
              handleClose();
            }}
          >
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What happened? (required)"
              required
              autoFocus
              className="w-full rounded-xl border border-[#EDE7DD] bg-white px-3 py-2 text-sm text-[#1C1108] placeholder:text-[#A39688] focus:border-[#1C1108] focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                placeholder="Time (e.g. 16:30)"
                className="flex-1 rounded-xl border border-[#EDE7DD] bg-white px-3 py-2 text-sm text-[#1C1108] placeholder:text-[#A39688] focus:border-[#1C1108] focus:outline-none"
              />
              <input
                type="text"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Location"
                className="flex-1 rounded-xl border border-[#EDE7DD] bg-white px-3 py-2 text-sm text-[#1C1108] placeholder:text-[#A39688] focus:border-[#1C1108] focus:outline-none"
              />
            </div>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notes (optional)"
              rows={3}
              className="w-full resize-none rounded-xl border border-[#EDE7DD] bg-white px-3 py-2 text-sm text-[#1C1108] placeholder:text-[#A39688] focus:border-[#1C1108] focus:outline-none"
            />

            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="min-h-11 rounded-full border border-[#EDE7DD] bg-white px-4 py-2 text-sm font-semibold text-[#6B5E52] transition-colors hover:border-[#1C1108] hover:text-[#1C1108]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="min-h-11 rounded-full bg-[#1C1108] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2B1B0F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {disabled ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

