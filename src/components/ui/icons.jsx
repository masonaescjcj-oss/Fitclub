// The five tab icons from the redesign, drawn on the same 24-unit grid and
// stroke as lucide so they sit beside lucide icons without a seam.

import React from "react";

function Glyph({ size = 22, strokeWidth = 2, className = "", children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {children}
    </svg>
  );
}

export const TodayIcon = (p) => (
  <Glyph {...p}><path d="M4 10.2 12 4l8 6.2V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" /></Glyph>
);

export const TrainIcon = (p) => (
  <Glyph {...p}><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" /></Glyph>
);

export const FuelIcon = (p) => (
  <Glyph {...p}>
    <path d="M12 7.5c.3-2.4 1.9-4 4.3-4.3-.3 2.4-1.9 4-4.3 4.3z" />
    <path d="M12 8.2c-1.4-1-3-1.4-4.5-1-2.6.7-4 3.3-3.6 6.4.5 3.7 3 7.2 5.4 7.2.9 0 1.7-.5 2.7-.5s1.8.5 2.7.5c2.4 0 4.9-3.5 5.4-7.2.4-3.1-1-5.7-3.6-6.4-1.5-.4-3.1 0-4.5 1z" />
  </Glyph>
);

export const CoachIcon = (p) => (
  <Glyph {...p}>
    <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1-5.1-1.9 5.1-1.9z" />
    <path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
  </Glyph>
);

export const ClubIcon = (p) => (
  <Glyph {...p}><path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4.5 19.5l1.3-4.2A7.5 7.5 0 1 1 20 11.5z" /></Glyph>
);

export const FlameIcon = (p) => (
  <Glyph {...p}><path d="M12 21c3.9 0 6.5-2.7 6.5-6.3 0-3.6-2.6-5.4-3.6-8.7-1.9 1.4-2.8 3.3-2.9 5.3-1-.9-1.7-2.2-1.8-3.8C7.6 9.8 5.5 12 5.5 14.7 5.5 18.3 8.1 21 12 21z" /></Glyph>
);

export const SparkIcon = (p) => (
  <Glyph {...p}><path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1-5.1-1.9 5.1-1.9z" /></Glyph>
);
