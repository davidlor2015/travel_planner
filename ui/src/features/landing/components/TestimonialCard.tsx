import type { LandingTestimonial } from "../landing.types";

export function TestimonialCard({ quote }: { quote: LandingTestimonial }) {
  return (
    <figure className="rounded-2xl border border-smoke bg-white p-6 shadow-[0_10px_30px_rgba(28,17,8,0.045)]">
      <blockquote className="text-base leading-relaxed text-espresso">
        "{quote.quote}"
      </blockquote>
      <figcaption className="mt-5">
        <p className="text-sm font-semibold text-espresso">{quote.name}</p>
        <p className="mt-0.5 text-sm text-muted">{quote.context}</p>
      </figcaption>
    </figure>
  );
}
