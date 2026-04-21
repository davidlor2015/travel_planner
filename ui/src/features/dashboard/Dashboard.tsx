import { useEffect, useMemo, useState } from "react";

import type { AppView } from "../../app/AppShell";
import { track } from "../../shared/analytics";
import { getTripImageUrl } from "../trips/workspace/tripVisuals";
import {
  getTripSummaries,
  type Trip,
  type TripSummary,
} from "../../shared/api/trips";

interface DashboardProps {
  token: string;
  trips: Trip[];
  onNavigate: (view: AppView, tripId?: number) => void;
  onCreateTrip: () => void;
}

type TripStatus = "upcoming" | "active" | "past";

function parseSavedItinerary(
  description: string | null,
): { days?: unknown[] } | null {
  if (!description) return null;
  try {
    return JSON.parse(description);
  } catch {
    const marker = "DETAILS (JSON): ";
    const idx = description.indexOf(marker);
    if (idx !== -1) {
      try {
        return JSON.parse(description.slice(idx + marker.length));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function getTripStatus(startIso: string, endIso: string): TripStatus {
  const now = Date.now();
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (now < start) return "upcoming";
  if (now > end) return "past";
  return "active";
}

function statusPresentation(status: TripStatus): {
  label: string;
  cls: string;
} {
  if (status === "active")
    return {
      label: "Active now",
      cls: "bg-[#EDF0F5] text-[#3D5C7A] border-[#4D6B8A]/20",
    };
  if (status === "upcoming")
    return { label: "Upcoming", cls: "bg-amber/10 text-amber border-amber/30" };
  return {
    label: "Completed",
    cls: "bg-[#FAF8F5] text-[#8A7E74] border-[#E5DDD1]",
  };
}

function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const end = new Date(endIso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${start} - ${end}`;
}

function getTripDurationDays(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

export function Dashboard({
  token,
  trips,
  onNavigate,
  onCreateTrip,
}: DashboardProps) {
  const [summaries, setSummaries] = useState<Record<number, TripSummary>>({});
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDashboardMeta = async () => {
      setLoadingMeta(true);
      setMetaError(null);
      try {
        const summaryRows = await getTripSummaries(token);
        if (cancelled) return;
        setSummaries(
          Object.fromEntries(
            summaryRows.map((summary) => [summary.trip_id, summary]),
          ),
        );
      } catch {
        if (!cancelled) {
          setSummaries({});
          setMetaError(
            "Trip summary snapshots are temporarily unavailable. Your trips are still available in the workspace.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingMeta(false);
        }
      }
    };

    void loadDashboardMeta();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const upcomingTrips = useMemo(
    () =>
      trips
        .filter(
          (trip) => getTripStatus(trip.start_date, trip.end_date) !== "past",
        )
        .sort(
          (a, b) =>
            new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
        ),
    [trips],
  );

  const pastTrips = useMemo(
    () =>
      trips
        .filter(
          (trip) => getTripStatus(trip.start_date, trip.end_date) === "past",
        )
        .sort(
          (a, b) =>
            new Date(b.end_date).getTime() - new Date(a.end_date).getTime(),
        ),
    [trips],
  );

  const savedItineraryCount = useMemo(
    () =>
      trips.filter((trip) => parseSavedItinerary(trip.description) !== null)
        .length,
    [trips],
  );

  const totalUpcomingDays = useMemo(
    () =>
      upcomingTrips.reduce(
        (sum, trip) =>
          sum + getTripDurationDays(trip.start_date, trip.end_date),
        0,
      ),
    [upcomingTrips],
  );

  const totalPastDays = useMemo(
    () =>
      pastTrips.reduce(
        (sum, trip) =>
          sum + getTripDurationDays(trip.start_date, trip.end_date),
        0,
      ),
    [pastTrips],
  );

  const attentionItems = useMemo(() => {
    if (loadingMeta) return [];

    const items: Array<{
      tripId: number;
      tripTitle: string;
      message: string;
      cta: string;
    }> = [];
    for (const trip of upcomingTrips) {
      const summary = summaries[trip.id];
      if (parseSavedItinerary(trip.description) === null) {
        items.push({
          tripId: trip.id,
          tripTitle: trip.title,
          message: "No shared itinerary applied yet",
          cta: "Generate plan",
        });
      }
      if (summary?.budget_is_over) {
        const over = Math.abs(summary.budget_remaining ?? 0).toFixed(0);
        items.push({
          tripId: trip.id,
          tripTitle: trip.title,
          message: `Budget is over by $${over}`,
          cta: "Review budget",
        });
      }
    }

    return items.slice(0, 4);
  }, [loadingMeta, summaries, upcomingTrips]);

  if (trips.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-smoke bg-white px-8 py-16 text-center">
        <h1 className="text-2xl font-semibold text-espresso">My Trips</h1>
        <p className="mt-2 text-sm leading-relaxed text-flint">
          This is your trip home. Create your first journey to start the core
          loop: plan, apply, and track.
        </p>
        <button
          type="button"
          onClick={() => {
            track({
              name: "home_new_trip_clicked",
              props: { source: "empty_home" },
            });
            onCreateTrip();
          }}
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-amber px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-amber/25 transition-colors hover:bg-amber-dark cursor-pointer"
        >
          New Trip
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-smoke bg-white px-5 py-5 shadow-sm sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Home
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-espresso">
              My Trips
            </h1>
            <p className="mt-1 text-sm text-flint">
              Your forward-looking entry point with upcoming journeys, past-trip
              context, and next actions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              track({
                name: "home_new_trip_clicked",
                props: { source: "home_header" },
              });
              onCreateTrip();
            }}
            className="inline-flex min-h-11 items-center rounded-full bg-amber px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-amber/25 transition-colors hover:bg-amber-dark cursor-pointer"
          >
            New Trip
          </button>
        </div>
      </header>

      {metaError ? (
        <div
          className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4"
          role="alert"
        >
          <p className="text-sm font-semibold text-danger">
            Home snapshot unavailable
          </p>
          <p className="mt-1 text-sm text-flint">{metaError}</p>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-smoke bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Upcoming trips
          </p>
          <p className="mt-1 text-2xl font-semibold text-espresso">
            {upcomingTrips.length}
          </p>
          <p className="mt-1 text-sm text-flint">
            {totalUpcomingDays} planned day{totalUpcomingDays === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-2xl border border-smoke bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Past trips
          </p>
          <p className="mt-1 text-2xl font-semibold text-espresso">
            {pastTrips.length}
          </p>
          <p className="mt-1 text-sm text-flint">
            {totalPastDays} archived day{totalPastDays === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-2xl border border-smoke bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Saved itineraries
          </p>
          <p className="mt-1 text-2xl font-semibold text-espresso">
            {savedItineraryCount}
          </p>
          <p className="mt-1 text-sm text-flint">
            Shared plans ready for map and bookings
          </p>
        </div>
        <div className="rounded-2xl border border-smoke bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Status legend
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/30 bg-amber/10 px-2.5 py-1 text-amber">
              <span
                className="h-1.5 w-1.5 rounded-full bg-amber"
                aria-hidden="true"
              />{" "}
              Upcoming
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4D6B8A]/20 bg-[#EDF0F5] px-2.5 py-1 text-[#3D5C7A]">
              <span
                className="h-1.5 w-1.5 rounded-full bg-[#4D6B8A]"
                aria-hidden="true"
              />{" "}
              Active
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-smoke bg-white px-5 py-5 shadow-sm sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-espresso">
                Upcoming trips
              </h2>
              <p className="mt-1 text-sm text-flint">
                The trips you are actively planning or about to start.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("trips")}
              className="text-sm font-semibold text-amber transition-colors hover:text-amber-dark cursor-pointer"
            >
              Open trip switcher
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {upcomingTrips.length === 0 ? (
              <div className="rounded-xl border border-dashed border-smoke bg-parchment/40 px-4 py-5 text-sm text-flint">
                No upcoming trips yet. Start a new one to begin planning.
              </div>
            ) : (
              upcomingTrips.map((trip) => {
                const status = getTripStatus(trip.start_date, trip.end_date);
                const statusMeta = statusPresentation(status);
                const summary = summaries[trip.id];

                return (
                  <article
                    key={trip.id}
                    className="rounded-xl border border-smoke bg-parchment/30 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={getTripImageUrl(trip)}
                        alt=""
                        className="h-14 w-14 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-espresso">
                            {trip.title}
                          </p>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.cls}`}
                          >
                            {statusMeta.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-clay">
                          {trip.destination}
                        </p>
                        <p className="mt-1 text-xs text-flint">
                          {formatDateRange(trip.start_date, trip.end_date)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted">
                          <span className="rounded-full border border-smoke bg-white px-2 py-0.5">
                            {trip.member_count} traveler
                            {trip.member_count === 1 ? "" : "s"}
                          </span>
                          <span className="rounded-full border border-smoke bg-white px-2 py-0.5">
                            {summary
                              ? `${summary.reservation_upcoming_count} upcoming booking${summary.reservation_upcoming_count === 1 ? "" : "s"}`
                              : "Bookings pending"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onNavigate("trips", trip.id)}
                        className="inline-flex min-h-10 items-center rounded-full bg-espresso px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-espresso-dark cursor-pointer"
                      >
                        Open workspace
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-smoke bg-white px-5 py-5 shadow-sm sm:px-6">
            <h2 className="text-lg font-semibold text-espresso">
              Past trips summary
            </h2>
            <p className="mt-1 text-sm text-flint">
              Your completed journeys stay ready for memories and reuse.
            </p>
            <div className="mt-4 rounded-xl border border-smoke bg-parchment/40 px-4 py-4">
              <p className="text-2xl font-semibold text-espresso">
                {pastTrips.length}
              </p>
              <p className="text-sm text-flint">
                completed trip{pastTrips.length === 1 ? "" : "s"}
              </p>
              {pastTrips[0] ? (
                <p className="mt-2 text-xs text-muted">
                  Latest: {pastTrips[0].title}
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted">
                  Your archive will grow as trips are completed.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onNavigate("archive")}
              className="mt-4 inline-flex min-h-10 items-center rounded-full border border-smoke bg-white px-4 py-2 text-sm font-semibold text-espresso transition-colors hover:bg-parchment cursor-pointer"
            >
              Open Archive
            </button>
          </div>

          {!loadingMeta && attentionItems.length > 0 ? (
            <div className="rounded-2xl border border-smoke bg-white px-5 py-5 shadow-sm sm:px-6">
              <h2 className="text-lg font-semibold text-espresso">
                Needs attention
              </h2>
              <div className="mt-3 space-y-2">
                {attentionItems.map((item) => (
                  <div
                    key={`${item.tripId}-${item.message}`}
                    className="rounded-xl border border-smoke bg-parchment/35 px-3 py-3"
                  >
                    <p className="text-sm font-semibold text-espresso">
                      {item.tripTitle}
                    </p>
                    <p className="mt-0.5 text-xs text-flint">{item.message}</p>
                    <button
                      type="button"
                      onClick={() => onNavigate("trips", item.tripId)}
                      className="mt-2 inline-flex min-h-9 items-center rounded-full border border-smoke bg-white px-3 py-1.5 text-xs font-semibold text-espresso transition-colors hover:bg-parchment cursor-pointer"
                    >
                      {item.cta}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
