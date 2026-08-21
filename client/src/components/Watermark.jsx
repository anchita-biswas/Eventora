import React from "react";

// Diagonal, tiled EVENTORA watermark. Fixed to the viewport and sits far behind
// page content — give the page's content wrapper `relative z-10` so cards stay
// crisp above it.
const Watermark = ({
  className = "pointer-events-none fixed inset-0 z-0 select-none overflow-hidden",
}) => (
  <div aria-hidden="true" className={className}>
    <div
      className="absolute left-1/2 top-1/2 flex h-[200%] w-[200%] -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] flex-wrap content-center justify-center gap-x-12 gap-y-8"
      style={{ fontFamily: "var(--font-display)", opacity: 0.04 }}
    >
      {Array.from({ length: 80 }).map((_, i) => (
        <span
          key={i}
          className="text-6xl font-bold uppercase leading-none tracking-tight text-[var(--accent-violet-light)] md:text-8xl"
        >
          Eventora
        </span>
      ))}
    </div>
  </div>
);

export default Watermark;
