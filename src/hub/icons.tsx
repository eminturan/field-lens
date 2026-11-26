import * as React from "react";

// Satır içi SVG: kurum içi sunucuda dış yazı tipi ya da CDN gerekmez; renk metinden gelir.
const PATHS = {
  lens: ["M10 4a6 6 0 1 0 0 12a6 6 0 1 0 0-12z", "M14.5 14.5L20 20"],
  link: ["M9 15l6-6", "M11 6l.5-.5a4 4 0 0 1 5.7 5.7l-.5.5", "M13 18l-.5.5a4 4 0 0 1-5.7-5.7l.5-.5"],
  save: ["M6 4h10l4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z", "M8 4v4h7V4", "M12 12a2 2 0 1 0 0 4a2 2 0 1 0 0-4z"],
  play: ["M7 4v16l13-8z"],
  refresh: ["M20 11a8 8 0 1 0-2.3 5.7", "M20 4v7h-7"],
  target: ["M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16z", "M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8z"],
  calendar: ["M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z", "M16 3v4", "M8 3v4", "M4 11h16"],
  filter: ["M4 5h16l-6 8v6l-4-2v-4z"],
  columns: ["M5 5h14v14H5z", "M12 5v14"],
  copy: ["M10 8h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z", "M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"],
  info: ["M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z", "M12 11v5", "M12 8h.01"],
  grip: ["M9 6h.01", "M9 12h.01", "M9 18h.01", "M15 6h.01", "M15 12h.01", "M15 18h.01"],
  edit: ["M4 20h4l10.5-10.5a2.8 2.8 0 0 0-4-4L4 16v4", "M13.5 6.5l4 4"],
  download: ["M12 4v12", "M7 11l5 5 5-5", "M5 20h14"],
  open: ["M7 17L17 7", "M8 7h9v9"],
  layout: ["M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z", "M4 10h16", "M10 10v10"],
  rowsLoose: ["M4 6h16", "M4 12h16", "M4 18h16"],
  rowsTight: ["M4 5h16", "M4 9.5h16", "M4 14h16", "M4 18.5h16"],
  group: ["M4 5h16", "M8 10h12", "M8 14h12", "M4 19h16"],
  bookmark: ["M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z"],
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg className="fl-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
