import type { SVGProps } from "react";

function base(props: SVGProps<SVGSVGElement>, size = 16) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    ...props,
  };
}

export const Spark = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p, 15)}>
    <path d="M12 3l1.9 5.3L19 10l-5.1 1.7L12 17l-1.9-5.3L5 10l5.1-1.7z" />
  </svg>
);

export const Gear = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p, 15)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
  </svg>
);

export const DocIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 4h16v16H4z" />
    <path d="M8 9h8M8 13h8M8 17h5" />
  </svg>
);

export const GridIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" />
  </svg>
);

export const KitIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M3 12h18M12 3v18" />
    <path d="M3 3h18v18H3z" />
  </svg>
);

export const LibraryIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M3 5h18v14H3z" />
    <path d="M3 15l5-4 4 3 3-2 6 4" />
  </svg>
);

export const RunsIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);

export const Refresh = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p, 15)}>
    <path d="M21 12a9 9 0 1 1-2.6-6.4" />
    <path d="M21 3v6h-6" />
  </svg>
);

export const Search = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p, 15)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </svg>
);

export const Arrow = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p, 15)}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

export const Copy = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p, 15)}>
    <path d="M9 9h12v12H9z" />
    <path d="M5 15H3V3h12v2" />
  </svg>
);

export const Download = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p, 15)}>
    <path d="M12 3v12M7 11l5 5 5-5" />
    <path d="M4 21h16" />
  </svg>
);
