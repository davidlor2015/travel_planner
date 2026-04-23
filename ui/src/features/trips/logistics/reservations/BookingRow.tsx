import { motion } from "framer-motion";

interface BookingRowProps {
  title: string;
  typeLabel: string;
  typePillClassName: string;
  statusLabel: string;
  statusPillClassName: string;
  dateLabel?: string | null;
  detailLabel?: string | null;
  referenceLabel?: string | null;
  priceLabel?: string | null;
  hasBudgetLink?: boolean;
  /**
   * When provided, the row shows an inline "Add to itinerary" button that
   * pins this booking as a stop on the matching day. Omitted when the trip
   * has no writable draft — reservations should quietly wait, not nag.
   */
  onAddToItinerary?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function BookingRow({
  title,
  typeLabel,
  typePillClassName,
  statusLabel,
  statusPillClassName,
  dateLabel,
  detailLabel,
  referenceLabel,
  priceLabel,
  hasBudgetLink = false,
  onAddToItinerary,
  onEdit,
  onDelete,
}: BookingRowProps) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex items-start gap-4 rounded-2xl border border-[#EAE2D6] bg-white px-5 py-4"
    >
      {/* Type icon box */}
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${typePillClassName}`}
        aria-hidden="true"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z" />
        </svg>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${typePillClassName}`}
            >
              {typeLabel}
            </span>
            <span
              className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusPillClassName}`}
            >
              {statusLabel}
            </span>
            {hasBudgetLink ? (
              <span className="inline-flex min-h-7 items-center rounded-full border border-olive/25 bg-olive/10 px-2.5 py-1 text-[11px] font-semibold text-olive">
                Budget linked
              </span>
            ) : null}
          </div>

          <h5 className="mt-2 break-words text-[13.5px] font-semibold leading-snug text-[#1C1108]">
            {title}
          </h5>

          <div className="mt-1.5 flex flex-col gap-1 text-[12px] leading-relaxed text-[#8A7E74]">
            {detailLabel ? <p>{detailLabel}</p> : null}
            {dateLabel ? <p>{dateLabel}</p> : null}
            {referenceLabel ? (
              <p className="font-mono text-[11px] text-[#3D5C7A]">
                Ref: {referenceLabel}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-[140px] items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start sm:gap-2">
          <p className="font-display text-[15px] font-semibold text-[#1C1108]">
            {priceLabel ?? (
              <span className="font-sans text-[13px] font-normal text-[#8A7E74]">Price pending</span>
            )}
          </p>

          <div className="flex items-center gap-2">
            {onAddToItinerary ? (
              <button
                type="button"
                onClick={onAddToItinerary}
                className="min-h-9 rounded-full border border-[#1C1108]/25 bg-white px-3 py-1.5 text-[12px] font-semibold text-[#1C1108] transition-colors hover:bg-[#1C1108] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1108]/35"
                title="Pin this booking to the matching day in your itinerary"
              >
                Add to itinerary
              </button>
            ) : null}
            <button
              type="button"
              onClick={onEdit}
              className="min-h-9 rounded-full border border-[#E5DDD1] bg-[#FAF8F5] px-3 py-1.5 text-[12px] font-semibold text-[#1C1108] transition-colors hover:bg-[#F5EDE7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B86845]/35"
            >
              Edit
            </button>
            <motion.button
              type="button"
              onClick={onDelete}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-[#E5DDD1] bg-white text-[#8A7E74] transition-colors hover:border-danger/20 hover:bg-danger/10 hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/25"
              aria-label="Delete booking"
            >
              <svg
                viewBox="0 0 16 16"
                className="h-4 w-4"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
