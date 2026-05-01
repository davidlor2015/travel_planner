// Path: ui/src/features/landing/sections/LandingCoreValuesSection.tsx
// Summary: Implements LandingCoreValuesSection module logic.

import { motion, useReducedMotion } from "framer-motion";

// ─── Shared mini-components ──────────────────────────────────────────────────

function MockShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-[20px] border border-smoke bg-white shadow-[0_16px_48px_rgba(28,17,8,0.09)]"
      aria-hidden="true"
    >
      <div className="border-b border-smoke bg-parchment/60 px-4 py-3">
        <p className="text-xs font-semibold text-espresso">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "bad";
}) {
  const dotClass =
    tone === "ok"
      ? "bg-olive"
      : tone === "warn"
        ? "bg-amber"
        : "bg-danger";

  return (
    <div className="flex items-center gap-3 py-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
      <span className="flex-1 text-xs font-medium text-espresso">{label}</span>
      <span className="text-xs text-flint">{value}</span>
    </div>
  );
}

// ─── Mock 01: Trip readiness ──────────────────────────────────────────────────

function ReadinessMock() {
  return (
    <MockShell title="Trip readiness">
      <div className="divide-y divide-smoke">
        <StatusRow label="Flights" value="All 4 booked" tone="ok" />
        <StatusRow label="Hotels" value="2 of 3 confirmed" tone="warn" />
        <StatusRow label="Insurance" value="1 traveler missing" tone="bad" />
        <StatusRow label="Arrival timing" value="Day 1 transport still open" tone="bad" />
      </div>
      <div className="mt-3 rounded-xl border border-amber/25 bg-amber/8 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber">
          What to do next
        </p>
        <p className="mt-1.5 text-sm font-semibold text-espresso">
          Confirm hotel deposit before Jun 7
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-flint">
          This is blocking 2 travelers from finalizing their flights.
        </p>
      </div>
    </MockShell>
  );
}

// ─── Mock 02: Itinerary editor ────────────────────────────────────────────────

function OwnerBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-smoke bg-parchment px-2 py-0.5 text-[10px] font-semibold text-flint">
      {name}
    </span>
  );
}

function ItineraryStop({
  title,
  time,
  owner,
}: {
  title: string;
  time: string;
  owner: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-smoke bg-parchment/50 px-3 py-2.5">
      <div>
        <p className="text-sm font-semibold text-espresso">{title}</p>
        <p className="mt-0.5 text-xs text-flint">{time}</p>
      </div>
      <OwnerBadge name={owner} />
    </div>
  );
}

function EditorMock() {
  return (
    <MockShell title="Itinerary editor">
      <div className="mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber">
          Day 1 · Jun 14
        </p>
      </div>
      <div className="space-y-2">
        <ItineraryStop title="Narita arrival" time="2:10 PM" owner="You" />
        <ItineraryStop title="Shinjuku hotel check-in" time="4:00 PM" owner="Kenji" />
        <ItineraryStop title="Dinner reservation" time="7:30 PM" owner="Maya" />
      </div>
      <p className="mt-3 rounded-xl bg-parchment px-3 py-2.5 text-xs leading-relaxed text-flint">
        Assigning ownership keeps the trip from drifting into nobody's job.
      </p>
    </MockShell>
  );
}

// ─── Mock 03: Shared trip pulse ───────────────────────────────────────────────

function MemberRow({
  name,
  status,
  tone,
}: {
  name: string;
  status: string;
  tone: "ok" | "warn" | "bad" | "neutral";
}) {
  const statusClass =
    tone === "ok"
      ? "text-olive"
      : tone === "warn"
        ? "text-amber"
        : tone === "bad"
          ? "text-danger"
          : "text-flint";

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-espresso text-[9px] font-semibold text-white">
          {name.slice(0, 2).toUpperCase()}
        </span>
        <span className="text-xs font-medium text-espresso">{name}</span>
      </div>
      <span className={`text-xs font-semibold ${statusClass}`}>{status}</span>
    </div>
  );
}

function CoordinationMock() {
  return (
    <MockShell title="Shared trip pulse">
      <div className="divide-y divide-smoke">
        <MemberRow name="Maya" status="Ready" tone="ok" />
        <MemberRow name="Kenji" status="Needs 1 confirmation" tone="warn" />
        <MemberRow name="You" status="On track" tone="neutral" />
        <MemberRow name="Sam" status="Missing insurance" tone="bad" />
      </div>
      <div className="mt-3 space-y-1.5 rounded-xl border border-smoke bg-parchment/60 px-3 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          3 changes since your last visit
        </p>
        {[
          "Maya booked her return flight",
          "Day 3 itinerary was updated",
          "Kenji confirmed the first hotel",
        ].map((item) => (
          <div key={item} className="flex items-center gap-2 pt-1">
            <span className="h-1 w-1 shrink-0 rounded-full bg-flint/40" />
            <p className="text-xs text-flint">{item}</p>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

// ─── Section copy ─────────────────────────────────────────────────────────────

interface CoreSection {
  eyebrow: string;
  heading: string;
  body: string;
  mockPosition: "right" | "left";
  mock: React.ReactNode;
}

const CORE_SECTIONS: CoreSection[] = [
  {
    eyebrow: "01 — Readiness + next action",
    heading: "See what matters before it turns stressful.",
    body: "Roen keeps the trip moving with named blockers, confirmation states, and a clear next-action surface. You open the app and know what to do.",
    mockPosition: "right",
    mock: <ReadinessMock />,
  },
  {
    eyebrow: "02 — Calm editing + ownership",
    heading: "Keep the itinerary editable without losing the thread.",
    body: "The itinerary stays central. Add stops, move plans, and assign who handles what — so nothing drifts into a group-chat limbo that nobody resolves.",
    mockPosition: "left",
    mock: <EditorMock />,
  },
  {
    eyebrow: "03 — Coordination + change awareness",
    heading: "Know what changed without opening a group chat.",
    body: "For shared trips, Roen surfaces who is on track, who still needs to act, and what changed since you last looked — with no extra notifications.",
    mockPosition: "right",
    mock: <CoordinationMock />,
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

export function LandingCoreValuesSection() {
  const reduceMotion = useReducedMotion();

  return (
    <div id="product">
      {/* Bridge */}
      <section className="bg-parchment px-4 py-16 sm:px-6 sm:py-20">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="mx-auto max-w-4xl text-center"
        >
          <p className="font-display text-2xl font-semibold leading-snug text-espresso sm:text-3xl lg:text-[36px]">
            Most travel apps help you make a plan.
            <br className="hidden sm:block" />{" "}
            Roen helps you keep one.
          </p>
        </motion.div>
      </section>

      {/* Three feature sections */}
      {CORE_SECTIONS.map((section, i) => {
        const isReversed = section.mockPosition === "left";

        return (
          <section
            key={section.eyebrow}
            className={`px-4 py-16 sm:px-6 sm:py-20 ${i % 2 === 0 ? "bg-ivory" : "bg-parchment"}`}
          >
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              className={`mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 ${
                isReversed ? "lg:[&>*:first-child]:order-last" : ""
              }`}
            >
              {/* Text */}
              <div className="max-w-lg">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber">
                  {section.eyebrow}
                </p>
                <h2 className="mt-3 font-display text-3xl font-semibold leading-snug text-espresso sm:text-[36px]">
                  {section.heading}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-flint">
                  {section.body}
                </p>
              </div>

              {/* Mock */}
              <div>{section.mock}</div>
            </motion.div>
          </section>
        );
      })}
    </div>
  );
}
