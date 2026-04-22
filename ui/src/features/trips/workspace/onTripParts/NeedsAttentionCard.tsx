import type { TripOnTripBlocker } from "../../../../shared/api/trips";

function AlertIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export function NeedsAttentionCard({
  blockers,
  variant = "full",
  onDismiss,
}: {
  blockers: TripOnTripBlocker[];
  variant?: "full" | "rail";
  /** Called when user taps "Later" — passes the blocker id */
  onDismiss?: (id: string) => void;
}) {
  if (blockers.length === 0) return null;

  if (variant === "rail") {
    return (
      <ul className="list-none space-y-2 p-0" style={{ margin: 0 }}>
        {blockers.map((blocker) => (
          <li
            key={blocker.id}
            className="rounded-xl border border-[#d7c9b0] bg-[rgba(236,228,215,0.5)] px-4 py-3.5"
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-1 w-1 flex-shrink-0 rounded-full bg-[#b4532a]"
              />
              <span className="text-[10.5px] uppercase tracking-[0.18em] text-[#b4532a]">
                Needs attention
              </span>
              {blocker.severity === "watch" ? (
                <>
                  <span
                    aria-hidden
                    className="h-1 w-1 rounded-full bg-[#c9bca8]"
                  />
                  <span className="text-[10.5px] uppercase tracking-[0.18em] text-[#8a7866]">
                    Watch
                  </span>
                </>
              ) : null}
            </div>
            <p className="mt-1 text-[13.5px] font-medium leading-snug text-[#3a2a1f]">
              {blocker.title}
            </p>
            {blocker.detail ? (
              <p className="mt-0.5 text-[12px] leading-snug text-[#6b5743]">
                {blocker.detail}
              </p>
            ) : null}
            {onDismiss ? (
              <div className="mt-2 flex items-center">
                <button
                  type="button"
                  onClick={() => onDismiss(blocker.id)}
                  className="rounded-full px-2 py-1 text-[12px] font-medium text-[#6b5743] transition-colors hover:text-[#2a1d13]"
                >
                  Later
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="px-6 sm:px-8">
      <ul className="list-none space-y-3 p-0" style={{ margin: 0 }}>
        {blockers.map((blocker) => (
          <li
            key={blocker.id}
            className="rounded-2xl border border-[#d7c9b0] bg-[rgba(236,228,215,0.5)] px-5 py-5"
          >
            <div className="flex items-start gap-3">
              {/* Icon circle */}
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#fbf7ef] text-[#b4532a]">
                <AlertIcon />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                {/* Label row */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[#b4532a]">
                    Needs attention
                  </span>
                  {blocker.severity === "watch" ? (
                    <>
                      <span
                        aria-hidden
                        className="h-1 w-1 rounded-full bg-[#c9bca8]"
                      />
                      <span className="text-[11px] uppercase tracking-[0.18em] text-[#8a7866]">
                        Watch
                      </span>
                    </>
                  ) : null}
                </div>

                {/* Blocker title */}
                <p className="mt-1.5 text-[14.5px] font-medium leading-snug text-[#3a2a1f]">
                  {blocker.title}
                </p>

                {/* Detail */}
                {blocker.detail ? (
                  <p className="mt-1 text-[13px] leading-snug text-[#6b5743]">
                    {blocker.detail}
                  </p>
                ) : null}

                {/* Action row */}
                <div className="mt-4 flex items-center gap-3">
                  {/* "Later" dismiss ghost button */}
                  {onDismiss ? (
                    <button
                      type="button"
                      onClick={() => onDismiss(blocker.id)}
                      className="rounded-full px-4 py-2 text-[13px] font-medium text-[#6b5743] transition-colors hover:text-[#2a1d13]"
                    >
                      Later
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
