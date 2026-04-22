export function LogStopFAB({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className="pointer-events-none fixed bottom-6 right-6 z-10 flex justify-end lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        aria-label="Log an unplanned stop"
        className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-surface-exec px-5 py-2.5 text-sm font-medium text-on-dark shadow-[0_8px_24px_rgba(42,29,19,0.35)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden className="text-base leading-none">
          +
        </span>
        Log a stop
      </button>
    </div>
  );
}
