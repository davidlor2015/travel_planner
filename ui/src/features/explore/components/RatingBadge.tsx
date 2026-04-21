export function RatingBadge({ rating }: { rating?: number }) {
  if (!rating) return null;

  return (
    <span
      className="inline-flex min-h-7 items-center gap-1 rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-semibold text-espresso shadow-sm backdrop-blur-md"
      aria-label={`Rated ${rating.toFixed(1)} out of 5`}
    >
      <svg
        viewBox="0 0 20 20"
        className="h-3 w-3 text-[#B86845]"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="m10 2 2.2 5.1 5.5.5-4.2 3.6 1.3 5.4L10 13.8l-4.8 2.8 1.3-5.4-4.2-3.6 5.5-.5L10 2Z" />
      </svg>
      <span>{rating.toFixed(1)}</span>
    </span>
  );
}
