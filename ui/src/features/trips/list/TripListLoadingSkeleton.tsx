// Path: ui/src/features/trips/list/TripListLoadingSkeleton.tsx
// Summary: Implements TripListLoadingSkeleton module logic.

export function TripListLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
      <div className="overflow-hidden rounded-[28px] border border-[#EAE2D6] bg-[#FEFCF9] animate-pulse">
        <div className="h-[200px] bg-[#E5DDD1]" />
        <div className="h-12 border-b border-[#EAE2D6] bg-white" />
        <div className="space-y-4 p-5">
          <div className="h-24 rounded-2xl bg-[#F3EEE7]" />
          <div className="h-40 rounded-2xl bg-[#F3EEE7]" />
        </div>
      </div>
    </div>
  );
}
