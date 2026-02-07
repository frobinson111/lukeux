import React from "react";

export const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="m3 3 18 18" />
    <path d="M10.6 10.6a3 3 0 0 0 3.8 3.8" />
    <path d="M9.9 3.6A10.1 10.1 0 0 1 12 3c7 0 11 7 11 7a16.9 16.9 0 0 1-2.1 2.9" />
    <path d="M6.6 6.6A16.9 16.9 0 0 0 1 10s4 7 11 7a10.4 10.4 0 0 0 5.4-1.6" />
  </svg>
);
