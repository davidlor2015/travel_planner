import { SectionHeading } from "../../../shared/ui";

interface ArchiveHeaderProps {
  heroImage?: string;
  metadata: string;
}

export function ArchiveHeader({ heroImage, metadata }: ArchiveHeaderProps) {
  return (
    <header
      className={[
        "relative overflow-hidden rounded-[28px] border border-smoke text-center shadow-[0_18px_48px_rgba(28,17,8,0.08)]",
        heroImage
          ? "bg-espresso px-5 py-14 text-white sm:px-10 sm:py-20"
          : "bg-white px-5 py-10 text-espresso sm:px-10 sm:py-14",
      ].join(" ")}
    >
      {heroImage ? (
        <>
          <img
            src={heroImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/60" />
        </>
      ) : null}

      <div className="relative mx-auto max-w-3xl">
        <SectionHeading
          eyebrow="Archive"
          title="Your Travel Story"
          align="center"
          description={
            <p>
              A look back at the journeys that shaped your way of moving through
              the world.
            </p>
          }
          meta={metadata}
        />
      </div>
    </header>
  );
}
