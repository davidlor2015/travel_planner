import type { TripMember } from "../../../shared/api/trips";

function getMemberInitials(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local
    .split(/[._-]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  return (
    (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")
  ).toUpperCase();
}

/**
 * Data-driven avatar seed tones. These are intentionally left as literals —
 * they are not chrome but a deterministic mapping from member index to a
 * distinguishable tone, sourced from the warm palette family.
 */
function getAvatarTone(index: number): string {
  const tones = [
    "#B86845",
    "#6A7A43",
    "#4D6B8A",
    "#7A5A8B",
    "#C89A3C",
    "#A39688",
  ];
  return tones[index % tones.length] ?? tones[0];
}

export function WorkspaceSectionCard({
  eyebrow,
  title,
  description,
  children,
  action,
  className = "",
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-2xl border border-border bg-bg-app px-4 py-4 shadow-[0_1px_0_rgba(28,17,8,0.03)] sm:px-5",
        className,
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-soft">
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h3 className="mt-1 text-lg font-semibold text-text">
              {title}
            </h3>
          ) : null}
          {description ? (
            <p className="mt-2 max-w-2xl text-[13.5px] leading-[1.65] text-text-muted">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children ? (
        <div
          className={eyebrow || title || description || action ? "mt-4" : ""}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function TripHeroMetadataRow({
  items,
  className = "",
}: {
  items: Array<{ label: string; value: string; icon?: React.ReactNode }>;
  className?: string;
}) {
  return (
    <dl
      className={[
        "flex flex-wrap items-center gap-2 text-white/88",
        className,
      ].join(" ")}
    >
      {items.map((item) => (
        <div
          key={`${item.label}-${item.value}`}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/18 bg-black/18 px-3 py-1.5 text-[12px] font-medium backdrop-blur-md"
        >
          <dt className="sr-only">{item.label}</dt>
          {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function MemberAvatarStack({
  members,
  max = 4,
  size = "md",
  showLabel = true,
}: {
  members: TripMember[];
  max?: number;
  size?: "sm" | "md";
  showLabel?: boolean;
}) {
  const visibleMembers = members.slice(0, max);
  const extraMembers = Math.max(0, members.length - visibleMembers.length);
  const avatarClass =
    size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-[11px]";

  return (
    <div className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/18 bg-black/18 px-2.5 py-1.5 text-white backdrop-blur-md">
      <div
        className="flex items-center"
        aria-label={`${members.length} traveler${members.length === 1 ? "" : "s"}`}
      >
        {visibleMembers.map((member, index) => (
          <span
            key={`${member.user_id}-${member.email}`}
            className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${avatarClass}`}
            style={{
              marginLeft: index === 0 ? 0 : "-9px",
              backgroundColor: getAvatarTone(index),
              border: "2px solid rgba(254,252,249,0.82)",
            }}
            title={member.email}
          >
            {getMemberInitials(member.email)}
          </span>
        ))}
        {extraMembers > 0 ? (
          <span
            className={`inline-flex shrink-0 items-center justify-center rounded-full bg-espresso px-1.5 font-semibold text-white ${avatarClass}`}
            style={{
              marginLeft: "-9px",
              border: "2px solid rgba(254,252,249,0.82)",
            }}
            title={`${extraMembers} more traveler${extraMembers === 1 ? "" : "s"}`}
          >
            +{extraMembers}
          </span>
        ) : null}
      </div>
      {showLabel ? (
        <span className="pr-1 text-[12px] font-medium text-white/88">
          {members.length} traveler{members.length === 1 ? "" : "s"}
        </span>
      ) : null}
    </div>
  );
}
